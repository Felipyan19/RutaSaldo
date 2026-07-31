"use client";

import { useFinance } from "./finance-provider";
import { TransactionList } from "./transaction-list";

export function TransactionsPage() {
  const { state } = useFinance();
  const activityCount = state.transactions.filter((transaction) => transaction.kind !== "transfer").length + state.transfers.length;

  return <section className="rounded-3xl border border-[#e0e4dd] bg-white p-5 md:p-7">
    <div className="mb-6">
      <h2 className="text-2xl font-semibold tracking-tight">Historial</h2>
      <p className="mt-1 text-sm text-[#5e6d63]">{activityCount} movimientos registrados. Usa el botón + del encabezado para agregar uno nuevo.</p>
    </div>
    {!state.accounts.length && <p className="mb-5 rounded-2xl bg-[#fff8ed] p-4 text-sm text-[#704c24]">Agrega una cuenta antes de registrar movimientos.</p>}
    <TransactionList state={state} />
  </section>;
}
