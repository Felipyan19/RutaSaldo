"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, CalendarClock, CreditCard, HandCoins, Landmark, LoaderCircle, Plus } from "lucide-react";
import { formatCOP } from "@/lib/finance";
import { deriveUpcomingPayments, type Phase2State } from "@/lib/phase2";
import { useFinance } from "./finance-provider";

const inputClass = "mt-1.5 h-11 w-full rounded-xl border border-[#dce1da] bg-white px-3 text-sm outline-none focus:border-[#526b5e] focus:ring-2 focus:ring-[#526b5e]/10";
const panelClass = "rounded-3xl border border-[#e0e4dd] bg-white p-5 md:p-6";

type Action = "installment" | "debt" | "payment" | "reconcile";

export function Phase2Page() {
  const { state: financeState } = useFinance();
  const [state, setState] = useState<Phase2State>({ installmentPlans: [], debts: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [action, setAction] = useState<Action>("installment");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/finance/phase2", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "No se pudo cargar la Fase 2.");
      setState(payload);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar la Fase 2.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function mutate(body: unknown) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/finance/phase2", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "No se pudo completar la operación.");
      setState(payload);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo completar la operación.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  const upcoming = useMemo(() => deriveUpcomingPayments(state), [state]);
  const cards = financeState.accounts.filter((account) => account.kind === "credit_card");
  const assetAccounts = financeState.accounts.filter((account) => account.kind !== "credit_card");
  const expenses = financeState.transactions.filter((item) => item.kind === "expense" && !item.transferId);
  const incomes = financeState.transactions.filter((item) => item.kind === "income" && !item.transferId);

  if (loading) return <div className="grid min-h-72 place-items-center"><div className="text-center"><LoaderCircle className="mx-auto animate-spin text-[#4f6c5c]" /><p className="mt-3 text-sm text-[#5e6d63]">Cargando cuotas y deudas…</p></div></div>;

  return <section className="space-y-6">
    {error && <div role="alert" className="rounded-2xl border border-[#e8c9bf] bg-[#fff4ef] px-4 py-3 text-sm text-[#914f3d]">{error}</div>}

    <div className="grid gap-4 md:grid-cols-3">
      <Metric icon={CreditCard} label="Compras a cuotas" value={String(state.installmentPlans.length)} />
      <Metric icon={Landmark} label="Deudas activas" value={String(state.debts.filter((item) => item.status === "active").length)} />
      <Metric icon={CalendarClock} label="Próximos pagos" value={String(upcoming.length)} />
    </div>

    <div className={panelClass}>
      <div className="mb-5 flex flex-wrap gap-2">
        {([ ["installment", "Compra a cuotas"], ["debt", "Nueva deuda"], ["payment", "Registrar abono"], ["reconcile", "Conciliar transferencia"] ] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setAction(value)} className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${action === value ? "bg-[#17231e] text-white" : "border border-[#dce1da] bg-white text-[#52665a]"}`}>{label}</button>)}
      </div>
      {action === "installment" && <InstallmentForm cards={cards} categories={financeState.categories} saving={saving} onSubmit={mutate} />}
      {action === "debt" && <DebtForm saving={saving} onSubmit={mutate} />}
      {action === "payment" && <PaymentForm debts={state.debts} accounts={assetAccounts} saving={saving} onSubmit={mutate} />}
      {action === "reconcile" && <ReconcileForm expenses={expenses} incomes={incomes} saving={saving} onSubmit={mutate} />}
    </div>

    <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
      <div className={panelClass}>
        <h2 className="text-lg font-semibold">Próximos pagos</h2>
        <p className="mt-1 text-sm text-[#5e6d63]">Calendario derivado de cuotas pendientes y pagos mínimos de deuda.</p>
        <div className="mt-5 divide-y divide-[#edf0eb]">
          {upcoming.length ? upcoming.map((payment) => <div key={payment.id} className="flex items-center gap-3 py-4 first:pt-0 last:pb-0"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eef3ef] text-[#4f6c5c]"><CalendarClock size={18} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{payment.title}</p><p className="mt-0.5 text-xs text-[#5e6d63]">{payment.description} · {new Date(`${payment.dueDate}T12:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}</p></div><p className="text-sm font-semibold">{formatCOP(payment.amount)}</p></div>) : <Empty text="No hay pagos próximos registrados." />}
        </div>
      </div>

      <div className={panelClass}>
        <h2 className="text-lg font-semibold">Deudas</h2>
        <div className="mt-5 space-y-3">
          {state.debts.length ? state.debts.map((debt) => <article key={debt.id} className="rounded-2xl border border-[#e0e4dd] p-4"><div className="flex justify-between gap-4"><div><p className="font-semibold">{debt.name}</p><p className="mt-1 text-xs text-[#5e6d63]">{debt.creditor} · vence día {debt.paymentDueDay}</p></div><span className={`h-fit rounded-full px-2.5 py-1 text-[10px] font-semibold ${debt.status === "paid" ? "bg-[#e4f2e8] text-[#3f7258]" : "bg-[#fff4df] text-[#8a6328]"}`}>{debt.status === "paid" ? "Pagada" : "Activa"}</span></div><p className="mt-4 text-xl font-semibold">{formatCOP(debt.currentBalance)}</p><p className="mt-1 text-xs text-[#5e6d63]">Pago mínimo {formatCOP(debt.minimumPayment)} · tasa {debt.interestRate}%</p></article>) : <Empty text="Aún no tienes deudas externas." />}
        </div>
      </div>
    </div>

    <div className={panelClass}>
      <h2 className="text-lg font-semibold">Compras a cuotas</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {state.installmentPlans.length ? state.installmentPlans.map((plan) => {
          const pending = plan.installments.filter((item) => item.status === "pending");
          return <article key={plan.id} className="rounded-2xl border border-[#e0e4dd] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{plan.description}</p><p className="mt-1 text-xs text-[#5e6d63]">{plan.installmentCount} cuotas · compra {new Date(`${plan.purchaseDate}T12:00:00`).toLocaleDateString("es-CO")}</p></div><CreditCard size={18} className="text-[#4f6c5c]" /></div><p className="mt-4 text-xl font-semibold">{formatCOP(plan.totalAmount)}</p><p className="mt-1 text-xs text-[#5e6d63]">{pending.length} cuotas pendientes</p><div className="mt-4 flex flex-wrap gap-2">{plan.installments.map((item) => <span key={item.id} className={`rounded-lg px-2 py-1 text-[10px] ${item.status === "paid" ? "bg-[#e4f2e8] text-[#3f7258]" : "bg-[#f1f3ef] text-[#5e6d63]"}`}>{item.number}: {formatCOP(item.amount)}</span>)}</div></article>;
        }) : <Empty text="Aún no hay compras a cuotas." />}
      </div>
    </div>
  </section>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof CreditCard; label: string; value: string }) {
  return <div className={panelClass}><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eef3ef] text-[#4f6c5c]"><Icon size={18} /></span><p className="mt-4 text-sm text-[#5e6d63]">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>;
}

