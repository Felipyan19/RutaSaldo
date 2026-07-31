import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { stateToRows } from "@/db/seed";
import { createAccount, createTransaction, createTransfer, deleteTransaction, FinanceInputError, readFinanceState, updateTransaction } from "@/db/finance";
import { getWorkspaceIdForUser } from "@/db/users";
import { accounts, categories, transactions, transfers, workspaces } from "@/db/schema";
import { accountInputSchema, financeStateSchema, transactionInputSchema, transferInputSchema } from "@/lib/finance-schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mutationError(error: unknown, fallbackMessage: string) {
  if (error instanceof FinanceInputError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

async function currentWorkspaceId() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return getWorkspaceIdForUser(session.user.id);
}

export async function GET() {
  try {
    const workspaceId = await currentWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    return NextResponse.json(await readFinanceState(workspaceId), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[finance] GET failed", error);
    return NextResponse.json({ error: "No se pudo cargar la información financiera" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const workspaceId = await currentWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const parsed = financeStateSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Los datos financieros no son válidos." }, { status: 400 });
    const state = parsed.data;
    const db = getDb();

    await db.transaction(async (tx) => {
      await tx.insert(workspaces).values({ id: workspaceId, name: state.workspaceName }).onConflictDoUpdate({ target: workspaces.id, set: { name: state.workspaceName } });
      await tx.delete(transactions).where(eq(transactions.workspaceId, workspaceId));
      await tx.delete(transfers).where(eq(transfers.workspaceId, workspaceId));
      await tx.delete(accounts).where(eq(accounts.workspaceId, workspaceId));
      await tx.delete(categories).where(eq(categories.workspaceId, workspaceId));

      const rows = stateToRows(state, workspaceId);
      if (rows.accounts.length) await tx.insert(accounts).values(rows.accounts);
      if (rows.categories.length) await tx.insert(categories).values(rows.categories);
      if (rows.transfers.length) await tx.insert(transfers).values(rows.transfers);
      if (rows.transactions.length) await tx.insert(transactions).values(rows.transactions);
    });

    return NextResponse.json(await readFinanceState(workspaceId), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[finance] PUT failed", error);
    return NextResponse.json({ error: "No se pudo guardar la información financiera" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const workspaceId = await currentWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const body = await request.json();
    if (body?.type === "account") {
      const parsed = accountInputSchema.safeParse(body.account);
      if (!parsed.success) return NextResponse.json({ error: "La cuenta no es válida." }, { status: 400 });
      return NextResponse.json(await createAccount(workspaceId, parsed.data), { headers: { "Cache-Control": "private, no-store" } });
    }
    if (body?.type === "transfer") {
      const parsed = transferInputSchema.safeParse(body.transfer);
      if (!parsed.success) return NextResponse.json({ error: "La transferencia no es válida." }, { status: 400 });
      return NextResponse.json(await createTransfer(workspaceId, parsed.data), { headers: { "Cache-Control": "private, no-store" } });
    }
    const parsed = transactionInputSchema.safeParse(body?.transaction);
    if (body?.type !== "transaction" || !parsed.success) return NextResponse.json({ error: "El movimiento no es válido." }, { status: 400 });
    return NextResponse.json(await createTransaction(workspaceId, parsed.data), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[finance] POST failed", error);
    return mutationError(error, "No se pudo crear el registro financiero");
  }
}

export async function PATCH(request: Request) {
  try {
    const workspaceId = await currentWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const body = await request.json();
    const transactionId = typeof body?.transactionId === "string" ? body.transactionId : "";
    const parsed = transactionInputSchema.omit({ id: true }).safeParse(body?.transaction);
    if (body?.type !== "transaction" || !transactionId || !parsed.success) return NextResponse.json({ error: "El movimiento no es válido." }, { status: 400 });
    return NextResponse.json(await updateTransaction(workspaceId, transactionId, parsed.data), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[finance] PATCH failed", error);
    return mutationError(error, "No se pudo actualizar el movimiento");
  }
}

export async function DELETE(request: Request) {
  try {
    const workspaceId = await currentWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const transactionId = new URL(request.url).searchParams.get("transactionId");
    if (transactionId) {
      return NextResponse.json(await deleteTransaction(workspaceId, transactionId), { headers: { "Cache-Control": "private, no-store" } });
    }
    const db = getDb();
   // Keep the workspace, categories, and user identity intact while clearing financial data.
   // Deleting the workspace would cascade into `users` and invalidate the session.
    await db.transaction(async (tx) => {
      await tx.delete(transactions).where(eq(transactions.workspaceId, workspaceId));
      await tx.delete(transfers).where(eq(transfers.workspaceId, workspaceId));
      await tx.delete(accounts).where(eq(accounts.workspaceId, workspaceId));
    });
    return NextResponse.json(await readFinanceState(workspaceId), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[finance] DELETE failed", error);
    return NextResponse.json({ error: "No se pudieron limpiar los datos financieros" }, { status: 500 });
  }
}
