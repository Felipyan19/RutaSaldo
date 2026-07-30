import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { seedWorkspace, stateToRows } from "@/db/seed";
import { getWorkspaceIdForUser } from "@/db/users";
import { accounts, categories, transactions, workspaces } from "@/db/schema";
import { FinanceState } from "@/lib/finance";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function readState(db: ReturnType<typeof getDb>, workspaceId: string): Promise<FinanceState> {
  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId));
  if (!workspace) await seedWorkspace(db, workspaceId);

  const [workspaceRow] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId));
  const [accountRows, categoryRows, transactionRows] = await Promise.all([
    db.select().from(accounts).where(eq(accounts.workspaceId, workspaceId)).orderBy(asc(accounts.name)),
    db.select().from(categories).where(eq(categories.workspaceId, workspaceId)).orderBy(asc(categories.name)),
    db.select().from(transactions).where(eq(transactions.workspaceId, workspaceId)).orderBy(asc(transactions.date)),
  ]);

  return {
    workspaceName: workspaceRow?.name ?? "Mis finanzas",
    accounts: accountRows.map((accountRow) => ({
      id: accountRow.id,
      name: accountRow.name,
      institution: accountRow.institution,
      kind: accountRow.kind as FinanceState["accounts"][number]["kind"],
      color: accountRow.color,
      openingBalance: accountRow.openingBalance,
    })),
    categories: categoryRows.map((category) => ({
      id: category.id,
      name: category.name,
      color: category.color,
      icon: category.icon,
    })),
    transactions: transactionRows.map((transaction) => ({
      id: transaction.id,
      accountId: transaction.accountId,
      categoryId: transaction.categoryId,
      kind: transaction.kind as FinanceState["transactions"][number]["kind"],
      amount: transaction.amount,
      description: transaction.description,
      date: String(transaction.date),
    })),
  };
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
    return NextResponse.json(await readState(getDb(), workspaceId));
  } catch (error) {
    console.error("[finance] GET failed", error);
    return NextResponse.json({ error: "No se pudo cargar la información financiera" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const workspaceId = await currentWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const state = (await request.json()) as FinanceState;
    const db = getDb();

    await db.insert(workspaces).values({ id: workspaceId, name: state.workspaceName }).onConflictDoUpdate({
      target: workspaces.id,
      set: { name: state.workspaceName },
    });
    await db.delete(transactions).where(eq(transactions.workspaceId, workspaceId));
    await db.delete(accounts).where(eq(accounts.workspaceId, workspaceId));
    await db.delete(categories).where(eq(categories.workspaceId, workspaceId));

    const rows = stateToRows(state, workspaceId);
    if (rows.accounts.length) await db.insert(accounts).values(rows.accounts);
    if (rows.categories.length) await db.insert(categories).values(rows.categories);
    if (rows.transactions.length) await db.insert(transactions).values(rows.transactions);

    return NextResponse.json(await readState(db, workspaceId));
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
    // Keep the workspace and user identity intact when restoring demo data.
    // Deleting the workspace would cascade into `users` and invalidate the session.
    await db.delete(transactions).where(eq(transactions.workspaceId, workspaceId));
    await db.delete(accounts).where(eq(accounts.workspaceId, workspaceId));
    await db.delete(categories).where(eq(categories.workspaceId, workspaceId));
    await seedWorkspace(db, workspaceId);
    return NextResponse.json(await readState(db, workspaceId));
  } catch (error) {
    console.error("[finance] DELETE failed", error);
    return NextResponse.json({ error: "No se pudieron restaurar los datos demo" }, { status: 500 });
  }
}
