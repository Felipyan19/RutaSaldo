import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "./index";
import { accounts, categories, debtPayments, debts, installmentPlans, installments, transactions, transfers } from "./schema";
import { FinanceInputError } from "./finance";

function addMonths(date: string, months: number) {
  const [year, month, day] = date.split("-").map(Number);
  const targetMonthIndex = month - 1 + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetYear, normalizedMonth, Math.min(day, lastDay), 12)).toISOString().slice(0, 10);
}

export async function readPhase2State(workspaceId: string) {
  const db = getDb();
  const [plans, installmentRows, debtRows, paymentRows] = await Promise.all([
    db.select().from(installmentPlans).where(eq(installmentPlans.workspaceId, workspaceId)).orderBy(desc(installmentPlans.purchaseDate)),
    db.select().from(installments).where(eq(installments.workspaceId, workspaceId)).orderBy(asc(installments.dueDate)),
    db.select().from(debts).where(eq(debts.workspaceId, workspaceId)).orderBy(desc(debts.createdAt)),
    db.select().from(debtPayments).where(eq(debtPayments.workspaceId, workspaceId)).orderBy(desc(debtPayments.paidAt)),
  ]);
  return {
    installmentPlans: plans.map((plan) => ({ ...plan, purchaseDate: String(plan.purchaseDate), installments: installmentRows.filter((item) => item.planId === plan.id).map((item) => ({ ...item, dueDate: String(item.dueDate), paidAt: item.paidAt ? String(item.paidAt) : null })) })),
    debts: debtRows.map((debt) => ({ ...debt, interestRate: debt.interestRateBasisPoints / 100, payments: paymentRows.filter((payment) => payment.debtId === debt.id).map((payment) => ({ ...payment, paidAt: String(payment.paidAt) })) })),
  };
}

export async function createInstallmentPurchase(workspaceId: string, input: { id: string; accountId: string; categoryId: string; description: string; totalAmount: number; installmentCount: number; purchaseDate: string }) {
  const db = getDb();
  await db.transaction(async (tx) => {
    const [account] = await tx.select().from(accounts).where(and(eq(accounts.id, input.accountId), eq(accounts.workspaceId, workspaceId)));
    if (!account || account.kind !== "credit_card") throw new FinanceInputError("La compra a cuotas debe registrarse en una tarjeta de crédito.");
    const [category] = await tx.select().from(categories).where(and(eq(categories.id, input.categoryId), eq(categories.workspaceId, workspaceId)));
    if (!category) throw new FinanceInputError("La categoría no pertenece al workspace.");
    const transactionId = `${input.id}:purchase`;
    await tx.insert(transactions).values({ id: transactionId, workspaceId, accountId: input.accountId, categoryId: input.categoryId, kind: "expense", amount: input.totalAmount, description: input.description, date: input.purchaseDate, transferId: null, transferSide: null });
    await tx.insert(installmentPlans).values({ id: input.id, workspaceId, transactionId, accountId: input.accountId, description: input.description, totalAmount: input.totalAmount, installmentCount: input.installmentCount, purchaseDate: input.purchaseDate });
    const base = Math.floor(input.totalAmount / input.installmentCount);
    const remainder = input.totalAmount - base * input.installmentCount;
    await tx.insert(installments).values(Array.from({ length: input.installmentCount }, (_, index) => ({ id: `${input.id}:${index + 1}`, workspaceId, planId: input.id, number: index + 1, amount: base + (index === input.installmentCount - 1 ? remainder : 0), dueDate: addMonths(input.purchaseDate, index + 1), status: "pending" })));
  });
  return readPhase2State(workspaceId);
}

export async function setInstallmentPayment(workspaceId: string, input: { installmentId: string; paid: boolean; paidAt?: string }) {
  const db = getDb();
  const [installment] = await db.select().from(installments).where(and(eq(installments.id, input.installmentId), eq(installments.workspaceId, workspaceId)));
  if (!installment) throw new FinanceInputError("La cuota no pertenece al workspace.");
  await db.update(installments).set({ status: input.paid ? "paid" : "pending", paidAt: input.paid ? (input.paidAt ?? new Date().toISOString().slice(0, 10)) : null }).where(and(eq(installments.id, input.installmentId), eq(installments.workspaceId, workspaceId)));
  return readPhase2State(workspaceId);
}

