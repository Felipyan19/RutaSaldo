"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { clearFinanceState, createFinanceAccount, createFinanceCategory, createFinanceTransaction, createFinanceTransfer, deleteFinanceCategory, loadFinanceState, saveFinanceState, updateFinanceCategory } from "@/lib/storage";
import { Account, Category, emptyFinanceState, FinanceState, Transaction, Transfer } from "@/lib/finance";

export const FINANCE_ACTION_HISTORY_KEY = "rutasaldo:finance-action-history";

type FinanceActionHistoryItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  createdAt: string;
  action: "account" | "category" | "income" | "expense" | "transfer" | "clear";
};

type FinanceContextValue = {
  state: FinanceState;
  error: string | null;
  saving: boolean;
  refreshState: () => Promise<void>;
  updateState: (next: FinanceState) => Promise<void>;
  createAccount: (account: Account) => Promise<void>;
  createCategory: (category: Category) => Promise<boolean>;
  updateCategory: (category: Category) => Promise<boolean>;
  deleteCategory: (categoryId: string) => Promise<boolean>;
  createTransaction: (transaction: Transaction) => Promise<void>;
  createTransfer: (transfer: Transfer) => Promise<void>;
  clearState: () => Promise<void>;
};

const FinanceContext = createContext<FinanceContextValue | null>(null);

function recordAction(item: Omit<FinanceActionHistoryItem, "createdAt">) {
  try {
    const stored = window.localStorage.getItem(FINANCE_ACTION_HISTORY_KEY);
    const previous = stored ? JSON.parse(stored) as FinanceActionHistoryItem[] : [];
    const next = [{ ...item, createdAt: new Date().toISOString() }, ...previous.filter((entry) => entry.id !== item.id)].slice(0, 40);
    window.localStorage.setItem(FINANCE_ACTION_HISTORY_KEY, JSON.stringify(next));
  } catch {}
}

