import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { getWorkspaceIdForUser } from "@/db/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function workspaceIdForSession() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return getWorkspaceIdForUser(session.user.id);
}

export async function GET() {
  const workspaceId = await workspaceIdForSession();
  if (!workspaceId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const db = getDb();
  const result = await db.execute<{
    email: string;
    status: string;
    last_synced_at: Date | null;
  }>(sql`
    SELECT email, status, last_synced_at
    FROM bank_email_connections
    WHERE workspace_id = ${workspaceId} AND provider = 'gmail'
    ORDER BY updated_at DESC
    LIMIT 1
  `);
  const connection = result.rows[0];
  return NextResponse.json({
    connected: Boolean(connection && connection.status !== "disabled"),
    email: connection?.email ?? null,
    status: connection?.status ?? null,
    lastSyncedAt: connection?.last_synced_at ?? null,
  }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function DELETE() {
  const workspaceId = await workspaceIdForSession();
  if (!workspaceId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const db = getDb();
  await db.execute(sql`
    UPDATE bank_email_connections
    SET status = 'disabled', encrypted_refresh_token = NULL, token_key_version = NULL, updated_at = now()
    WHERE workspace_id = ${workspaceId} AND provider = 'gmail'
  `);
  return NextResponse.json({ connected: false }, { headers: { "Cache-Control": "private, no-store" } });
}