export async function createDebt(workspaceId: string, input: { id: string; name: string; creditor: string; amount: number; interestRate: number; minimumPayment: number; paymentDueDay: number }) {
  const db = getDb();
  await db.insert(debts).values({ id: input.id, workspaceId, name: input.name, creditor: input.creditor, originalAmount: input.amount, currentBalance: input.amount, interestRateBasisPoints: Math.round(input.interestRate * 100), minimumPayment: input.minimumPayment, paymentDueDay: input.paymentDueDay, status: "active" });
  return readPhase2State(workspaceId);
}

export async function payDebt(workspaceId: string, input: { id: string; debtId: string; accountId: string; amount: number; paidAt: string }) {
  const db = getDb();
  await db.transaction(async (tx) => {
    const [debt] = await tx.select().from(debts).where(and(eq(debts.id, input.debtId), eq(debts.workspaceId, workspaceId)));
    const [account] = await tx.select().from(accounts).where(and(eq(accounts.id, input.accountId), eq(accounts.workspaceId, workspaceId)));
    if (!debt || !account) throw new FinanceInputError("La deuda o la cuenta no pertenece al workspace.");
    if (input.amount > debt.currentBalance) throw new FinanceInputError("El abono supera el saldo de la deuda.");
    const transactionId = `${input.id}:payment`;
    await tx.insert(transactions).values({ id: transactionId, workspaceId, accountId: input.accountId, categoryId: null, kind: "debt_payment", amount: input.amount, description: `Abono a ${debt.name}`, date: input.paidAt, transferId: null, transferSide: null });
    await tx.insert(debtPayments).values({ id: input.id, workspaceId, debtId: input.debtId, accountId: input.accountId, transactionId, amount: input.amount, paidAt: input.paidAt });
    const remaining = debt.currentBalance - input.amount;
    await tx.update(debts).set({ currentBalance: remaining, status: remaining === 0 ? "paid" : "active" }).where(and(eq(debts.id, debt.id), eq(debts.workspaceId, workspaceId)));
  });
  return readPhase2State(workspaceId);
}

export async function reconcileTransactions(workspaceId: string, input: { id: string; outgoingTransactionId: string; incomingTransactionId: string; description?: string }) {
  const db = getDb();
  await db.transaction(async (tx) => {
    const rows = await tx.select().from(transactions).where(and(eq(transactions.workspaceId, workspaceId), inArray(transactions.id, [input.outgoingTransactionId, input.incomingTransactionId])));
    const outgoing = rows.find((row) => row.id === input.outgoingTransactionId);
    const incoming = rows.find((row) => row.id === input.incomingTransactionId);
    if (!outgoing || !incoming || outgoing.kind !== "expense" || incoming.kind !== "income") throw new FinanceInputError("Selecciona un gasto y un ingreso sin conciliar.");
    if (outgoing.amount !== incoming.amount || outgoing.accountId === incoming.accountId) throw new FinanceInputError("Los movimientos deben tener el mismo valor y cuentas diferentes.");
    const description = input.description?.trim() || outgoing.description;
    await tx.insert(transfers).values({ id: input.id, workspaceId, fromAccountId: outgoing.accountId, toAccountId: incoming.accountId, amount: outgoing.amount, description, date: outgoing.date });
    await tx.update(transactions).set({ kind: "transfer", categoryId: null, transferId: input.id, transferSide: "outgoing", description }).where(eq(transactions.id, outgoing.id));
    await tx.update(transactions).set({ kind: "transfer", categoryId: null, transferId: input.id, transferSide: "incoming", description }).where(eq(transactions.id, incoming.id));
  });
  return readPhase2State(workspaceId);
}
