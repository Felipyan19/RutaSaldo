"use client";

import { useState } from "react";
import { ArrowRightLeft, Plus } from "lucide-react";
import { Transaction, Transfer } from "@/lib/finance";
import { TransactionForm, TransferForm } from "@/components/forms";
import { useFinance } from "./finance-provider";
import { TransactionList } from "./transaction-list";

export function TransactionsPage() {
  const { state, createTransaction, createTransfer } = useFinance();
  const activityCount = state.transactions.filter((transaction) => transaction.kind !== "transfer").length + state.transfers.length;
  const [modal, setModal] = useState<"transaction" | "transfer" | null>(null);
  function addTransaction(transaction: Transaction) { void createTransaction(transaction); setModal(null); }
  function addTransfer(transfer: Transfer) { void createTransfer(transfer); setModal(null); }
  return <section className="rounded-3xl border border-[#e0e4dd] bg-white p-5 md:p-7"><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-semibold tracking-tight">Historial</h2><p className="mt-1 text-sm text-[#5e6d63]">{activityCount} movimientos registrados.</p></div><div className="flex gap-2"><button type="button" onClick={() => setModal("transfer")} disabled={state.accounts.length < 2} className="flex h-10 items-center gap-2 rounded-xl border border-[#ccd4cd] bg-white px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"><ArrowRightLeft size={16} aria-hidden="true" /> Transferir</button><button type="button" onClick={() => setModal("transaction")} disabled={!state.accounts.length} className="flex h-10 items-center gap-2 rounded-xl bg-[#17231e] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><Plus size={16} aria-hidden="true" /> Nuevo</button></div></div>{!state.accounts.length && <p className="mb-5 rounded-2xl bg-[#fff8ed] p-4 text-sm text-[#704c24]">Agrega una cuenta antes de registrar movimientos.</p>}<TransactionList state={state} />{modal === "transaction" && <TransactionForm accounts={state.accounts} categories={state.categories} onSave={addTransaction} onClose={() => setModal(null)} />}{modal === "transfer" && <TransferForm accounts={state.accounts} onSave={addTransfer} onClose={() => setModal(null)} />}</section>;
}
