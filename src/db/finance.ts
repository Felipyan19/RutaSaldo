import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "./index";
import { seedWorkspace } from "./seed";
import { accounts, categories, creditCardDetails, transactions, transfers, workspaces } from "./schema";
import { FinanceState, Transaction, Transfer } from "@/lib/finance";
import { accountInputSchema, transactionInputSchema, transferInputSchema } from "@/lib/finance-schema";

export class FinanceInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FinanceInputError";
  }
}

export async function readFinanceState(workspaceId: string): Promise<FinanceState> {
  const db = getDb();
  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId));
  if (!workspace) await seedWorkspace(db, workspaceId);

  const [workspaceRow] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId));
  const [accountRows, creditCardRows, categoryRows, transactionRows, transferRows] = await Promise.all([
    db.select().from(accounts).where(eq(accounts.workspaceId, workspaceId)).orderBy(asc(accounts.name)),
    db.select().from(creditCardDetails).where(eq(creditCardDetails.workspaceId, workspaceId)),
    db.select().from(categories).where(eq(categories.workspaceId, workspaceId)).orderBy(asc(categories.name)),
    db.select().from(transactions).where(eq(transactions.workspaceId, workspaceId)).orderBy(asc(transactions.date)),
    db.select().from(transfers).where(eq(transfers.workspaceId, workspaceId)).orderBy(asc(transfers.date)),
  ]);

  return {
    workspaceName: workspaceRow?.name ?? "Mis finanzas",
    accounts: accountRows.map((account) => {
      const details = creditCardRows.find((row) => row.accountId === account.id);
      return {
        id: account.id,
        name: account.name,
        institution: account.institution,
        kind: account.kind as FinanceState["accounts"][number]["kind"],
        color: account.color,
        openingBalance: account.openingBalance,
        creditCardDetails: details ? {
          creditLimit: details.creditLimit,
          statementDay: details.statementDay,
          paymentDueDay: details.paymentDueDay,
          lastFourDigits: details.lastFourDigits,
          interestRate: details.interestRateBasisPoints / 100,
        } : null,
      };
    }),
    categories: categoryRows.map((category) => ({
      id: category.id,
      name: category.name,
      color: category.color,
      icon: category.icon,
    })),
    transactions: transactionRows.map((transaction) => ({
      id: transaction.id,
      accountId: transaction.accountId,
      categoryId: transaction.categoryId,
      kind: transaction.kind as FinanceState["transactions"][number]["kind"],
      amount: transaction.amount,
      description: transaction.description,
      date: String(transaction.date),
      transferId: transaction.transferId,
      transferSide: transaction.transferSide as Transaction["transferSide"],
    })),
    transfers: transferRows.map((transfer) => ({
      id: transfer.id,
      fromAccountId: transfer.fromAccountId,
      toAccountId: transfer.toAccountId,
      amount: transfer.amount,
      description: transfer.description,
      date: String(transfer.date),
    })),
  };
}

type DbTransaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

export async function createAccount(workspaceId: string, input: FinanceState["accounts"][number]) {
  const parsed = accountInputSchema.parse(input);
  const db = getDb();

  await db.transaction(async (tx) => {
    const { creditCardDetails: details, ...account } = parsed;
    await tx.insert(accounts).values({ ...account, workspaceId, currency: "COP" });
    if (account.kind === "credit_card" && details) {
      await tx.insert(creditCardDetails).values({
        accountId: account.id,
        workspaceId,
        creditLimit: details.creditLimit,
        statementDay: details.statementDay,
        paymentDueDay: details.paymentDueDay,
        lastFourDigits: details.lastFourDigits,
        interestRateBasisPoints: Math.round(details.interestRate * 100),
      });
    }
  });

  return readFinanceState(workspaceId);
}

async function assertWorkspaceAccounts(tx: DbTransaction, workspaceId: string, accountIds: string[]) {
  const uniqueIds = [...new Set(accountIds)];
  const rows = await tx.select({ id: accounts.id }).from(accounts).where(and(eq(accounts.workspaceId, workspaceId), inArray(accounts.id, uniqueIds)));
  if (rows.length !== uniqueIds.length) throw new FinanceInputError("Una o más cuentas no pertenecen al workspace.");
}

