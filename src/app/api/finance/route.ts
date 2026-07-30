import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { stateToRows } from "@/db/seed";
import { readFinanceState } from "@/db/finance";
import { getWorkspaceIdForUser } from "@/db/users";
import { accounts, categories, transactions, workspaces } from "@/db/schema";
import { financeStateSchema } from "@/lib/finance-schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
      await tx.delete(accounts).where(eq(accounts.workspaceId, workspaceId));
      await tx.delete(categories).where(eq(categories.workspaceId, workspaceId));

      const rows = stateToRows(state, workspaceId);
      if (rows.accounts.length) await tx.insert(accounts).values(rows.accounts);
      if (rows.categories.length) await tx.insert(categories).values(rows.categories);
      if (rows.transactions.length) await tx.insert(transactions).values(rows.transactions);
    });

    return NextResponse.json(await readFinanceState(workspaceId), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[finance] PUT failed", error);
    return NextResponse.json({ error: "No se pudo guardar la información financiera" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const workspaceId = await currentWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const db = getDb();
   // Keep the workspace, categories, and user identity intact while clearing financial data.
   // Deleting the workspace would cascade into `users` and invalidate the session.
    await db.transaction(async (tx) => {
      await tx.delete(transactions).where(eq(transactions.workspaceId, workspaceId));
      await tx.delete(accounts).where(eq(accounts.workspaceId, workspaceId));
    });
    return NextResponse.json(await readFinanceState(workspaceId), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[finance] DELETE failed", error);
    return NextResponse.json({ error: "No se pudieron limpiar los datos financieros" }, { status: 500 });
  }
}
