"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Transaction } from "@/lib/finance";
import { TransactionForm } from "@/components/forms";
import { useFinance } from "./finance-provider";
import { TransactionList } from "./transaction-list";

export function TransactionsPage() {
  const { state, createTransaction } = useFinance();
  const [showForm, setShowForm] = useState(false);
  function addTransaction(transaction: Transaction) { void createTransaction(transaction); setShowForm(false); }
  return <section className="rounded-3xl border border-[#e0e4dd] bg-white p-5 md:p-7"><div className="mb-6 flex items-center justify-between"><div><h2 className="text-2xl font-semibold tracking-tight">Historial</h2><p className="mt-1 text-sm text-[#5e6d63]">{state.transactions.length} movimientos registrados.</p></div><button type="button" onClick={() => setShowForm(true)} disabled={!state.accounts.length} className="flex h-10 items-center gap-2 rounded-xl bg-[#17231e] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><Plus size={16} aria-hidden="true" /> Nuevo</button></div>{!state.accounts.length && <p className="mb-5 rounded-2xl bg-[#fff8ed] p-4 text-sm text-[#704c24]">Agrega una cuenta antes de registrar movimientos.</p>}<TransactionList state={state} />{showForm && <TransactionForm accounts={state.accounts} categories={state.categories} onSave={addTransaction} onClose={() => setShowForm(false)} />}</section>;
}
