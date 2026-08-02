import { describe, expect, it } from "vitest";
import { deriveUpcomingPayments, type Phase2State } from "./phase2";

const state: Phase2State = {
  installmentPlans: [{
    id: "plan-1",
    accountId: "card-1",
    description: "Portátil",
    totalAmount: 300000,
    installmentCount: 3,
    purchaseDate: "2026-06-01",
    installments: [
      { id: "i-1", number: 1, amount: 100000, dueDate: "2026-07-01", status: "paid", paidAt: "2026-07-01" },
      { id: "i-2", number: 2, amount: 100000, dueDate: "2026-07-30", status: "pending", paidAt: null },
      { id: "i-3", number: 3, amount: 100000, dueDate: "2026-09-10", status: "pending", paidAt: null },
    ],
  }],
  debts: [{
    id: "debt-1",
    name: "Crédito educativo",
    creditor: "Entidad",
    originalAmount: 1000000,
    currentBalance: 600000,
    interestRate: 12,
    minimumPayment: 80000,
    paymentDueDay: 31,
    status: "active",
    payments: [],
  }],
};

describe("deriveUpcomingPayments", () => {
  it("combina cuotas y deudas sin incluir cuotas pagadas", () => {
    const payments = deriveUpcomingPayments(state, new Date("2026-08-01T12:00:00"));
    expect(payments).toHaveLength(3);
    expect(payments.map((item) => item.id)).not.toContain("installment:i-1");
  });

  it("mantiene cuotas vencidas y las prioriza", () => {
    const payments = deriveUpcomingPayments(state, new Date("2026-08-01T12:00:00"));
    expect(payments[0]).toMatchObject({ id: "installment:i-2", overdue: true, description: "Cuota vencida" });
  });

  it("usa el último día real para vencimientos 29, 30 o 31", () => {
    const payment = deriveUpcomingPayments(state, new Date("2026-02-01T12:00:00")).find((item) => item.kind === "debt");
    expect(payment?.dueDate).toBe("2026-02-28");
  });

  it("limita el pago sugerido al saldo actual de la deuda", () => {
    const lowBalance = { ...state, debts: [{ ...state.debts[0], currentBalance: 50000 }] };
    const payment = deriveUpcomingPayments(lowBalance, new Date("2026-08-01T12:00:00")).find((item) => item.kind === "debt");
    expect(payment?.amount).toBe(50000);
  });

  it("ordena primero vencidos y luego próximos por fecha", () => {
    const payments = deriveUpcomingPayments(state, new Date("2026-08-01T12:00:00"));
    expect(payments.map((item) => item.id)).toEqual(["installment:i-2", "debt:debt-1", "installment:i-3"]);
  });
});
