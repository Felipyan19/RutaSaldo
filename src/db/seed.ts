import { FinanceState, seedState } from "@/lib/finance";
import { accounts, categories, transactions, workspaces } from "./schema";

export const DEMO_WORKSPACE_ID = process.env.RUTASALDO_WORKSPACE_ID ?? "demo-workspace";

function namespacedSeedState(workspaceId: string) {
  const id = (value: string) => workspaceId === DEMO_WORKSPACE_ID ? value : `${workspaceId}:${value}`;
  return {
    ...seedState,
    accounts: seedState.accounts.map((account) => ({ ...account, id: id(account.id) })),
    categories: seedState.categories.map((category) => ({ ...category, id: id(category.id) })),
    transactions: seedState.transactions.map((transaction) => ({
      ...transaction, id: id(transaction.id), accountId: id(transaction.accountId), categoryId: id(transaction.categoryId),
    })),
  };
}

export async function seedWorkspace(db: ReturnType<typeof import("./index").getDb>, workspaceId: string) {
  const initialState = namespacedSeedState(workspaceId);
  await db.insert(workspaces).values({
    id: workspaceId,
    name: initialState.workspaceName,
  }).onConflictDoNothing();

  await db.insert(accounts).values(
    initialState.accounts.map((account) => ({ ...account, workspaceId, currency: "COP" })),
  ).onConflictDoNothing();

  await db.insert(categories).values(
    initialState.categories.map((category) => ({ ...category, workspaceId })),
  ).onConflictDoNothing();

  await db.insert(transactions).values(
    initialState.transactions.map((transaction) => ({ ...transaction, workspaceId })),
  ).onConflictDoNothing();
}

export async function seedDemoWorkspace(db: ReturnType<typeof import("./index").getDb>) {
  return seedWorkspace(db, DEMO_WORKSPACE_ID);
}

export function stateToRows(state: FinanceState, workspaceId: string) {
  return {
    accounts: state.accounts.map((account) => ({
      ...account,
      workspaceId,
      currency: "COP",
    })),
    categories: state.categories.map((category) => ({ ...category, workspaceId })),
    transactions: state.transactions.map((transaction) => ({ ...transaction, workspaceId })),
  };
}
