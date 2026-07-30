import { z } from "zod";

const id = z.string().trim().min(1).max(120);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido");

export const accountInputSchema = z.object({
  id,
  name: z.string().trim().min(1).max(80),
  institution: z.string().trim().min(1).max(80),
  kind: z.enum(["bank", "wallet", "cash"]),
  color,
  openingBalance: z.number().int().finite().min(-1_000_000_000_000).max(1_000_000_000_000),
});

export const categoryInputSchema = z.object({
  id,
  name: z.string().trim().min(1).max(60),
  color,
  icon: z.string().trim().min(1).max(8),
});

export const transactionInputSchema = z.object({
  id,
  accountId: id,
  categoryId: id,
  kind: z.enum(["income", "expense"]),
  amount: z.number().int().positive().finite().max(1_000_000_000_000),
  description: z.string().trim().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
});

export const financeStateSchema = z.object({
  workspaceName: z.string().trim().min(1).max(80),
  accounts: z.array(accountInputSchema).max(100),
  categories: z.array(categoryInputSchema).max(100),
  transactions: z.array(transactionInputSchema).max(10_000),
}).superRefine((state, context) => {
  const accountIds = new Set(state.accounts.map((account) => account.id));
  const categoryIds = new Set(state.categories.map((category) => category.id));

  if (accountIds.size !== state.accounts.length) {
    context.addIssue({ code: "custom", path: ["accounts"], message: "No puede haber cuentas duplicadas." });
  }
  if (categoryIds.size !== state.categories.length) {
    context.addIssue({ code: "custom", path: ["categories"], message: "No puede haber categorías duplicadas." });
  }

  state.transactions.forEach((transaction, index) => {
    if (!accountIds.has(transaction.accountId)) {
      context.addIssue({ code: "custom", path: ["transactions", index, "accountId"], message: "La cuenta no pertenece al espacio." });
    }
    if (!categoryIds.has(transaction.categoryId)) {
      context.addIssue({ code: "custom", path: ["transactions", index, "categoryId"], message: "La categoría no pertenece al espacio." });
    }
  });
});

export type ValidatedFinanceState = z.infer<typeof financeStateSchema>;
