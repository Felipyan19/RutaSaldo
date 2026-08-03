import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { getWorkspaceIdForUser } from "@/db/users";
import { encryptRefreshToken, exchangeGmailCode, gmailProfile, verifyGmailState } from "@/lib/gmail-oauth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.redirect(new URL("/?auth_error=login_required", request.url));

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = request.cookies.get("rutasaldo_gmail_oauth_state")?.value;
  const error = url.searchParams.get("error");

  if (error) return NextResponse.redirect(new URL(`/configuracion?gmail=${encodeURIComponent(error)}`, request.url));
  if (!code || !state || !storedState || state !== storedState || !verifyGmailState(state)) {
    return NextResponse.redirect(new URL("/configuracion?gmail=invalid_state", request.url));
  }

  try {
    const workspaceId = await getWorkspaceIdForUser(session.user.id);
    if (!workspaceId) throw new Error("Workspace not found");

    const tokens = await exchangeGmailCode(code, url.origin);
    if (!tokens.refresh_token) {
      return NextResponse.redirect(new URL("/configuracion?gmail=refresh_token_missing", request.url));
    }
    const profile = await gmailProfile(tokens.access_token!);
    const encryptedRefreshToken = encryptRefreshToken(tokens.refresh_token);
    const db = getDb();
    const connectionId = randomUUID();

    await db.execute(sql`
      INSERT INTO bank_email_connections (
        id, workspace_id, provider, email, status, encrypted_refresh_token,
        token_key_version, last_history_id, created_at, updated_at
      ) VALUES (
        ${connectionId}, ${workspaceId}, 'gmail', ${profile.emailAddress.toLowerCase()}, 'active',
        ${encryptedRefreshToken}, 1, ${profile.historyId ?? null}, now(), now()
      )
      ON CONFLICT (workspace_id, (lower(email))) DO UPDATE SET
        status = 'active',
        encrypted_refresh_token = EXCLUDED.encrypted_refresh_token,
        token_key_version = EXCLUDED.token_key_version,
        last_history_id = COALESCE(bank_email_connections.last_history_id, EXCLUDED.last_history_id),
        updated_at = now()
    `);

    const response = NextResponse.redirect(new URL("/configuracion?gmail=connected", request.url));
    response.cookies.delete("rutasaldo_gmail_oauth_state");
    return response;
  } catch (callbackError) {
    console.error("[gmail-oauth] callback failed", callbackError);
    return NextResponse.redirect(new URL("/configuracion?gmail=error", request.url));
  }
}
