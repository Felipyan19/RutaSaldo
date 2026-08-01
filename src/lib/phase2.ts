export type Installment = {
  id: string;
  number: number;
  amount: number;
  dueDate: string;
  status: string;
  paidAt: string | null;
};

export type InstallmentPlan = {
  id: string;
  accountId: string;
  description: string;
  totalAmount: number;
  installmentCount: number;
  purchaseDate: string;
  installments: Installment[];
};

export type DebtPayment = {
  id: string;
  accountId: string;
  amount: number;
  paidAt: string;
};

export type Debt = {
  id: string;
  name: string;
  creditor: string;
  originalAmount: number;
  currentBalance: number;
  interestRate: number;
  minimumPayment: number;
  paymentDueDay: number;
  status: string;
  payments: DebtPayment[];
};

export type Phase2State = {
  installmentPlans: InstallmentPlan[];
  debts: Debt[];
};

export type UpcomingPayment = {
  id: string;
  title: string;
  description: string;
  amount: number;
  dueDate: string;
  kind: "installment" | "debt";
};

function nextMonthlyDate(day: number, from: Date) {
  const safeDay = Math.min(Math.max(day, 1), 28);
  const current = new Date(from.getFullYear(), from.getMonth(), safeDay, 12);
  if (current < from) current.setMonth(current.getMonth() + 1);
  return current.toISOString().slice(0, 10);
}

export function deriveUpcomingPayments(state: Phase2State, now = new Date()): UpcomingPayment[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  const installmentPayments = state.installmentPlans.flatMap((plan) => plan.installments
    .filter((installment) => installment.status === "pending" && new Date(`${installment.dueDate}T12:00:00`) >= today)
    .map((installment) => ({
      id: `installment:${installment.id}`,
      title: `${plan.description} · cuota ${installment.number}/${plan.installmentCount}`,
      description: "Compra a cuotas",
      amount: installment.amount,
      dueDate: installment.dueDate,
      kind: "installment" as const,
    })));

  const debtPayments = state.debts
    .filter((debt) => debt.status === "active" && debt.currentBalance > 0)
    .map((debt) => ({
      id: `debt:${debt.id}`,
      title: debt.name,
      description: debt.creditor,
      amount: Math.min(debt.minimumPayment || debt.currentBalance, debt.currentBalance),
      dueDate: nextMonthlyDate(debt.paymentDueDay, today),
      kind: "debt" as const,
    }));

  return [...installmentPayments, ...debtPayments]
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 12);
}
