import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { getWorkspaceIdForUser } from "@/db/users";

type ParsedPayload = {
  institution?: string;
  status?: string;
  kind?: string;
  amount?: number | null;
  description?: string;
  merchant?: string | null;
  reference?: string | null;
  accountLastFour?: string | null;
  destinationLastFour?: string | null;
  categorySlug?: string | null;
  confidence?: number;
};

async function currentWorkspaceId() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return getWorkspaceIdForUser(session.user.id);
}

export async function GET() {
  const workspaceId = await currentWorkspaceId();
  if (!workspaceId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const db = getDb();
  const [messages, accounts] = await Promise.all([
    db.execute<{
      id: string;
      subject: string;
      sender: string;
      received_at: Date;
      processing_status: string;
      movement_status: string;
      confidence_basis_points: number;
      parsed_payload: string;
      account_id: string | null;
      transaction_id: string | null;
      account_name: string | null;
    }>(sql`
      SELECT bem.id, bem.subject, bem.sender, bem.received_at, bem.processing_status,
             bem.movement_status, bem.confidence_basis_points, bem.parsed_payload,
             bem.account_id, bem.transaction_id, a.name AS account_name
      FROM bank_email_messages bem
      LEFT JOIN accounts a ON a.id = bem.account_id AND a.workspace_id = bem.workspace_id
      WHERE bem.workspace_id = ${workspaceId}
      ORDER BY bem.received_at DESC
      LIMIT 150
    `),
    db.execute<{ id: string; name: string; institution: string; kind: string }>(sql`
      SELECT id, name, institution, kind
      FROM accounts
      WHERE workspace_id = ${workspaceId}
      ORDER BY name ASC
    `),
  ]);

  return NextResponse.json({
    accounts: accounts.rows,
    items: messages.rows.map((row) => ({
      ...row,
      parsed: JSON.parse(row.parsed_payload) as ParsedPayload,
      confidence: row.confidence_basis_points / 10000,
    })),
  }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: NextRequest) {
  const workspaceId = await currentWorkspaceId();
  if (!workspaceId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json().catch(() => null) as { id?: string; action?: string; accountId?: string } | null;
  if (!body?.id || !["approve", "ignore", "assign_account"].includes(body.action ?? "")) {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const db = getDb();
  if (body.action === "assign_account") {
    if (!body.accountId) return NextResponse.json({ error: "Selecciona una cuenta" }, { status: 400 });
    const updated = await db.execute<{ id: string }>(sql`
      UPDATE bank_email_messages bem
      SET account_id = a.id
      FROM accounts a
      WHERE bem.id = ${body.id}
        AND bem.workspace_id = ${workspaceId}
        AND bem.processing_status IN ('pending_review', 'received')
        AND a.id = ${body.accountId}
        AND a.workspace_id = ${workspaceId}
      RETURNING bem.id
    `);
    if (!updated.rows.length) return NextResponse.json({ error: "No se pudo asociar la cuenta" }, { status: 409 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "ignore") {
    const updated = await db.execute<{ id: string }>(sql`
      UPDATE bank_email_messages
      SET processing_status = 'ignored', processed_at = now()
      WHERE id = ${body.id} AND workspace_id = ${workspaceId}
        AND processing_status IN ('pending_review', 'received')
      RETURNING id
    `);
    if (!updated.rows.length) return NextResponse.json({ error: "El correo ya fue procesado" }, { status: 409 });
    return NextResponse.json({ ok: true });
  }

  try {
    const transactionId = randomUUID();
    await db.transaction(async (tx) => {
      const selected = await tx.execute<{
        id: string;
        parsed_payload: string;
        account_id: string | null;
        received_at: Date;
        processing_status: string;
      }>(sql`
        SELECT id, parsed_payload, account_id, received_at, processing_status
        FROM bank_email_messages
        WHERE id = ${body.id} AND workspace_id = ${workspaceId}
        FOR UPDATE
      `);
      const message = selected.rows[0];
      if (!message || !["pending_review", "received"].includes(message.processing_status)) throw new Error("ALREADY_PROCESSED");

      const parsed = JSON.parse(message.parsed_payload) as ParsedPayload;
      if (!message.account_id) throw new Error("ACCOUNT_REQUIRED");
      if (!parsed.amount || parsed.amount <= 0) throw new Error("AMOUNT_REQUIRED");

      const kind = parsed.kind === "refund" ? "income" : ["purchase", "withdrawal"].includes(parsed.kind ?? "") ? "expense" : null;
      if (!kind) throw new Error("RECONCILIATION_REQUIRED");

      const categoryId = parsed.categorySlug ? `${workspaceId}:${parsed.categorySlug}` : null;
      const date = new Date(message.received_at).toISOString().slice(0, 10);
      const description = parsed.description?.trim() || "Movimiento aprobado desde Gmail";

      await tx.execute(sql`
        INSERT INTO transactions (id, workspace_id, account_id, category_id, kind, amount, description, date)
        VALUES (${transactionId}, ${workspaceId}, ${message.account_id}, ${categoryId}, ${kind}, ${parsed.amount}, ${description}, ${date})
      `);
      await tx.execute(sql`
        UPDATE bank_email_messages
        SET processing_status = 'imported', transaction_id = ${transactionId}, processed_at = now()
        WHERE id = ${message.id}
      `);
    });
    return NextResponse.json({ ok: true, transactionId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    if (message === "ALREADY_PROCESSED") return NextResponse.json({ error: "El correo ya fue procesado" }, { status: 409 });
    if (message === "ACCOUNT_REQUIRED") return NextResponse.json({ error: "Selecciona una cuenta antes de aprobar" }, { status: 409 });
    if (message === "AMOUNT_REQUIRED") return NextResponse.json({ error: "El correo no contiene un monto válido" }, { status: 409 });
    if (message === "RECONCILIATION_REQUIRED") return NextResponse.json({ error: "Las transferencias y pagos de tarjeta deben conciliarse, no aprobarse como ingreso o gasto" }, { status: 409 });
    console.error("[email-inbox] approval failed", error);
    return NextResponse.json({ error: "No se pudo aprobar el correo" }, { status: 500 });
  }
}
