import { FinanceState, seedState } from "./finance";

const DATA_KEY = "rutasaldo.finance.v1";

export function loadFinanceState(): FinanceState {
  const raw = localStorage.getItem(DATA_KEY);
  if (!raw) return seedState;
  try {
    return JSON.parse(raw) as FinanceState;
  } catch {
    return seedState;
  }
}

export function saveFinanceState(state: FinanceState) {
  localStorage.setItem(DATA_KEY, JSON.stringify(state));
}

export function resetFinanceState() {
  localStorage.removeItem(DATA_KEY);
}
