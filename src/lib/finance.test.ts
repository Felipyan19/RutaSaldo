import { describe, expect, it } from "vitest";
import { accountBalance, emptyFinanceState, seedState, totals } from "./finance";

describe("financial calculations", () => {
  it("adds income and subtracts expenses from an account", () => {
    const account = seedState.accounts.find((item) => item.id === "primary")!;
    expect(accountBalance(account, seedState.transactions)).toBe(3_600_000);
  });

  it("calculates the workspace balance from every account", () => {
    const result = totals(seedState);
    expect(result.balance).toBe(4_580_000);
    expect(result.income).toBe(2_500_000);
    expect(result.expenses).toBe(1_120_000);
  });

  it("does not mutate the source state while calculating totals", () => {
    const snapshot = JSON.stringify(seedState);
    totals(seedState);
    expect(JSON.stringify(seedState)).toBe(snapshot);
  });

  it("starts a new workspace with no accounts or movements", () => {
    expect(emptyFinanceState.accounts).toHaveLength(0);
    expect(emptyFinanceState.transactions).toHaveLength(0);
    expect(totals(emptyFinanceState)).toEqual({ income: 0, expenses: 0, balance: 0 });
  });

  it("moves money between accounts without changing income or expenses", () => {
    const state = {
      ...emptyFinanceState,
      accounts: [
        { id: "source", name: "Origen", institution: "Banco A", kind: "bank" as const, color: "#123456", openingBalance: 1_000_000 },
        { id: "destination", name: "Destino", institution: "Banco B", kind: "bank" as const, color: "#654321", openingBalance: 0 },
      ],
      transfers: [{ id: "transfer-1", fromAccountId: "source", toAccountId: "destination", amount: 400_000, description: "Ahorro", date: "2026-01-15" }],
      transactions: [
        { id: "transfer-1:out", accountId: "source", categoryId: null, kind: "transfer" as const, amount: 400_000, description: "Ahorro", date: "2026-01-15", transferId: "transfer-1", transferSide: "outgoing" as const },
        { id: "transfer-1:in", accountId: "destination", categoryId: null, kind: "transfer" as const, amount: 400_000, description: "Ahorro", date: "2026-01-15", transferId: "transfer-1", transferSide: "incoming" as const },
      ],
    };

    expect(accountBalance(state.accounts[0], state.transactions)).toBe(600_000);
    expect(accountBalance(state.accounts[1], state.transactions)).toBe(400_000);
    expect(totals(state)).toEqual({ income: 0, expenses: 0, balance: 1_000_000 });
  });
});
