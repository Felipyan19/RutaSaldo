"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CircleDollarSign, CreditCard } from "lucide-react";
import { accountBalance, financialPosition, formatCOP, totals } from "@/lib/finance";
import { useFinance } from "./finance-provider";
import { TransactionList } from "./transaction-list";

export function SummaryPage() {
  const { state } = useFinance();
  const summary = totals(state);
  const position = financialPosition(state);
  const chartData = useMemo(() => state.categories.filter((category) => category.name !== "Ingresos").map((category) => ({ name: category.name, color: category.color, value: state.transactions.filter((item) => item.kind === "expense" && item.categoryId === category.id).reduce((sum, item) => sum + item.amount, 0) })).filter((item) => item.value > 0), [state]);
  const variation = summary.income ? Math.round(((summary.income - summary.expenses) / summary.income) * 100) : 0;

  return <>
    <div className="mb-7 flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm text-[#5e6d63]">Tu panorama financiero</p><h2 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">Hola 👋</h2></div><span className="rounded-full bg-[#e5eee8] px-4 py-2 text-xs font-medium text-[#466454]">Resumen general</span></div>
    <section className="grid gap-4 md:grid-cols-3"><Metric label="Patrimonio neto" value={formatCOP(position.netWorth)} note={`${formatCOP(position.available)} disponible · ${formatCOP(position.debt)} en tarjetas`} tone="dark" /><Metric label="Ingresos" value={formatCOP(summary.income)} note="Total registrado" tone="green" /><Metric label="Gastos" value={formatCOP(summary.expenses)} note={`${variation}% disponible del ingreso`} tone="light" /></section>
    <section className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_.9fr]">
      <div className="rounded-3xl border border-[#e0e4dd] bg-white p-5 md:p-7"><div className="mb-6 flex items-center justify-between"><div><h3 className="font-semibold">Tus cuentas</h3><p className="mt-1 text-xs text-[#5e6d63]">Saldos actualizados con cada movimiento</p></div><Link href="/cuentas" className="text-xs font-semibold text-[#4f6c5c]">Ver todas</Link></div>{!state.accounts.length ? <div className="rounded-2xl border border-dashed border-[#cbd5cc] p-6 text-center"><p className="text-sm font-medium">Empieza agregando una cuenta</p><p className="mt-1 text-xs text-[#5e6d63]">Tu saldo actual es $0.</p><Link href="/cuentas" className="mt-4 inline-flex rounded-xl bg-[#17231e] px-4 py-2 text-xs font-semibold text-white">Agregar cuenta</Link></div> : <div className="grid gap-3 sm:grid-cols-2">{state.accounts.slice(0, 4).map((account) => <div key={account.id} className="rounded-2xl border border-[#e7eae5] p-4"><span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-xl text-white" style={{ backgroundColor: account.color }}>{account.kind === "cash" ? <CircleDollarSign size={19} /> : <CreditCard size={19} />}</span><p className="mt-4 text-xs text-[#5e6d63]">{account.institution} · {account.name}</p><p className="mt-1 text-lg font-semibold">{formatCOP(accountBalance(account, state.transactions))}</p></div>)}</div>}</div>
      <div className="rounded-3xl border border-[#e0e4dd] bg-white p-5 md:p-7"><h3 className="font-semibold">Gastos por categoría</h3><p className="mt-1 text-xs text-[#5e6d63]">Distribución de tus gastos</p><div className="relative mx-auto mt-3 h-48 max-w-xs">{chartData.length ? <><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chartData} dataKey="value" innerRadius={56} outerRadius={78} paddingAngle={4} stroke="none">{chartData.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip formatter={(value) => formatCOP(Number(value))} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><div><p className="text-[10px] text-[#5e6d63]">Total</p><p className="text-sm font-semibold">{formatCOP(summary.expenses, true)}</p></div></div></> : <div className="grid h-full place-items-center text-center text-xs text-[#5e6d63]">Registra gastos para ver la distribución.</div>}</div><div className="grid grid-cols-2 gap-x-3 gap-y-2">{chartData.map((item) => <div key={item.name} className="flex items-center gap-2 text-xs"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} /><span className="truncate text-[#5e6d63]">{item.name}</span></div>)}</div></div>
    </section>
    <section className="mt-4 rounded-3xl border border-[#e0e4dd] bg-white p-5 md:p-7"><div className="mb-5 flex items-center justify-between"><div><h3 className="font-semibold">Movimientos recientes</h3><p className="mt-1 text-xs text-[#5e6d63]">Lo último que pasó con tu dinero</p></div><Link href="/movimientos" className="text-xs font-semibold text-[#4f6c5c]">Ver todos</Link></div><TransactionList state={state} limit={5} /></section>
  </>;
}

function Metric({ label, value, note, tone }: { label: string; value: string; note: string; tone: "dark" | "green" | "light" }) {
  const styles = { dark: "bg-[#17231e] text-white border-[#17231e]", green: "bg-[#dcebe1] text-[#18241e] border-[#d1e2d7]", light: "bg-white text-[#18241e] border-[#e0e4dd]" };
  return <div className={`rounded-3xl border p-5 md:p-6 ${styles[tone]}`}><p className={`text-xs ${tone === "dark" ? "text-[#9eaca4]" : "text-[#4e5f54]"}`}>{label}</p><p className="mt-3 text-2xl font-semibold tracking-[-0.035em]">{value}</p><p className={`mt-5 text-[11px] ${tone === "dark" ? "text-[#8d9c93]" : "text-[#4e5f54]"}`}>{note}</p></div>;
}