export async function createTransaction(workspaceId: string, input: Transaction) {
  const parsed = transactionInputSchema.parse(input);
  if (parsed.kind === "transfer") throw new FinanceInputError("Las transferencias deben crearse con la operación transfer.");
  if (!parsed.categoryId) throw new FinanceInputError("El movimiento necesita una categoría.");
  if (parsed.transferId || parsed.transferSide) throw new FinanceInputError("Solo una transferencia puede enlazar movimientos.");
  const categoryId = parsed.categoryId;
  const db = getDb();
  await db.transaction(async (tx) => {
    await assertWorkspaceAccounts(tx, workspaceId, [parsed.accountId]);
    const category = await tx.select({ id: categories.id }).from(categories).where(and(eq(categories.id, categoryId), eq(categories.workspaceId, workspaceId)));
    if (!category.length) throw new FinanceInputError("La categoría no pertenece al workspace.");
    await tx.insert(transactions).values({ ...parsed, categoryId, workspaceId, transferId: null, transferSide: null });
  });
  return readFinanceState(workspaceId);
}

export async function createTransfer(workspaceId: string, input: Transfer) {
  const parsed = transferInputSchema.parse(input);
  if (parsed.fromAccountId === parsed.toAccountId) throw new FinanceInputError("Una transferencia necesita cuentas distintas.");
  const db = getDb();
  await db.transaction(async (tx) => {
    await assertWorkspaceAccounts(tx, workspaceId, [parsed.fromAccountId, parsed.toAccountId]);
    await tx.insert(transfers).values({ ...parsed, workspaceId });
    await tx.insert(transactions).values([
      { id: `${parsed.id}:out`, workspaceId, accountId: parsed.fromAccountId, categoryId: null, kind: "transfer", amount: parsed.amount, description: parsed.description, date: parsed.date, transferId: parsed.id, transferSide: "outgoing" },
      { id: `${parsed.id}:in`, workspaceId, accountId: parsed.toAccountId, categoryId: null, kind: "transfer", amount: parsed.amount, description: parsed.description, date: parsed.date, transferId: parsed.id, transferSide: "incoming" },
    ]);
  });
  return readFinanceState(workspaceId);
}

export async function updateTransaction(workspaceId: string, transactionId: string, input: Omit<Transaction, "id">) {
  const parsed = transactionInputSchema.parse({ ...input, id: transactionId });
  if (parsed.kind === "transfer" || !parsed.categoryId) throw new FinanceInputError("Las transferencias no se editan como movimientos individuales.");
  if (parsed.transferId || parsed.transferSide) throw new FinanceInputError("Las transferencias no se editan como movimientos individuales.");
  const categoryId = parsed.categoryId;
  const db = getDb();
  await db.transaction(async (tx) => {
    await assertWorkspaceAccounts(tx, workspaceId, [parsed.accountId]);
    const category = await tx.select({ id: categories.id }).from(categories).where(and(eq(categories.id, categoryId), eq(categories.workspaceId, workspaceId)));
    if (!category.length) throw new FinanceInputError("La categoría no pertenece al workspace.");
    const [existing] = await tx.select({ id: transactions.id, transferId: transactions.transferId, kind: transactions.kind }).from(transactions).where(and(eq(transactions.id, transactionId), eq(transactions.workspaceId, workspaceId)));
    if (!existing || existing.transferId || !["income", "expense"].includes(existing.kind)) throw new FinanceInputError("No se pudo actualizar el movimiento.");
    await tx.update(transactions).set({ accountId: parsed.accountId, categoryId, kind: parsed.kind, amount: parsed.amount, description: parsed.description, date: parsed.date }).where(and(eq(transactions.id, transactionId), eq(transactions.workspaceId, workspaceId)));
  });
  return readFinanceState(workspaceId);
}

export async function deleteTransaction(workspaceId: string, transactionId: string) {
  const db = getDb();
  await db.transaction(async (tx) => {
    const [transaction] = await tx.select({ transferId: transactions.transferId }).from(transactions).where(and(eq(transactions.id, transactionId), eq(transactions.workspaceId, workspaceId)));
    if (!transaction) throw new FinanceInputError("Movimiento no encontrado.");
    if (transaction.transferId) {
      await tx.delete(transfers).where(and(eq(transfers.id, transaction.transferId), eq(transfers.workspaceId, workspaceId)));
    } else {
      await tx.delete(transactions).where(and(eq(transactions.id, transactionId), eq(transactions.workspaceId, workspaceId)));
    }
  });
  return readFinanceState(workspaceId);
}
