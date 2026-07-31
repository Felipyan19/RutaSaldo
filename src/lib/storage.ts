import { Account, Category, FinanceState } from "./finance";

type AccountMutation = { type: "account"; account: Account };
type CategoryMutation = { type: "category"; category: Category };
type TransactionMutation = { type: "transaction"; transaction: FinanceState["transactions"][number] };
type TransferMutation = { type: "transfer"; transfer: FinanceState["transfers"][number] };
type FinanceMutation = AccountMutation | CategoryMutation | TransactionMutation | TransferMutation;

export async function loadFinanceState(): Promise<FinanceState> {
  const response = await fetch("/api/finance", { cache: "no-store" });
  if (!response.ok) throw new Error("No se pudo cargar el estado financiero");
  return response.json() as Promise<FinanceState>;
}

export async function saveFinanceState(state: FinanceState): Promise<FinanceState> {
  const response = await fetch("/api/finance", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(state) });
  if (!response.ok) throw new Error("No se pudo guardar el estado financiero");
  return response.json() as Promise<FinanceState>;
}

export async function clearFinanceState(): Promise<FinanceState> {
  const response = await fetch("/api/finance", { method: "DELETE" });
  if (!response.ok) throw new Error("No se pudieron limpiar los datos financieros");
  return response.json() as Promise<FinanceState>;
}

async function sendFinanceMutation(body: FinanceMutation, method = "POST", reference?: { transactionId?: string; categoryId?: string }) {
  const response = await fetch("/api/finance", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...body, ...reference }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error ?? "No se pudo aplicar el cambio financiero");
  }
  return response.json() as Promise<FinanceState>;
}

export function createFinanceAccount(account: Account) { return sendFinanceMutation({ type: "account", account }); }
export function createFinanceCategory(category: Category) { return sendFinanceMutation({ type: "category", category }); }
export function createFinanceTransaction(transaction: FinanceState["transactions"][number]) { return sendFinanceMutation({ type: "transaction", transaction }); }
export function createFinanceTransfer(transfer: FinanceState["transfers"][number]) { return sendFinanceMutation({ type: "transfer", transfer }); }

export function updateFinanceCategory(category: Category) {
  const { id, ...payload } = category;
  return sendFinanceMutation({ type: "category", category: { id, ...payload } }, "PATCH", { categoryId: id });
}

export function updateFinanceTransaction(transaction: FinanceState["transactions"][number]) {
  const { id, ...payload } = transaction;
  return sendFinanceMutation({ type: "transaction", transaction: { id, ...payload } }, "PATCH", { transactionId: id });
}

export async function deleteFinanceCategory(categoryId: string) {
  const response = await fetch(`/api/finance?categoryId=${encodeURIComponent(categoryId)}`, { method: "DELETE" });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error ?? "No se pudo eliminar la categoría");
  }
  return response.json() as Promise<FinanceState>;
}

export async function deleteFinanceTransaction(transactionId: string) {
  const response = await fetch(`/api/finance?transactionId=${encodeURIComponent(transactionId)}`, { method: "DELETE" });
  if (!response.ok) throw new Error("No se pudo eliminar el movimiento");
  return response.json() as Promise<FinanceState>;
}
