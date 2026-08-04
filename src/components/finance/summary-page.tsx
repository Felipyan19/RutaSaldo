"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Banknote, CircleDollarSign, CreditCard, Landmark, WalletCards } from "lucide-react";
import { accountBalance, financialPosition, formatCOP, totals } from "@/lib/finance";
import { useFinance } from "./finance-provider";
import { TransactionList } from "./transaction-list";

export function SummaryPage() {
  const { state } = useFinance();
  const summary = totals(state);
  const position = financialPosition(state);
  const chartData = useMemo(() => state.categories
    .filter((category) => category.name !== "Ingresos")
    .map((category) => ({
      name: category.name,
      color: category.color,
      value: state.transactions
        .filter((item) => item.kind === "expense" && item.categoryId === category.id)
        .reduce((sum, item) => sum + item.amount, 0),
    }))
    .filter((item) => item.value > 0), [state]);
  const availableShare = summary.income ? Math.round(((summary.income - summary.expenses) / summary.income) * 100) : 0;

  return <>
    <div className="mb-7 max-w-2xl">
      <h1 className="text-3xl font-semibold tracking-[-0.04em]">Panorama financiero</h1>
      <p className="mt-2 text-sm leading-6 text-[#5e6d63]">Saldos, ingresos y gastos consolidados en un solo lugar.</p>
    </div>

    <section aria-label="Indicadores principales" className="grid gap-4 md:grid-cols-3">
      <Metric label="Patrimonio neto" value={formatCOP(position.netWorth)} note={`${formatCOP(position.available)} disponible · ${formatCOP(position.debt)} en tarjetas`} tone="dark" />
      <Metric label="Ingresos" value={formatCOP(summary.income)} note="Total registrado" tone="green" />
      <Metric label="Gastos" value={formatCOP(summary.expenses)} note={`${availableShare}% del ingreso disponible`} tone="light" />
    </section>

    <section className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_.9fr]">
      <div className="rounded-3xl border border-[#e0e4dd] bg-white p-5 md:p-7">
        <SectionHeading title="Cuentas" description="Saldo actualizado con cada movimiento" href="/cuentas" linkLabel="Ver cuentas" />
        {!state.accounts.length ? (
          <div className="rounded-2xl border border-dashed border-[#cbd5cc] px-5 py-8 text-center">
            <WalletCards className="mx-auto text-[#66776d]" size={24} aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold">Agrega tu primera cuenta</p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-[#5e6d63]">Necesitas una cuenta, billetera, tarjeta o efectivo para registrar movimientos.</p>
            <Link href="/cuentas" className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-[#17231e] px-4 text-xs font-semibold text-white">Ir a cuentas</Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {state.accounts.slice(0, 4).map((account) => {
              const Icon = account.kind === "cash" ? Banknote : account.kind === "wallet" ? WalletCards : account.kind === "bank" ? Landmark : CreditCard;
              return <Link key={account.id} href="/cuentas" className="group rounded-2xl border border-[#e7eae5] p-4 transition hover:border-[#cbd5cc] hover:bg-[#fafbf8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#526b5e]/30">
                <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-xl text-white" style={{ backgroundColor: account.color }}><Icon size={19} /></span>
                <p className="mt-4 truncate text-xs text-[#5e6d63]">{account.institution}</p>
                <p className="mt-0.5 truncate text-sm font-medium">{account.name}</p>
                <p className="mt-3 text-lg font-semibold">{formatCOP(accountBalance(account, state.transactions))}</p>
                <p className="mt-1 text-[11px] font-medium text-[#65756c] transition group-hover:text-[#334b3e]">Ver detalle</p>
              </Link>;
            })}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-[#e0e4dd] bg-white p-5 md:p-7">
        <h3 className="font-semibold">Gastos por categoría</h3>
        <p className="mt-1 text-xs text-[#5e6d63]">Distribución del total registrado</p>
        <div className="relative mx-auto mt-3 h-48 max-w-xs">
          {chartData.length ? <>
            <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chartData} dataKey="value" innerRadius={56} outerRadius={78} paddingAngle={4} stroke="none">{chartData.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip formatter={(value) => formatCOP(Number(value))} /></PieChart></ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><div><p className="text-[10px] text-[#5e6d63]">Total</p><p className="text-sm font-semibold">{formatCOP(summary.expenses, true)}</p></div></div>
          </> : <div className="grid h-full place-items-center px-6 text-center text-xs leading-5 text-[#5e6d63]">La distribución aparecerá cuando registres gastos.</div>}
        </div>
        {chartData.length > 0 && <div className="grid grid-cols-2 gap-x-3 gap-y-2">{chartData.map((item) => <div key={item.name} className="flex items-center gap-2 text-xs"><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} /><span className="truncate text-[#5e6d63]">{item.name}</span></div>)}</div>}
      </div>
    </section>

    <section className="mt-4 rounded-3xl border border-[#e0e4dd] bg-white p-5 md:p-7">
      <SectionHeading title="Movimientos recientes" description="Actividad más reciente de tus cuentas" href="/movimientos" linkLabel="Ver historial" />
      <TransactionList state={state} limit={5} />
    </section>
  </>;
}

function SectionHeading({ title, description, href, linkLabel }: { title: string; description: string; href: string; linkLabel: string }) {
  return <div className="mb-6 flex items-start justify-between gap-4"><div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-xs leading-5 text-[#5e6d63]">{description}</p></div><Link href={href} className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-[#4f6c5c] hover:bg-[#eef3ef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#526b5e]/30">{linkLabel}</Link></div>;
}

function Metric({ label, value, note, tone }: { label: string; value: string; note: string; tone: "dark" | "green" | "light" }) {
  const styles = { dark: "bg-[#17231e] text-white border-[#17231e]", green: "bg-[#dcebe1] text-[#18241e] border-[#d1e2d7]", light: "bg-white text-[#18241e] border-[#e0e4dd]" };
  return <div className={`rounded-3xl border p-5 md:p-6 ${styles[tone]}`}><p className={`text-xs ${tone === "dark" ? "text-[#9eaca4]" : "text-[#4e5f54]"}`}>{label}</p><p className="mt-3 break-words text-2xl font-semibold tracking-[-0.035em]">{value}</p><p className={`mt-5 text-[11px] leading-5 ${tone === "dark" ? "text-[#aebbb3]" : "text-[#4e5f54]"}`}>{note}</p></div>;
}
