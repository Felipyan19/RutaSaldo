"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useFinance } from "./finance-provider";
import { TransactionList } from "./transaction-list";

const controlClass = "h-10 rounded-xl border border-[#dce1da] bg-white px-3 text-sm outline-none focus:border-[#526b5e] focus:ring-2 focus:ring-[#526b5e]/10";

export function TransactionsPage() {
  const { state } = useFinance();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [accountId, setAccountId] = useState("all");
  const [categoryId, setCategoryId] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const allVisible = state.transactions.filter((item) => item.kind !== "transfer" || item.transferSide === "outgoing");
  const filteredTransactions = useMemo(() => allVisible.filter((transaction) => {
    if (query && !transaction.description.toLowerCase().includes(query.toLowerCase())) return false;
    if (kind !== "all" && transaction.kind !== kind) return false;
    if (accountId !== "all" && transaction.accountId !== accountId) return false;
    if (categoryId !== "all" && transaction.categoryId !== categoryId) return false;
    if (fromDate && transaction.date < fromDate) return false;
    if (toDate && transaction.date > toDate) return false;
    return true;
  }), [allVisible, query, kind, accountId, categoryId, fromDate, toDate]);

  const activeFilters = [kind !== "all", accountId !== "all", categoryId !== "all", Boolean(fromDate), Boolean(toDate)].filter(Boolean).length;
  const clearFilters = () => { setQuery(""); setKind("all"); setAccountId("all"); setCategoryId("all"); setFromDate(""); setToDate(""); };

  return <section className="rounded-3xl border border-[#e0e4dd] bg-white p-5 md:p-7">
    <div className="mb-6"><h2 className="text-2xl font-semibold tracking-tight">Historial</h2><p className="mt-1 text-sm text-[#5e6d63]">{filteredTransactions.length} de {allVisible.length} movimientos.</p></div>
    <div className="mb-5 flex gap-2">
      <label className="relative min-w-0 flex-1"><Search size={16} className="pointer-events-none absolute left-3 top-3 text-[#718078]" aria-hidden="true" /><span className="sr-only">Buscar movimientos</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por descripción" className={`${controlClass} w-full pl-9`} /></label>
      <button type="button" onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen} className="relative flex h-10 items-center gap-2 rounded-xl border border-[#dce1da] bg-white px-3 text-sm font-semibold"><SlidersHorizontal size={16} aria-hidden="true" /><span className="hidden sm:inline">Filtros</span>{activeFilters > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#17231e] px-1 text-[10px] text-white">{activeFilters}</span>}</button>
    </div>
    {filtersOpen && <div className="mb-6 grid gap-3 rounded-2xl border border-[#e0e4dd] bg-[#f7f8f4] p-4 sm:grid-cols-2 lg:grid-cols-5">
      <label className="text-xs font-medium text-[#52665a]">Tipo<select value={kind} onChange={(event) => setKind(event.target.value)} className={`${controlClass} mt-1 w-full`}><option value="all">Todos</option><option value="income">Ingresos</option><option value="expense">Gastos</option><option value="transfer">Transferencias</option></select></label>
      <label className="text-xs font-medium text-[#52665a]">Cuenta<select value={accountId} onChange={(event) => setAccountId(event.target.value)} className={`${controlClass} mt-1 w-full`}><option value="all">Todas</option>{state.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
      <label className="text-xs font-medium text-[#52665a]">Categoría<select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className={`${controlClass} mt-1 w-full`}><option value="all">Todas</option>{state.categories.map((category) => <option key={category.id} value={category.id}>{category.icon} {category.name}</option>)}</select></label>
      <label className="text-xs font-medium text-[#52665a]">Desde<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className={`${controlClass} mt-1 w-full`} /></label>
      <label className="text-xs font-medium text-[#52665a]">Hasta<input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className={`${controlClass} mt-1 w-full`} /></label>
      {activeFilters > 0 && <button type="button" onClick={clearFilters} className="flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-[#5e6d63] sm:col-span-2 lg:col-span-5"><X size={15} aria-hidden="true" /> Limpiar filtros</button>}
    </div>}
    {!state.accounts.length && <p className="mb-5 rounded-2xl bg-[#fff8ed] p-4 text-sm text-[#704c24]">Agrega una cuenta antes de registrar movimientos.</p>}
    <TransactionList state={{ ...state, transactions: filteredTransactions }} />
  </section>;
}
