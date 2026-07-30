"use client";

import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { FinanceState, formatCOP } from "@/lib/finance";

export function TransactionList({ state, limit }: { state: FinanceState; limit?: number }) {
  const items = [...state.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
  if (!items.length) return <p className="rounded-2xl border border-dashed border-[#cbd5cc] p-6 text-center text-sm text-[#5e6d63]">Aún no tienes movimientos registrados.</p>;

  return <div className="divide-y divide-[#edf0eb]">{items.map((transaction) => {
    const category = state.categories.find((item) => item.id === transaction.categoryId);
    const account = state.accounts.find((item) => item.id === transaction.accountId);
    const income = transaction.kind === "income";
    return <div key={transaction.id} className="flex items-center gap-3 py-4 first:pt-0 last:pb-0">
      <span aria-hidden="true" className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${income ? "bg-[#e0eee5] text-[#3f795e]" : "bg-[#f2e9df] text-[#a56339]"}`}>{income ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}</span>
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{transaction.description}</p><p className="mt-0.5 truncate text-xs text-[#5e6d63]">{category?.name ?? "Sin categoría"} · {account?.institution ?? "Cuenta eliminada"}</p></div>
      <div className="text-right"><p className={`text-sm font-semibold ${income ? "text-[#3f795e]" : ""}`}>{income ? "+" : "−"}{formatCOP(transaction.amount)}</p><p className="mt-0.5 text-[10px] text-[#5e6d63]">{new Date(`${transaction.date}T12:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}</p></div>
    </div>;
  })}</div>;
}
