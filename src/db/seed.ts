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
    accounts: state.accounts.map(({ creditCardDetails: _details, ...account }) => ({
      ...account,
      workspaceId,
      currency: "COP",
    })),
    creditCardDetails: state.accounts.flatMap((account) => {
      const details = account.creditCardDetails;
      if (account.kind !== "credit_card" || !details) return [];
      return [{
        accountId: account.id,
        workspaceId,
        creditLimit: details.creditLimit,
        statementDay: details.statementDay,
        paymentDueDay: details.paymentDueDay,
        lastFourDigits: details.lastFourDigits,
        interestRateBasisPoints: Math.round(details.interestRate * 100),
      }];
    }),
    categories: state.categories.map((category) => ({ ...category, workspaceId })),
    transfers: state.transfers.map((transfer) => ({ ...transfer, workspaceId })),
    transactions: state.transactions.map((transaction) => ({ ...transaction, workspaceId })),
  };
}
