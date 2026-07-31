import { describe, expect, it } from "vitest";
import { financeStateSchema } from "./finance-schema";

const baseState = {
  workspaceName: "Mis finanzas",
  accounts: [
    { id: "source", name: "Origen", institution: "Banco A", kind: "bank", color: "#123456", openingBalance: 1_000_000 },
    { id: "destination", name: "Destino", institution: "Banco B", kind: "bank", color: "#654321", openingBalance: 0 },
  ],
  categories: [{ id: "other", name: "Otros", color: "#8d9690", icon: "•" }],
  transfers: [{ id: "transfer-1", fromAccountId: "source", toAccountId: "destination", amount: 400_000, description: "Ahorro", date: "2026-01-15" }],
  transactions: [
    { id: "transfer-1:out", accountId: "source", categoryId: null, kind: "transfer", amount: 400_000, description: "Ahorro", date: "2026-01-15", transferId: "transfer-1", transferSide: "outgoing" },
    { id: "transfer-1:in", accountId: "destination", categoryId: null, kind: "transfer", amount: 400_000, description: "Ahorro", date: "2026-01-15", transferId: "transfer-1", transferSide: "incoming" },
  ],
};

describe("finance state transfer validation", () => {
  it("accepts an account with both income and expense movements", () => {
    const result = financeStateSchema.safeParse({
      ...baseState,
      transfers: [],
      transactions: [
        { id: "income-1", accountId: "source", categoryId: "other", kind: "income", amount: 2_000_000, description: "Nómina", date: "2026-01-10" },
        { id: "expense-1", accountId: "source", categoryId: "other", kind: "expense", amount: 250_000, description: "Mercado", date: "2026-01-11" },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("accepts a transfer pair without a category", () => {
    expect(financeStateSchema.safeParse(baseState).success).toBe(true);
  });

  it("rejects a transfer that points to the same account", () => {
    const result = financeStateSchema.safeParse({
      ...baseState,
      transfers: [{ ...baseState.transfers[0], toAccountId: "source" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an income without a category", () => {
    const result = financeStateSchema.safeParse({
      ...baseState,
      transfers: [],
      transactions: [{ ...baseState.transactions[0], kind: "income", categoryId: null, transferId: null, transferSide: null }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a transfer without both ledger legs", () => {
    const result = financeStateSchema.safeParse({
      ...baseState,
      transactions: [baseState.transactions[0]],
    });
    expect(result.success).toBe(false);
  });
});