export function FinanceProvider({ initialState, children }: { initialState: FinanceState; children: React.ReactNode }) {
  const [state, setState] = useState(initialState ?? emptyFinanceState);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    function dismissOpenPopover(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      const openTrigger = document.querySelector<HTMLElement>('[aria-haspopup="menu"][aria-expanded="true"]');
      const openMenu = document.querySelector<HTMLElement>('[role="menu"]');
      if (!openTrigger || !openMenu || openTrigger.contains(target) || openMenu.contains(target)) return;
      openTrigger.click();
    }
    document.addEventListener("pointerdown", dismissOpenPopover, true);
    return () => document.removeEventListener("pointerdown", dismissOpenPopover, true);
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast((current) => current === message ? null : current), 3800);
  }, []);

  const refreshState = useCallback(async () => {
    try { setState(await loadFinanceState()); setError(null); }
    catch { setError("La operación se guardó, pero no se pudo actualizar el resumen."); }
  }, []);

  const updateState = useCallback(async (next: FinanceState) => {
    setState(next); setSaving(true);
    try { setState(await saveFinanceState(next)); setError(null); showToast("Cambios guardados correctamente"); }
    catch { setError("El cambio se mostró localmente, pero no pudo guardarse en Neon."); }
    finally { setSaving(false); }
  }, [showToast]);

  const clearState = useCallback(async () => {
    setSaving(true);
    try {
      setState(await clearFinanceState()); setError(null);
      recordAction({ id: crypto.randomUUID(), title: "Datos financieros limpiados", description: "Se eliminaron cuentas y movimientos del workspace.", href: "/resumen", action: "clear" });
      showToast("Datos financieros limpiados");
    } catch { setError("No se pudieron limpiar los datos financieros."); }
    finally { setSaving(false); }
  }, [showToast]);

  const createAccountMutation = useCallback(async (account: Account) => {
    setSaving(true);
    try {
      setState(await createFinanceAccount(account)); setError(null);
      recordAction({ id: `account:${account.id}`, title: account.kind === "credit_card" ? "Tarjeta creada" : "Cuenta creada", description: `${account.institution} · ${account.name}`, href: "/cuentas", action: "account" });
      showToast(account.kind === "credit_card" ? "Tarjeta creada correctamente" : "Cuenta creada correctamente");
    } catch { setError("No se pudo guardar la cuenta en Neon."); }
    finally { setSaving(false); }
  }, [showToast]);

  const createCategoryMutation = useCallback(async (category: Category) => {
    setSaving(true);
    try {
      setState(await createFinanceCategory(category)); setError(null);
      recordAction({ id: `category:${category.id}`, title: "Categoría creada", description: `${category.icon} ${category.name}`, href: "/categorias", action: "category" });
      showToast("Categoría creada correctamente"); return true;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo crear la categoría."); return false; }
    finally { setSaving(false); }
  }, [showToast]);

  const updateCategoryMutation = useCallback(async (category: Category) => {
    setSaving(true);
    try {
      setState(await updateFinanceCategory(category)); setError(null);
      recordAction({ id: `category-update:${category.id}:${Date.now()}`, title: "Categoría actualizada", description: `${category.icon} ${category.name}`, href: "/categorias", action: "category" });
      showToast("Categoría actualizada correctamente"); return true;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo actualizar la categoría."); return false; }
    finally { setSaving(false); }
  }, [showToast]);

  const deleteCategoryMutation = useCallback(async (categoryId: string) => {
    setSaving(true);
    try {
      const category = state.categories.find((item) => item.id === categoryId);
      setState(await deleteFinanceCategory(categoryId)); setError(null);
      recordAction({ id: `category-delete:${categoryId}:${Date.now()}`, title: "Categoría eliminada", description: category?.name ?? "Categoría", href: "/categorias", action: "category" });
      showToast("Categoría eliminada"); return true;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo eliminar la categoría."); return false; }
    finally { setSaving(false); }
  }, [showToast, state.categories]);

  const createTransactionMutation = useCallback(async (transaction: Transaction) => {
    setSaving(true);
    try {
      setState(await createFinanceTransaction(transaction)); setError(null);
      const isIncome = transaction.kind === "income";
      recordAction({ id: `transaction:${transaction.id}`, title: isIncome ? "Ingreso registrado" : "Gasto registrado", description: transaction.description, href: "/movimientos", action: isIncome ? "income" : "expense" });
      showToast(isIncome ? "Ingreso registrado correctamente" : "Gasto registrado correctamente");
    } catch { setError("No se pudo guardar el movimiento en Neon."); }
    finally { setSaving(false); }
  }, [showToast]);

  const createTransferMutation = useCallback(async (transfer: Transfer) => {
    setSaving(true);
    try {
      setState(await createFinanceTransfer(transfer)); setError(null);
      recordAction({ id: `transfer:${transfer.id}`, title: "Transferencia realizada", description: transfer.description, href: "/movimientos", action: "transfer" });
      showToast("Transferencia realizada correctamente");
    } catch { setError("No se pudo guardar la transferencia en Neon."); }
    finally { setSaving(false); }
  }, [showToast]);

  const value = useMemo(() => ({ state, error, saving, refreshState, updateState, createAccount: createAccountMutation, createCategory: createCategoryMutation, updateCategory: updateCategoryMutation, deleteCategory: deleteCategoryMutation, createTransaction: createTransactionMutation, createTransfer: createTransferMutation, clearState }), [state, error, saving, refreshState, updateState, createAccountMutation, createCategoryMutation, updateCategoryMutation, deleteCategoryMutation, createTransactionMutation, createTransferMutation, clearState]);

  return <FinanceContext.Provider value={value}>{children}{toast && <div className="fixed bottom-5 left-1/2 z-[80] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-3 rounded-2xl border border-[#d7e1d9] bg-[#fbfcf8] px-4 py-3 text-sm text-[#18241e] shadow-[0_18px_50px_rgba(23,35,30,.18)]" role="status" aria-live="polite"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e4f2e8] text-[#3f7258]"><CheckCircle2 size={18} aria-hidden="true" /></span><span className="min-w-0 flex-1 font-semibold">{toast}</span><button type="button" onClick={() => setToast(null)} aria-label="Cerrar confirmación" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#65726a] hover:bg-[#edf0eb]"><X size={16} aria-hidden="true" /></button></div>}</FinanceContext.Provider>;
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) throw new Error("useFinance debe usarse dentro de FinanceProvider");
  return context;
}
