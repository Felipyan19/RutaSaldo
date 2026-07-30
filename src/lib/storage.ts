import { FinanceState } from "./finance";

type TransactionMutation = { type: "transaction"; transaction: FinanceState["transactions"][number] };
type TransferMutation = { type: "transfer"; transfer: FinanceState["transfers"][number] };

export async function loadFinanceState(): Promise<FinanceState> {
  const response = await fetch("/api/finance", { cache: "no-store" });
  if (!response.ok) throw new Error("No se pudo cargar el estado financiero");
  return response.json() as Promise<FinanceState>;
}

export async function saveFinanceState(state: FinanceState): Promise<FinanceState> {
  const response = await fetch("/api/finance", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(state),
  });
  if (!response.ok) throw new Error("No se pudo guardar el estado financiero");
  return response.json() as Promise<FinanceState>;
}

export async function clearFinanceState(): Promise<FinanceState> {
  const response = await fetch("/api/finance", { method: "DELETE" });
  if (!response.ok) throw new Error("No se pudieron limpiar los datos financieros");
  return response.json() as Promise<FinanceState>;
}

async function sendFinanceMutation(body: TransactionMutation | TransferMutation, method = "POST") {
  const response = await fetch("/api/finance", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("No se pudo aplicar el cambio financiero");
  return response.json() as Promise<FinanceState>;
}

export function createFinanceTransaction(transaction: FinanceState["transactions"][number]) {
  return sendFinanceMutation({ type: "transaction", transaction });
}

export function createFinanceTransfer(transfer: FinanceState["transfers"][number]) {
  return sendFinanceMutation({ type: "transfer", transfer });
}

export function updateFinanceTransaction(transaction: FinanceState["transactions"][number]) {
  const { id, ...payload } = transaction;
  return sendFinanceMutation({ type: "transaction", transaction: { id, ...payload } }, "PATCH");
}

export async function deleteFinanceTransaction(transactionId: string) {
  const response = await fetch(`/api/finance?transactionId=${encodeURIComponent(transactionId)}`, { method: "DELETE" });
  if (!response.ok) throw new Error("No se pudo eliminar el movimiento");
  return response.json() as Promise<FinanceState>;
}
