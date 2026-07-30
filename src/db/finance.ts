import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "./index";
import { seedWorkspace } from "./seed";
import { accounts, categories, transactions, transfers, workspaces } from "./schema";
import { FinanceState, Transaction, Transfer } from "@/lib/finance";
import { transactionInputSchema, transferInputSchema } from "@/lib/finance-schema";

export async function readFinanceState(workspaceId: string): Promise<FinanceState> {
  const db = getDb();
  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId));
  if (!workspace) await seedWorkspace(db, workspaceId);

  const [workspaceRow] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId));
  const [accountRows, categoryRows, transactionRows, transferRows] = await Promise.all([
    db.select().from(accounts).where(eq(accounts.workspaceId, workspaceId)).orderBy(asc(accounts.name)),
    db.select().from(categories).where(eq(categories.workspaceId, workspaceId)).orderBy(asc(categories.name)),
    db.select().from(transactions).where(eq(transactions.workspaceId, workspaceId)).orderBy(asc(transactions.date)),
    db.select().from(transfers).where(eq(transfers.workspaceId, workspaceId)).orderBy(asc(transfers.date)),
  ]);

  return {
    workspaceName: workspaceRow?.name ?? "Mis finanzas",
    accounts: accountRows.map((account) => ({
      id: account.id,
      name: account.name,
      institution: account.institution,
      kind: account.kind as FinanceState["accounts"][number]["kind"],
      color: account.color,
      openingBalance: account.openingBalance,
    })),
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

async function assertWorkspaceAccounts(tx: DbTransaction, workspaceId: string, accountIds: string[]) {
  const uniqueIds = [...new Set(accountIds)];
  const rows = await tx.select({ id: accounts.id }).from(accounts).where(and(eq(accounts.workspaceId, workspaceId), inArray(accounts.id, uniqueIds)));
  if (rows.length !== uniqueIds.length) throw new Error("Una o más cuentas no pertenecen al workspace.");
}

export async function createTransaction(workspaceId: string, input: Transaction) {
  const parsed = transactionInputSchema.parse(input);
  if (parsed.kind === "transfer") throw new Error("Las transferencias deben crearse con la operación transfer.");
  if (!parsed.categoryId) throw new Error("El movimiento necesita una categoría.");
  if (parsed.transferId || parsed.transferSide) throw new Error("Solo una transferencia puede enlazar movimientos.");
  const categoryId = parsed.categoryId;
  const db = getDb();
  await db.transaction(async (tx) => {
    await assertWorkspaceAccounts(tx, workspaceId, [parsed.accountId]);
    const category = await tx.select({ id: categories.id }).from(categories).where(and(eq(categories.id, categoryId), eq(categories.workspaceId, workspaceId)));
    if (!category.length) throw new Error("La categoría no pertenece al workspace.");
    await tx.insert(transactions).values({ ...parsed, categoryId, workspaceId, transferId: null, transferSide: null });
  });
  return readFinanceState(workspaceId);
}

export async function createTransfer(workspaceId: string, input: Transfer) {
  const parsed = transferInputSchema.parse(input);
  if (parsed.fromAccountId === parsed.toAccountId) throw new Error("Una transferencia necesita cuentas distintas.");
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
  if (parsed.kind === "transfer" || !parsed.categoryId) throw new Error("Las transferencias no se editan como movimientos individuales.");
  if (parsed.transferId || parsed.transferSide) throw new Error("Las transferencias no se editan como movimientos individuales.");
  const categoryId = parsed.categoryId;
  const db = getDb();
  await db.transaction(async (tx) => {
    await assertWorkspaceAccounts(tx, workspaceId, [parsed.accountId]);
    const category = await tx.select({ id: categories.id }).from(categories).where(and(eq(categories.id, categoryId), eq(categories.workspaceId, workspaceId)));
    if (!category.length) throw new Error("La categoría no pertenece al workspace.");
    const [existing] = await tx.select({ id: transactions.id, transferId: transactions.transferId, kind: transactions.kind }).from(transactions).where(and(eq(transactions.id, transactionId), eq(transactions.workspaceId, workspaceId)));
    if (!existing || existing.transferId || !["income", "expense"].includes(existing.kind)) throw new Error("No se pudo actualizar el movimiento.");
    await tx.update(transactions).set({ accountId: parsed.accountId, categoryId, kind: parsed.kind, amount: parsed.amount, description: parsed.description, date: parsed.date }).where(and(eq(transactions.id, transactionId), eq(transactions.workspaceId, workspaceId)));
  });
  return readFinanceState(workspaceId);
}

export async function deleteTransaction(workspaceId: string, transactionId: string) {
  const db = getDb();
  await db.transaction(async (tx) => {
    const [transaction] = await tx.select({ transferId: transactions.transferId }).from(transactions).where(and(eq(transactions.id, transactionId), eq(transactions.workspaceId, workspaceId)));
    if (!transaction) throw new Error("Movimiento no encontrado.");
    if (transaction.transferId) {
      await tx.delete(transfers).where(and(eq(transfers.id, transaction.transferId), eq(transfers.workspaceId, workspaceId)));
    } else {
      await tx.delete(transactions).where(and(eq(transactions.id, transactionId), eq(transactions.workspaceId, workspaceId)));
    }
  });
  return readFinanceState(workspaceId);
}
