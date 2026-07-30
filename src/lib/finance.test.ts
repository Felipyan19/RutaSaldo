import { describe, expect, it } from "vitest";
import { accountBalance, seedState, totals } from "./finance";

describe("financial calculations", () => {
  it("adds income and subtracts expenses from an account", () => {
    const account = seedState.accounts.find((item) => item.id === "rappi")!;
    expect(accountBalance(account, seedState.transactions)).toBe(4_700_000);
  });

  it("calculates the workspace balance from every account", () => {
    const result = totals(seedState);
    expect(result.balance).toBe(5_759_700);
    expect(result.income).toBe(3_500_000);
    expect(result.expenses).toBe(1_490_300);
  });

  it("does not mutate the source state while calculating totals", () => {
    const snapshot = JSON.stringify(seedState);
    totals(seedState);
    expect(JSON.stringify(seedState)).toBe(snapshot);
  });
});
