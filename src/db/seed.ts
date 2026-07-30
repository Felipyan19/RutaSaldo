import { FinanceState, seedState } from "@/lib/finance";
import { accounts, categories, transactions, workspaces } from "./schema";

export const DEMO_WORKSPACE_ID = process.env.RUTASALDO_WORKSPACE_ID ?? "demo-workspace";

export async function seedDemoWorkspace(db: ReturnType<typeof import("./index").getDb>) {
  await db.insert(workspaces).values({
    id: DEMO_WORKSPACE_ID,
    name: seedState.workspaceName,
  }).onConflictDoNothing();

  await db.insert(accounts).values(
    seedState.accounts.map((account) => ({
      ...account,
      workspaceId: DEMO_WORKSPACE_ID,
      currency: "COP",
    })),
  ).onConflictDoNothing();

  await db.insert(categories).values(
    seedState.categories.map((category) => ({ ...category, workspaceId: DEMO_WORKSPACE_ID })),
  ).onConflictDoNothing();

  await db.insert(transactions).values(
    seedState.transactions.map((transaction) => ({ ...transaction, workspaceId: DEMO_WORKSPACE_ID })),
  ).onConflictDoNothing();
}

export function stateToRows(state: FinanceState) {
  return {
    accounts: state.accounts.map((account) => ({
      ...account,
      workspaceId: DEMO_WORKSPACE_ID,
      currency: "COP",
    })),
    categories: state.categories.map((category) => ({ ...category, workspaceId: DEMO_WORKSPACE_ID })),
    transactions: state.transactions.map((transaction) => ({ ...transaction, workspaceId: DEMO_WORKSPACE_ID })),
  };
}
