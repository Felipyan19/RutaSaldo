"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { clearFinanceState, createFinanceAccount, createFinanceTransaction, saveFinanceState } from "@/lib/storage";
import { Account, emptyFinanceState, FinanceState, Transaction } from "@/lib/finance";

type FinanceContextValue = {
  state: FinanceState;
  error: string | null;
  saving: boolean;
  updateState: (next: FinanceState) => Promise<void>;
  createAccount: (account: Account) => Promise<void>;
  createTransaction: (transaction: Transaction) => Promise<void>;
  clearState: () => Promise<void>;
};

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ initialState, children }: { initialState: FinanceState; children: React.ReactNode }) {
  const [state, setState] = useState(initialState ?? emptyFinanceState);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const updateState = useCallback(async (next: FinanceState) => {
    setState(next);
    setSaving(true);
    try {
      setState(await saveFinanceState(next));
      setError(null);
    } catch {
      setError("El cambio se mostró localmente, pero no pudo guardarse en Neon.");
    } finally {
      setSaving(false);
    }
  }, []);

  const clearState = useCallback(async () => {
    setSaving(true);
    try {
      setState(await clearFinanceState());
      setError(null);
    } catch {
      setError("No se pudieron limpiar los datos financieros.");
    } finally {
      setSaving(false);
    }
  }, []);

  const createAccountMutation = useCallback(async (account: Account) => {
    setSaving(true);
    try {
      setState(await createFinanceAccount(account));
      setError(null);
    } catch {
      setError("No se pudo guardar la cuenta en Neon.");
    } finally {
      setSaving(false);
    }
  }, []);

  const createTransactionMutation = useCallback(async (transaction: Transaction) => {
    setSaving(true);
    try {
      setState(await createFinanceTransaction(transaction));
      setError(null);
    } catch {
      setError("No se pudo guardar el movimiento en Neon.");
    } finally {
      setSaving(false);
    }
  }, []);

  const value = useMemo(() => ({ state, error, saving, updateState, createAccount: createAccountMutation, createTransaction: createTransactionMutation, clearState }), [state, error, saving, updateState, createAccountMutation, createTransactionMutation, clearState]);
  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) throw new Error("useFinance debe usarse dentro de FinanceProvider");
  return context;
}
