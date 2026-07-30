import { FinanceState } from "./finance";

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

export async function resetFinanceState(): Promise<FinanceState> {
  const response = await fetch("/api/finance", { method: "DELETE" });
  if (!response.ok) throw new Error("No se pudieron restaurar los datos demo");
  return response.json() as Promise<FinanceState>;
}
