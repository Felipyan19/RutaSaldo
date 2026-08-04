"use client";

import { useMemo, useState } from "react";
import { ArrowDownCircle, ArrowRightLeft, ArrowUpCircle, Scale, Search, SlidersHorizontal, X } from "lucide-react";
import { formatCOP } from "@/lib/finance";
import { useFinance } from "./finance-provider";
import { TransactionList } from "./transaction-list";
import { MetricCard, PageHeader, Panel } from "./dashboard-ui";

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
  const periodTransactions = useMemo(() => allVisible.filter((transaction) => {
    if (kind !== "all" && transaction.kind !== kind) return false;
    if (accountId !== "all" && transaction.accountId !== accountId) return false;
    if (categoryId !== "all" && transaction.categoryId !== categoryId) return false;
    if (fromDate && transaction.date < fromDate) return false;
    if (toDate && transaction.date > toDate) return false;
    return true;
  }), [allVisible, kind, accountId, categoryId, fromDate, toDate]);
  const filteredTransactions = useMemo(() => periodTransactions.filter((transaction) => !query || transaction.description.toLowerCase().includes(query.toLowerCase())), [periodTransactions, query]);

  const analysis = useMemo(() => {
    const income = periodTransactions.filter((item) => item.kind === "income").reduce((sum, item) => sum + item.amount, 0);
    const expenses = periodTransactions.filter((item) => item.kind === "expense").reduce((sum, item) => sum + item.amount, 0);
    const transfers = periodTransactions.filter((item) => item.kind === "transfer").length;
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() - (5 - index));
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const rows = periodTransactions.filter((item) => item.date.startsWith(key));
      return { key, label: date.toLocaleDateString("es-CO", { month: "short" }).replace(".", ""), income: rows.filter((item) => item.kind === "income").reduce((sum, item) => sum + item.amount, 0), expenses: rows.filter((item) => item.kind === "expense").reduce((sum, item) => sum + item.amount, 0) };
    });
    return { income, expenses, balance: income - expenses, transfers, months };
  }, [periodTransactions]);

  const chartMax = Math.max(1, ...analysis.months.flatMap((month) => [month.income, month.expenses]));
  const activeFilters = [kind !== "all", accountId !== "all", categoryId !== "all", Boolean(fromDate), Boolean(toDate)].filter(Boolean).length;
  const clearFilters = () => { setQuery(""); setKind("all"); setAccountId("all"); setCategoryId("all"); setFromDate(""); setToDate(""); };

  return <section className="space-y-5">
    <PageHeader title="Movimientos" description="El resumen responde a filtros de periodo, tipo, cuenta y categoría. La búsqueda de texto solo reduce el historial." />

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard icon={ArrowUpCircle} label="Ingresos del periodo" value={formatCOP(analysis.income)} tone="positive" />
      <MetricCard icon={ArrowDownCircle} label="Gastos del periodo" value={formatCOP(analysis.expenses)} tone="negative" />
      <MetricCard icon={Scale} label="Balance del periodo" value={formatCOP(analysis.balance)} tone={analysis.balance >= 0 ? "positive" : "negative"} featured />
      <MetricCard icon={ArrowRightLeft} label="Transferencias" value={String(analysis.transfers)} />
    </div>

    <Panel title="Flujo de los últimos 6 meses" description="Se actualiza con los filtros financieros, pero no con el buscador de descripción.">
      <div className="mb-4 flex gap-4 text-xs text-[#5e6d63]"><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#6f9d80]" />Ingresos</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#c87663]" />Gastos</span></div>
      <div className="overflow-x-auto pb-2"><div className="grid h-48 min-w-[34rem] grid-cols-6 items-end gap-4 border-b border-[#e5e9e4] px-1">{analysis.months.map((month) => <div key={month.key} className="flex h-full min-w-0 flex-col justify-end" role="group" aria-label={`${month.label}: ingresos ${formatCOP(month.income)}, gastos ${formatCOP(month.expenses)}`}><div className="flex flex-1 items-end justify-center gap-2"><span tabIndex={0} aria-label={`Ingresos ${formatCOP(month.income)}`} className="w-4 rounded-t bg-[#6f9d80] focus:outline-none focus:ring-2 focus:ring-[#315443]" style={{ height: `${Math.max(month.income ? 5 : 0, (month.income / chartMax) * 100)}%` }} /><span tabIndex={0} aria-label={`Gastos ${formatCOP(month.expenses)}`} className="w-4 rounded-t bg-[#c87663] focus:outline-none focus:ring-2 focus:ring-[#8f4d3e]" style={{ height: `${Math.max(month.expenses ? 5 : 0, (month.expenses / chartMax) * 100)}%` }} /></div><div className="py-2 text-center"><p className="text-[10px] font-semibold capitalize text-[#4e5f54]">{month.label}</p><p className="mt-0.5 text-[9px] text-[#6b786f]">{formatCOP(month.income, true)} / {formatCOP(month.expenses, true)}</p></div></div>)}</div></div>
    </Panel>

    <Panel title="Historial" description={`${filteredTransactions.length} de ${periodTransactions.length} movimientos coinciden con la búsqueda; ${periodTransactions.length} de ${allVisible.length} pertenecen al periodo y filtros seleccionados.`}>
      <div className="mb-5 flex gap-2"><label className="relative min-w-0 flex-1"><Search size={16} className="pointer-events-none absolute left-3 top-3 text-[#718078]" aria-hidden="true" /><span className="sr-only">Buscar movimientos</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por descripción" className={`${controlClass} w-full pl-9`} /></label><button type="button" onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen} className="relative flex h-10 items-center gap-2 rounded-xl border border-[#dce1da] bg-white px-3 text-sm font-semibold"><SlidersHorizontal size={16} aria-hidden="true" /><span className="hidden sm:inline">Filtros</span>{activeFilters > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#17231e] px-1 text-[10px] text-white">{activeFilters}</span>}</button></div>
      {filtersOpen && <div className="mb-6 grid gap-3 rounded-2xl border border-[#e0e4dd] bg-[#f7f8f4] p-4 sm:grid-cols-2 lg:grid-cols-5"><label className="text-xs font-medium text-[#52665a]">Tipo<select value={kind} onChange={(event) => setKind(event.target.value)} className={`${controlClass} mt-1 w-full`}><option value="all">Todos</option><option value="income">Ingresos</option><option value="expense">Gastos</option><option value="transfer">Transferencias</option></select></label><label className="text-xs font-medium text-[#52665a]">Cuenta<select value={accountId} onChange={(event) => setAccountId(event.target.value)} className={`${controlClass} mt-1 w-full`}><option value="all">Todas</option>{state.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label><label className="text-xs font-medium text-[#52665a]">Categoría<select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className={`${controlClass} mt-1 w-full`}><option value="all">Todas</option>{state.categories.map((category) => <option key={category.id} value={category.id}>{category.icon} {category.name}</option>)}</select></label><label className="text-xs font-medium text-[#52665a]">Desde<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className={`${controlClass} mt-1 w-full`} /></label><label className="text-xs font-medium text-[#52665a]">Hasta<input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className={`${controlClass} mt-1 w-full`} /></label>{activeFilters > 0 && <button type="button" onClick={clearFilters} className="flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-[#5e6d63] sm:col-span-2 lg:col-span-5"><X size={15} /> Limpiar filtros</button>}</div>}
      {!state.accounts.length && <p className="mb-5 rounded-2xl bg-[#fff8ed] p-4 text-sm text-[#704c24]">Agrega una cuenta antes de registrar movimientos.</p>}
      <TransactionList state={{ ...state, transactions: filteredTransactions }} />
    </Panel>
  </section>;
}