function Empty({ text }: { text: string }) { return <p className="rounded-2xl border border-dashed border-[#cbd5cc] p-5 text-center text-sm text-[#5e6d63]">{text}</p>; }

function InstallmentForm({ cards, categories, saving, onSubmit }: { cards: Array<{ id: string; name: string; institution: string }>; categories: Array<{ id: string; name: string }>; saving: boolean; onSubmit: (body: unknown) => Promise<boolean> }) {
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const ok = await onSubmit({ type: "installment_purchase", purchase: { id: crypto.randomUUID(), accountId: data.get("accountId"), categoryId: data.get("categoryId"), description: data.get("description"), totalAmount: Number(data.get("totalAmount")), installmentCount: Number(data.get("installmentCount")), purchaseDate: data.get("purchaseDate") } }); if (ok) form.reset(); }
  return <form onSubmit={submit} className="grid gap-4 md:grid-cols-2"><Field label="Tarjeta"><select required name="accountId" className={inputClass}><option value="">Selecciona</option>{cards.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.institution}</option>)}</select></Field><Field label="Categoría"><select required name="categoryId" className={inputClass}><option value="">Selecciona</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Descripción"><input required name="description" maxLength={200} className={inputClass} /></Field><Field label="Valor total"><input required name="totalAmount" type="number" min="1" step="1" className={inputClass} /></Field><Field label="Número de cuotas"><input required name="installmentCount" type="number" min="2" max="60" defaultValue="3" className={inputClass} /></Field><Field label="Fecha de compra"><input required name="purchaseDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className={inputClass} /></Field><Submit saving={saving} label="Registrar compra a cuotas" /></form>;
}

