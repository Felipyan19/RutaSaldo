import { z } from "zod";

const id = z.string().trim().min(1).max(120);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido");

const creditCardDetailsSchema = z.object({
  creditLimit: z.number().int().positive().finite().max(1_000_000_000_000),
  statementDay: z.number().int().min(1).max(31),
  paymentDueDay: z.number().int().min(1).max(31),
  lastFourDigits: z.string().regex(/^\d{4}$/, "Deben ser cuatro dígitos").nullable(),
  interestRate: z.number().finite().min(0).max(500),
});

export const transferInputSchema = z.object({
  id,
  fromAccountId: id,
  toAccountId: id,
  amount: z.number().int().positive().finite().max(1_000_000_000_000),
  description: z.string().trim().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
});

export const accountInputSchema = z.object({
  id,
  name: z.string().trim().min(1).max(80),
  institution: z.string().trim().min(1).max(80),
  kind: z.enum(["bank", "wallet", "cash", "credit_card"]),
  color,
  openingBalance: z.number().int().finite().min(-1_000_000_000_000).max(1_000_000_000_000),
  creditCardDetails: creditCardDetailsSchema.nullable().optional(),
}).superRefine((account, context) => {
  if (account.kind === "credit_card") {
    if (!account.creditCardDetails) context.addIssue({ code: "custom", path: ["creditCardDetails"], message: "La tarjeta necesita sus datos de crédito." });
    if (account.openingBalance > 0) context.addIssue({ code: "custom", path: ["openingBalance"], message: "La deuda inicial de una tarjeta no puede ser positiva." });
  } else if (account.creditCardDetails) {
    context.addIssue({ code: "custom", path: ["creditCardDetails"], message: "Solo las tarjetas pueden tener datos de crédito." });
  }
});

export const categoryInputSchema = z.object({
  id,
  name: z.string().trim().min(1).max(60),
  color,
  icon: z.string().trim().min(1).max(24),
});

export const transactionInputSchema = z.object({
  id,
  accountId: id,
  categoryId: id.nullable(),
  kind: z.enum(["income", "expense", "transfer"]),
  amount: z.number().int().positive().finite().max(1_000_000_000_000),
  description: z.string().trim().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  transferId: id.nullable().optional(),
  transferSide: z.enum(["outgoing", "incoming"]).nullable().optional(),
});

export const financeStateSchema = z.object({
  workspaceName: z.string().trim().min(1).max(80),
  accounts: z.array(accountInputSchema).max(100),
  categories: z.array(categoryInputSchema).max(100),
  transactions: z.array(transactionInputSchema).max(10_000),
  transfers: z.array(transferInputSchema).max(5_000).default([]),
}).superRefine((state, context) => {
  const accountIds = new Set(state.accounts.map((account) => account.id));
  const categoryIds = new Set(state.categories.map((category) => category.id));
  const transferIds = new Set(state.transfers.map((transfer) => transfer.id));

  if (accountIds.size !== state.accounts.length) context.addIssue({ code: "custom", path: ["accounts"], message: "No puede haber cuentas duplicadas." });
  if (categoryIds.size !== state.categories.length) context.addIssue({ code: "custom", path: ["categories"], message: "No puede haber categorías duplicadas." });
  if (transferIds.size !== state.transfers.length) context.addIssue({ code: "custom", path: ["transfers"], message: "No puede haber transferencias duplicadas." });

  state.transfers.forEach((transfer, index) => {
    if (!accountIds.has(transfer.fromAccountId)) context.addIssue({ code: "custom", path: ["transfers", index, "fromAccountId"], message: "La cuenta de origen no pertenece al espacio." });
    if (!accountIds.has(transfer.toAccountId)) context.addIssue({ code: "custom", path: ["transfers", index, "toAccountId"], message: "La cuenta de destino no pertenece al espacio." });
    if (transfer.fromAccountId === transfer.toAccountId) context.addIssue({ code: "custom", path: ["transfers", index, "toAccountId"], message: "Una transferencia necesita cuentas distintas." });
  });

  state.transactions.forEach((transaction, index) => {
    if (!accountIds.has(transaction.accountId)) context.addIssue({ code: "custom", path: ["transactions", index, "accountId"], message: "La cuenta no pertenece al espacio." });
    if (transaction.categoryId && !categoryIds.has(transaction.categoryId)) context.addIssue({ code: "custom", path: ["transactions", index, "categoryId"], message: "La categoría no pertenece al espacio." });
    if (transaction.kind === "transfer") {
      if (!transaction.transferId || !transferIds.has(transaction.transferId)) context.addIssue({ code: "custom", path: ["transactions", index, "transferId"], message: "La transferencia enlazada no existe en el espacio." });
      if (!transaction.transferSide) context.addIssue({ code: "custom", path: ["transactions", index, "transferSide"], message: "El movimiento transferido debe indicar su lado." });
      if (transaction.categoryId !== null) context.addIssue({ code: "custom", path: ["transactions", index, "categoryId"], message: "Las transferencias no usan categorías." });
    } else if (transaction.transferId || transaction.transferSide) {
      context.addIssue({ code: "custom", path: ["transactions", index, "transferId"], message: "Solo los movimientos de tipo transferencia pueden enlazarse." });
    } else if (transaction.categoryId === null) {
      context.addIssue({ code: "custom", path: ["transactions", index, "categoryId"], message: "Los ingresos y gastos necesitan una categoría." });
    }
  });

  state.transfers.forEach((transfer, index) => {
    const legs = state.transactions.filter((transaction) => transaction.transferId === transfer.id);
    const outgoing = legs.find((transaction) => transaction.transferSide === "outgoing");
    const incoming = legs.find((transaction) => transaction.transferSide === "incoming");
    if (legs.length !== 2 || !outgoing || !incoming) {
      context.addIssue({ code: "custom", path: ["transfers", index], message: "Cada transferencia debe tener una salida y una entrada." });
      return;
    }
    if (outgoing.accountId !== transfer.fromAccountId || incoming.accountId !== transfer.toAccountId) context.addIssue({ code: "custom", path: ["transfers", index], message: "Las cuentas de los movimientos no coinciden con la transferencia." });
    if (outgoing.amount !== transfer.amount || incoming.amount !== transfer.amount) context.addIssue({ code: "custom", path: ["transfers", index], message: "Los importes de la transferencia deben coincidir." });
  });
});

export type ValidatedFinanceState = z.infer<typeof financeStateSchema>;
