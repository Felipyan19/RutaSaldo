import { asc, eq } from "drizzle-orm";
import { getDb } from "./index";
import { seedWorkspace } from "./seed";
import { accounts, categories, transactions, workspaces } from "./schema";
import { FinanceState } from "@/lib/finance";

export async function readFinanceState(workspaceId: string): Promise<FinanceState> {
  const db = getDb();
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
    accounts: accountRows.map((account) => ({
      id: account.id,
      name: account.name,
      institution: account.institution,
      kind: account.kind as FinanceState["accounts"][number]["kind"],
      color: account.color,
      openingBalance: account.openingBalance,
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
