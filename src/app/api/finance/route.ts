import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { DEMO_WORKSPACE_ID, seedDemoWorkspace, stateToRows } from "@/db/seed";
import { accounts, categories, transactions, workspaces } from "@/db/schema";
import { FinanceState } from "@/lib/finance";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function readState(db: ReturnType<typeof getDb>): Promise<FinanceState> {
  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, DEMO_WORKSPACE_ID));
  if (!workspace) await seedDemoWorkspace(db);

  const [workspaceRow] = await db.select().from(workspaces).where(eq(workspaces.id, DEMO_WORKSPACE_ID));
  const [accountRows, categoryRows, transactionRows] = await Promise.all([
    db.select().from(accounts).where(eq(accounts.workspaceId, DEMO_WORKSPACE_ID)).orderBy(asc(accounts.name)),
    db.select().from(categories).where(eq(categories.workspaceId, DEMO_WORKSPACE_ID)).orderBy(asc(categories.name)),
    db.select().from(transactions).where(eq(transactions.workspaceId, DEMO_WORKSPACE_ID)).orderBy(asc(transactions.date)),
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

export async function GET() {
  try {
    return NextResponse.json(await readState(getDb()));
  } catch (error) {
    console.error("[finance] GET failed", error);
    return NextResponse.json({ error: "No se pudo cargar la información financiera" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const state = (await request.json()) as FinanceState;
    const db = getDb();

    await db.insert(workspaces).values({ id: DEMO_WORKSPACE_ID, name: state.workspaceName }).onConflictDoUpdate({
      target: workspaces.id,
      set: { name: state.workspaceName },
    });
    await db.delete(transactions).where(eq(transactions.workspaceId, DEMO_WORKSPACE_ID));
    await db.delete(accounts).where(eq(accounts.workspaceId, DEMO_WORKSPACE_ID));
    await db.delete(categories).where(eq(categories.workspaceId, DEMO_WORKSPACE_ID));

    const rows = stateToRows(state);
    if (rows.accounts.length) await db.insert(accounts).values(rows.accounts);
    if (rows.categories.length) await db.insert(categories).values(rows.categories);
    if (rows.transactions.length) await db.insert(transactions).values(rows.transactions);

    return NextResponse.json(await readState(db));
  } catch (error) {
    console.error("[finance] PUT failed", error);
    return NextResponse.json({ error: "No se pudo guardar la información financiera" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const db = getDb();
    await db.delete(workspaces).where(eq(workspaces.id, DEMO_WORKSPACE_ID));
    await seedDemoWorkspace(db);
    return NextResponse.json(await readState(db));
  } catch (error) {
    console.error("[finance] DELETE failed", error);
    return NextResponse.json({ error: "No se pudieron restaurar los datos demo" }, { status: 500 });
  }
}
