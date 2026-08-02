import { createHash, randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { parseBankEmail, shouldAutoImport } from "@/lib/bank-email-parser";

const ALLOWED_SENDERS = (process.env.BANK_EMAIL_ALLOWED_SENDERS ?? "")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function gmailAccessToken() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) throw new Error("Gmail sync is not configured");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) throw new Error("Unable to refresh Gmail access token");
  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token) throw new Error("Gmail access token missing");
  return payload.access_token;
}

function decodeBase64Url(value?: string) {
  if (!value) return "";
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function extractBody(payload: GmailPayload): string {
  if (payload.body?.data) return decodeBase64Url(payload.body.data);
  for (const part of payload.parts ?? []) {
    if (part.mimeType === "text/plain" && part.body?.data) return decodeBase64Url(part.body.data);
  }
  for (const part of payload.parts ?? []) {
    const nested = extractBody(part);
    if (nested) return nested;
  }
  return "";
}

type GmailHeader = { name: string; value: string };
type GmailPayload = {
  mimeType?: string;
  headers?: GmailHeader[];
  body?: { data?: string };
  parts?: GmailPayload[];
};

type GmailMessage = {
  id: string;
  threadId?: string;
  internalDate?: string;
  payload?: GmailPayload;
};

function header(headers: GmailHeader[] | undefined, name: string) {
  return headers?.find((item) => item.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = process.env.BANK_EMAIL_WORKSPACE_ID;
  const connectionId = process.env.BANK_EMAIL_CONNECTION_ID ?? "gmail-primary";
  const gmailAddress = process.env.BANK_EMAIL_ADDRESS;
  if (!workspaceId || !gmailAddress) {
    return NextResponse.json({ error: "Bank email workspace is not configured" }, { status: 503 });
  }

  const db = getDb();
  const runId = randomUUID();
  await db.execute(sql`
    INSERT INTO bank_email_connections (id, workspace_id, provider, email)
    VALUES (${connectionId}, ${workspaceId}, 'gmail', ${gmailAddress})
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, status = 'active'
  `);
  await db.execute(sql`
    INSERT INTO bank_email_sync_runs (id, workspace_id, connection_id)
    VALUES (${runId}, ${workspaceId}, ${connectionId})
  `);

  try {
    const token = await gmailAccessToken();
    const query = encodeURIComponent("newer_than:7d");
    const listResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=100`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!listResponse.ok) throw new Error("Unable to list Gmail messages");

    const list = (await listResponse.json()) as { messages?: Array<{ id: string }> };
    let imported = 0;
    let pendingReview = 0;
    let scanned = 0;

    for (const item of list.messages ?? []) {
      const messageResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=full`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!messageResponse.ok) continue;
      const message = (await messageResponse.json()) as GmailMessage;
      const headers = message.payload?.headers;
      const sender = header(headers, "From").toLowerCase();
      if (ALLOWED_SENDERS.length > 0 && !ALLOWED_SENDERS.some((allowed) => sender.includes(allowed))) continue;

      scanned += 1;
      const subject = header(headers, "Subject");
      const body = extractBody(message.payload ?? {});
      const parsed = parseBankEmail(subject, body);
      const bodyHash = createHash("sha256").update(`${sender}\n${subject}\n${body}`).digest("hex");
      const status = shouldAutoImport(parsed) ? "ready_to_import" : "pending_review";
      if (status === "ready_to_import") imported += 1;
      else pendingReview += 1;

      await db.execute(sql`
        INSERT INTO bank_email_messages (
          id, workspace_id, connection_id, gmail_message_id, thread_id, sender, subject,
          received_at, body_hash, status, confidence_basis_points, parsed_payload
        ) VALUES (
          ${randomUUID()}, ${workspaceId}, ${connectionId}, ${message.id}, ${message.threadId ?? null},
          ${sender}, ${subject}, ${new Date(Number(message.internalDate ?? Date.now()))}, ${bodyHash},
          ${status}, ${Math.round(parsed.confidence * 10000)}, ${JSON.stringify(parsed)}
        )
        ON CONFLICT DO NOTHING
      `);
    }

    await db.execute(sql`
      UPDATE bank_email_sync_runs
      SET finished_at = now(), status = 'completed', messages_scanned = ${scanned},
          messages_imported = ${imported}, messages_pending_review = ${pendingReview}
      WHERE id = ${runId}
    `);
    await db.execute(sql`
      UPDATE bank_email_connections SET last_synced_at = now() WHERE id = ${connectionId}
    `);

    return NextResponse.json({ scanned, readyToImport: imported, pendingReview });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email sync error";
    await db.execute(sql`
      UPDATE bank_email_sync_runs SET finished_at = now(), status = 'failed', error_message = ${message}
      WHERE id = ${runId}
    `);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