function DebtForm({ saving, onSubmit }: { saving: boolean; onSubmit: (body: unknown) => Promise<boolean> }) {
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const ok = await onSubmit({ type: "debt", debt: { id: crypto.randomUUID(), name: data.get("name"), creditor: data.get("creditor"), amount: Number(data.get("amount")), interestRate: Number(data.get("interestRate")), minimumPayment: Number(data.get("minimumPayment")), paymentDueDay: Number(data.get("paymentDueDay")) } }); if (ok) form.reset(); }
  return <form onSubmit={submit} className="grid gap-4 md:grid-cols-2"><Field label="Nombre"><input required name="name" maxLength={100} className={inputClass} /></Field><Field label="Acreedor"><input required name="creditor" maxLength={100} className={inputClass} /></Field><Field label="Saldo inicial"><input required name="amount" type="number" min="1" step="1" className={inputClass} /></Field><Field label="Tasa anual %"><input required name="interestRate" type="number" min="0" max="500" step="0.01" defaultValue="0" className={inputClass} /></Field><Field label="Pago mínimo"><input required name="minimumPayment" type="number" min="0" step="1" defaultValue="0" className={inputClass} /></Field><Field label="Día de vencimiento"><input required name="paymentDueDay" type="number" min="1" max="31" defaultValue="15" className={inputClass} /></Field><Submit saving={saving} label="Crear deuda" /></form>;
}

function PaymentForm({ debts, accounts, saving, onSubmit }: { debts: Phase2State["debts"]; accounts: Array<{ id: string; name: string; institution: string }>; saving: boolean; onSubmit: (body: unknown) => Promise<boolean> }) {
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const ok = await onSubmit({ type: "debt_payment", payment: { id: crypto.randomUUID(), debtId: data.get("debtId"), accountId: data.get("accountId"), amount: Number(data.get("amount")), paidAt: data.get("paidAt") } }); if (ok) form.reset(); }
  return <form onSubmit={submit} className="grid gap-4 md:grid-cols-2"><Field label="Deuda"><select required name="debtId" className={inputClass}><option value="">Selecciona</option>{debts.filter((item) => item.status === "active").map((item) => <option key={item.id} value={item.id}>{item.name} · {formatCOP(item.currentBalance)}</option>)}</select></Field><Field label="Cuenta de salida"><select required name="accountId" className={inputClass}><option value="">Selecciona</option>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.institution}</option>)}</select></Field><Field label="Valor del abono"><input required name="amount" type="number" min="1" step="1" className={inputClass} /></Field><Field label="Fecha"><input required name="paidAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className={inputClass} /></Field><Submit saving={saving} label="Registrar abono" /></form>;
}

function ReconcileForm({ expenses, incomes, saving, onSubmit }: { expenses: Array<{ id: string; description: string; amount: number }>; incomes: Array<{ id: string; description: string; amount: number }>; saving: boolean; onSubmit: (body: unknown) => Promise<boolean> }) {
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const ok = await onSubmit({ type: "reconcile", reconciliation: { id: crypto.randomUUID(), outgoingTransactionId: data.get("outgoingTransactionId"), incomingTransactionId: data.get("incomingTransactionId"), description: data.get("description") } }); if (ok) form.reset(); }
  return <form onSubmit={submit} className="grid gap-4 md:grid-cols-2"><Field label="Gasto de salida"><select required name="outgoingTransactionId" className={inputClass}><option value="">Selecciona</option>{expenses.map((item) => <option key={item.id} value={item.id}>{item.description} · {formatCOP(item.amount)}</option>)}</select></Field><Field label="Ingreso de entrada"><select required name="incomingTransactionId" className={inputClass}><option value="">Selecciona</option>{incomes.map((item) => <option key={item.id} value={item.id}>{item.description} · {formatCOP(item.amount)}</option>)}</select></Field><Field label="Descripción opcional"><input name="description" maxLength={200} placeholder="Transferencia entre cuentas" className={inputClass} /></Field><div className="flex items-end"><p className="rounded-xl bg-[#eef3ef] p-3 text-xs text-[#52665a]"><ArrowRightLeft className="mb-1" size={16} />Los movimientos deben tener el mismo valor y pertenecer a cuentas diferentes.</p></div><Submit saving={saving} label="Conciliar como transferencia" /></form>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-xs font-semibold text-[#52665a]">{label}{children}</label>; }
function Submit({ saving, label }: { saving: boolean; label: string }) { return <button disabled={saving} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#17231e] px-5 text-sm font-semibold text-white disabled:opacity-50 md:col-span-2"><Plus size={16} />{saving ? "Guardando…" : label}</button>; }
