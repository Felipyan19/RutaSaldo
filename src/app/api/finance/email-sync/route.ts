import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  normalizedMovementFingerprint,
  parseBankEmail,
  shouldAutoImport,
  type ParsedBankEmail,
} from "@/lib/bank-email-parser";
import {
  decryptRefreshToken,
  gmailAccessTokenFromRefreshToken,
} from "@/lib/gmail-oauth";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_SENDERS = (process.env.BANK_EMAIL_ALLOWED_SENDERS ?? "")
  .split(",")
  .map((value) => value.trim().toLowerCase().replace(/^@/, ""))
  .filter(Boolean);

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || !header?.startsWith("Bearer ")) return false;
  const supplied = Buffer.from(header.slice(7));
  const expected = Buffer.from(secret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function decodeBase64Url(value?: string) {
  if (!value) return "";
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

function htmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
  historyId?: string;
  internalDate?: string;
  payload?: GmailPayload;
};
type GmailConnection = {
  id: string;
  workspace_id: string;
  encrypted_refresh_token: string;
  last_history_id: string | null;
};

function extractBody(payload: GmailPayload): string {
  const plain: string[] = [];
  const html: string[] = [];
  const visit = (part: GmailPayload) => {
    if (part.body?.data) {
      const decoded = decodeBase64Url(part.body.data);
      if (part.mimeType === "text/html") html.push(htmlToText(decoded));
      else if (part.mimeType === "text/plain" || !part.mimeType) plain.push(decoded);
    }
    for (const nested of part.parts ?? []) visit(nested);
  };
  visit(payload);
  return (plain.join("\n") || html.join("\n")).trim();
}

function header(headers: GmailHeader[] | undefined, name: string) {
  return headers?.find((item) => item.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function senderAddress(from: string) {
  const angle = from.match(/<([^>]+)>/);
  const candidate = (angle?.[1] ?? from).trim().toLowerCase();
  return candidate.match(/[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+/i)?.[0] ?? "";
}

function senderDomain(address: string) {
  return address.split("@")[1]?.toLowerCase() ?? "";
}

function domainAllowed(domain: string) {
  return ALLOWED_SENDERS.length > 0
    && ALLOWED_SENDERS.some((allowed) => domain === allowed || domain.endsWith(`.${allowed}`));
}

function authenticationPassed(authenticationResults: string, domain: string) {
  const normalized = authenticationResults.toLowerCase();
  return (/\bdkim=pass\b/.test(normalized) || /\bspf=pass\b/.test(normalized)) && normalized.includes(domain);
}

async function gmailJson<T>(token: string, url: string): Promise<T> {
  const response = await fetch(url, { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!response.ok) throw new Error(`Gmail API request failed (${response.status})`);
  return response.json() as Promise<T>;
}

async function listMessageIds(token: string, lastHistoryId: string | null) {
  const ids = new Set<string>();
  let newestHistoryId: string | null = null;

  if (lastHistoryId) {
    try {
      let pageToken: string | undefined;
      do {
        const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/history");
        url.searchParams.set("startHistoryId", lastHistoryId);
        url.searchParams.set("historyTypes", "messageAdded");
        url.searchParams.set("maxResults", "100");
        if (pageToken) url.searchParams.set("pageToken", pageToken);
        const result = await gmailJson<{
          historyId?: string;
          nextPageToken?: string;
          history?: Array<{ messagesAdded?: Array<{ message: { id: string } }> }>;
        }>(token, url.toString());
        newestHistoryId = result.historyId ?? newestHistoryId;
        for (const history of result.history ?? []) {
          for (const added of history.messagesAdded ?? []) ids.add(added.message.id);
        }
        pageToken = result.nextPageToken;
      } while (pageToken);
      return { ids: [...ids], historyId: newestHistoryId ?? lastHistoryId };
    } catch {
      // Gmail expires old history IDs. Use a bounded search and replace the cursor.
    }
  }

  const query = encodeURIComponent("newer_than:14d");
  const result = await gmailJson<{ messages?: Array<{ id: string }> }>(
    token,
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=100`,
  );
  for (const item of result.messages ?? []) ids.add(item.id);
  const profile = await gmailJson<{ historyId?: string }>(token, "https://gmail.googleapis.com/gmail/v1/users/me/profile");
  return { ids: [...ids], historyId: profile.historyId ?? null };
}

async function resolveAccount(db: ReturnType<typeof getDb>, workspaceId: string, parsed: ParsedBankEmail) {
  const institutionNames: Record<ParsedBankEmail["institution"], string[]> = {
    bancolombia: ["bancolombia"],
    nequi: ["nequi"],
    rappipay: ["rappipay"],
    rappicard: ["davivienda s.a.", "rappipay"],
    wise: ["wise"],
    unknown: [],
  };
  const expectedInstitutions = institutionNames[parsed.institution];
  if (!expectedInstitutions.length) return null;

  const result = await db.execute<{ id: string; institution: string | null; last_four_digits: string | null }>(sql`
    SELECT a.id, a.institution, ccd.last_four_digits
    FROM accounts a
    LEFT JOIN credit_card_details ccd ON ccd.account_id = a.id
    WHERE a.workspace_id = ${workspaceId}
  `);
  const matches = result.rows.filter((account) => {
    const institution = account.institution?.trim().toLowerCase() ?? "";
    const institutionMatches = expectedInstitutions.includes(institution);
    const digitsMatch = !parsed.accountLastFour || account.last_four_digits === parsed.accountLastFour;
    return institutionMatches && digitsMatch;
  });
  return matches.length === 1 ? matches[0].id : null;
}

function transactionKind(parsed: ParsedBankEmail) {
  if (parsed.kind === "refund") return "income";
  if (["purchase", "withdrawal"].includes(parsed.kind)) return "expense";
  return null;
}

async function processMessage(
  db: ReturnType<typeof getDb>,
  workspaceId: string,
  connectionId: string,
  message: GmailMessage,
) {
  const headers = message.payload?.headers;
  const from = header(headers, "From");
  const sender = senderAddress(from);
  const domain = senderDomain(sender);
  const authResults = header(headers, "Authentication-Results");
  if (!sender || !domainAllowed(domain) || !authenticationPassed(authResults, domain)) return "ignored" as const;

  const subject = header(headers, "Subject");
  const body = extractBody(message.payload ?? {});
  const parsed = parseBankEmail(subject, body, sender);
  const rawBodyHash = createHash("sha256").update(`${sender}\n${subject}\n${body}`).digest("hex");
  const movementFingerprint = createHash("sha256").update(normalizedMovementFingerprint(parsed)).digest("hex");
  const accountId = await resolveAccount(db, workspaceId, parsed);
  const unsafeAutomaticKinds = ["card_payment", "transfer_sent", "transfer_received"];
  const canImport = shouldAutoImport(parsed) && accountId !== null && !unsafeAutomaticKinds.includes(parsed.kind);
  const ignoredMovement = parsed.status === "pending" || parsed.status === "rejected" || parsed.status === "reversed";
  const initialStatus = ignoredMovement ? "ignored" : canImport ? "received" : "pending_review";
  const emailId = randomUUID();
  const receivedAt = new Date(Number(message.internalDate ?? Date.now()));

  const inserted = await db.execute<{ id: string }>(sql`
    INSERT INTO bank_email_messages (
      id, workspace_id, connection_id, gmail_message_id, thread_id, history_id,
      sender, sender_domain, authentication_results, subject, received_at,
      raw_body_hash, movement_fingerprint, processing_status, movement_status,
      confidence_basis_points, parsed_payload, account_id, processed_at
    ) VALUES (
      ${emailId}, ${workspaceId}, ${connectionId}, ${message.id}, ${message.threadId ?? null}, ${message.historyId ?? null},
      ${sender}, ${domain}, ${authResults || null}, ${subject}, ${receivedAt},
      ${rawBodyHash}, ${movementFingerprint}, ${initialStatus}, ${parsed.status},
      ${Math.round(parsed.confidence * 10000)}, ${JSON.stringify(parsed)}, ${accountId},
      ${ignoredMovement ? new Date() : null}
    )
    ON CONFLICT (connection_id, gmail_message_id) DO NOTHING
    RETURNING id
  `);
  if (inserted.rows.length === 0) return "duplicate" as const;
  if (ignoredMovement) return "ignored" as const;
  if (!canImport || !parsed.amount || !accountId) return "pending_review" as const;

  const kind = transactionKind(parsed);
  if (!kind) return "pending_review" as const;
  const categoryId = parsed.categorySlug ? `${workspaceId}:${parsed.categorySlug}` : null;
  const transactionId = randomUUID();
  const date = receivedAt.toISOString().slice(0, 10);

  await db.transaction(async (tx) => {
    const duplicate = await tx.execute<{ id: string }>(sql`
      SELECT transaction_id AS id
      FROM bank_email_messages
      WHERE workspace_id = ${workspaceId}
        AND movement_fingerprint = ${movementFingerprint}
        AND transaction_id IS NOT NULL
        AND received_at BETWEEN ${new Date(receivedAt.getTime() - 36e5)} AND ${new Date(receivedAt.getTime() + 36e5)}
      LIMIT 1
    `);
    if (duplicate.rows.length > 0) {
      await tx.execute(sql`UPDATE bank_email_messages SET processing_status = 'duplicate', processed_at = now() WHERE id = ${emailId}`);
      return;
    }

    await tx.execute(sql`
      INSERT INTO transactions (id, workspace_id, account_id, category_id, kind, amount, description, date)
      VALUES (${transactionId}, ${workspaceId}, ${accountId}, ${categoryId}, ${kind}, ${parsed.amount}, ${parsed.description}, ${date})
    `);
    await tx.execute(sql`
      UPDATE bank_email_messages
      SET processing_status = 'imported', transaction_id = ${transactionId}, processed_at = now()
      WHERE id = ${emailId}
    `);
  });

  const state = await db.execute<{ processing_status: string }>(sql`SELECT processing_status FROM bank_email_messages WHERE id = ${emailId}`);
  return state.rows[0]?.processing_status === "imported" ? "imported" as const : "duplicate" as const;
}

async function syncConnection(db: ReturnType<typeof getDb>, connection: GmailConnection) {
  const runId = randomUUID();
  await db.execute(sql`
    INSERT INTO bank_email_sync_runs (id, workspace_id, connection_id)
    VALUES (${runId}, ${connection.workspace_id}, ${connection.id})
  `);

  try {
    const refreshToken = decryptRefreshToken(connection.encrypted_refresh_token);
    const token = await gmailAccessTokenFromRefreshToken(refreshToken);
    const listed = await listMessageIds(token, connection.last_history_id);
    const counters = { scanned: 0, stored: 0, imported: 0, pendingReview: 0, ignored: 0, duplicate: 0 };

    for (const id of listed.ids) {
      const message = await gmailJson<GmailMessage>(token, `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`);
      counters.scanned += 1;
      const result = await processMessage(db, connection.workspace_id, connection.id, message);
      if (result !== "ignored" || domainAllowed(senderDomain(senderAddress(header(message.payload?.headers, "From"))))) counters.stored += 1;
      if (result === "imported") counters.imported += 1;
      else if (result === "pending_review") counters.pendingReview += 1;
      else if (result === "ignored") counters.ignored += 1;
      else counters.duplicate += 1;
    }

    await db.execute(sql`
      UPDATE bank_email_sync_runs
      SET finished_at = now(), status = 'completed', messages_scanned = ${counters.scanned},
          messages_stored = ${counters.stored}, transactions_created = ${counters.imported},
          messages_pending_review = ${counters.pendingReview}, messages_ignored = ${counters.ignored},
          messages_duplicate = ${counters.duplicate}
      WHERE id = ${runId}
    `);
    await db.execute(sql`
      UPDATE bank_email_connections
      SET last_synced_at = now(), last_history_id = COALESCE(${listed.historyId}, last_history_id), updated_at = now()
      WHERE id = ${connection.id}
    `);
    return { connectionId: connection.id, workspaceId: connection.workspace_id, ...counters };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email sync error";
    await db.execute(sql`
      UPDATE bank_email_sync_runs SET finished_at = now(), status = 'failed', error_message = ${message}
      WHERE id = ${runId}
    `);
    if (/refresh token|invalid_grant/i.test(message)) {
      await db.execute(sql`UPDATE bank_email_connections SET status = 'reauth_required', updated_at = now() WHERE id = ${connection.id}`);
    }
    return { connectionId: connection.id, workspaceId: connection.workspace_id, error: message };
  }
}

async function sync(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ALLOWED_SENDERS.length === 0) return NextResponse.json({ error: "BANK_EMAIL_ALLOWED_SENDERS is not configured" }, { status: 503 });

  const db = getDb();
  const result = await db.execute<GmailConnection>(sql`
    SELECT id, workspace_id, encrypted_refresh_token, last_history_id
    FROM bank_email_connections
    WHERE provider = 'gmail' AND status = 'active' AND encrypted_refresh_token IS NOT NULL
    ORDER BY updated_at ASC
  `);

  const connections = result.rows;
  if (connections.length === 0) return NextResponse.json({ connections: 0, results: [] });

  const results = [];
  for (const connection of connections) results.push(await syncConnection(db, connection));
  return NextResponse.json({ connections: connections.length, results });
}

export async function GET(request: NextRequest) {
  return sync(request);
}

export async function POST(request: NextRequest) {
  return sync(request);
}
