import { FinanceState, seedState } from "@/lib/finance";
import { categories, workspaces } from "./schema";

function categoryRows(workspaceId: string) {
  return seedState.categories.map((category) => ({
    ...category,
    id: `${workspaceId}:${category.id}`,
    workspaceId,
  }));
}

export async function seedWorkspace(db: ReturnType<typeof import("./index").getDb>, workspaceId: string) {
  await db.insert(workspaces).values({
    id: workspaceId,
    name: "Mis finanzas",
  }).onConflictDoNothing();

  // New workspaces start empty. Categories are only templates for future movements.
  await db.insert(categories).values(categoryRows(workspaceId)).onConflictDoNothing();
}

export function stateToRows(state: FinanceState, workspaceId: string) {
  return {
    accounts: state.accounts.map((account) => ({
      ...account,
      workspaceId,
      currency: "COP",
    })),
    categories: state.categories.map((category) => ({ ...category, workspaceId })),
    transfers: state.transfers.map((transfer) => ({ ...transfer, workspaceId })),
    transactions: state.transactions.map((transaction) => ({ ...transaction, workspaceId })),
  };
}
