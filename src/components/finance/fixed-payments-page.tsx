"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, CircleAlert, Clock3, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/modal";
import { formatCOP } from "@/lib/finance";
import type { FixedPaymentOccurrence, FixedPaymentTemplate, FixedPaymentsPayload } from "@/lib/fixed-payments";
import { fixedPaymentPeriodKey } from "@/lib/fixed-payments";
import { useFinance } from "./finance-provider";
import { MetricCard, PageHeader, Panel } from "./dashboard-ui";

const fieldClass = "mt-2 h-11 w-full rounded-xl border border-[#dce1da] bg-white px-3 text-sm outline-none focus:border-[#526b5e] focus:ring-2 focus:ring-[#526b5e]/10";
const emptyPayload: FixedPaymentsPayload = { templates: [], occurrences: [] };

function occurrenceFor(template: FixedPaymentTemplate, payload: FixedPaymentsPayload, periodKey: string): FixedPaymentOccurrence {
  return payload.occurrences.find((item) => item.templateId === template.id && item.periodKey === periodKey) ?? {
    id: crypto.randomUUID(),
    templateId: template.id,
    periodKey,
    dueDate: template.nextDueDate,
    expectedAmount: template.expectedAmount,
    actualAmount: null,
    status: new Date(template.nextDueDate + "T12:00:00") < new Date() ? "overdue" : "pending",
    completedAt: null,
    completionSource: null,
    transactionId: null,
    bankEmailMessageId: null,
    notes: "",
  };
}

export function FixedPaymentsPage() {
  const { state } = useFinance();
  const [payload, setPayload] = useState<FixedPaymentsPayload>(emptyPayload);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<FixedPaymentTemplate | "new" | null>(null);
  const [periodKey, setPeriodKey] = useState(fixedPaymentPeriodKey());

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/fixed-payments", { cache: "no-store" });
      if (!response.ok) throw new Error("No se pudieron cargar los pagos fijos.");
      setPayload(await response.json());
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudieron cargar los pagos fijos."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  const rows = useMemo(() => payload.templates.filter((item) => item.isActive).map((template) => ({ template, occurrence: occurrenceFor(template, payload, periodKey) })), [payload, periodKey]);
  const completed = rows.filter((item) => item.occurrence.status === "completed");
  const pending = rows.filter((item) => item.occurrence.status !== "completed" && item.occurrence.status !== "skipped");
  const overdue = pending.filter((item) => item.occurrence.status === "overdue" || new Date(item.occurrence.dueDate + "T12:00:00") < new Date());
  const pendingAmount = pending.reduce((sum, item) => sum + item.occurrence.expectedAmount, 0);
  const completionRate = rows.length ? Math.round((completed.length / rows.length) * 100) : 0;

  async function saveTemplate(template: FixedPaymentTemplate) {
    setSaving(true);
    try {
      const response = await fetch("/api/fixed-payments", { method: editing === "new" ? "POST" : "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ template }) });
      if (!response.ok) throw new Error("No se pudo guardar el pago fijo.");
      setPayload(await response.json());
      setEditing(null);
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar el pago fijo."); }
    finally { setSaving(false); }
  }

  async function saveOccurrence(occurrence: FixedPaymentOccurrence) {
    setSaving(true);
    try {
      const response = await fetch("/api/fixed-payments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "occurrence", occurrence }) });
      if (!response.ok) throw new Error("No se pudo actualizar el pago.");
      setPayload(await response.json());
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo actualizar el pago."); }
    finally { setSaving(false); }
  }

  async function togglePaid(occurrence: FixedPaymentOccurrence) {
    const paid = occurrence.status === "completed";
    await saveOccurrence({ ...occurrence, status: paid ? "pending" : "completed", actualAmount: paid ? null : occurrence.actualAmount ?? occurrence.expectedAmount, completedAt: paid ? null : new Date().toISOString(), completionSource: paid ? null : "manual" });
  }

  async function remove(template: FixedPaymentTemplate) {
    if (!window.confirm(`¿Eliminar “${template.name}” y su historial?`)) return;
    const response = await fetch(`/api/fixed-payments?templateId=${encodeURIComponent(template.id)}`, { method: "DELETE" });
    if (response.ok) setPayload(await response.json());
  }

  function monthLabel(value: string) {
    const [year, month] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
  }

  return <section className="space-y-5">
    <div className="flex items-start justify-between gap-4"><PageHeader title="Pagos fijos" description="Controla qué responsabilidades ya cumpliste y cuáles necesitan atención." /><button type="button" onClick={() => setEditing("new")} className="hidden h-10 shrink-0 items-center gap-2 rounded-xl bg-[#17231e] px-4 text-sm font-semibold text-white sm:flex"><Plus size={16} />Pago fijo</button></div>
    {error && <p role="alert" className="rounded-xl border border-[#e8c9bf] bg-[#fff4ef] px-4 py-3 text-sm text-[#914f3d]">{error}</p>}

    <div className="flex flex-col gap-3 rounded-2xl border border-[#dce1da] bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.1em] text-[#68776e]">Periodo</p><p className="mt-1 font-semibold capitalize">{monthLabel(periodKey)}</p></div><input type="month" value={periodKey} onChange={(event) => setPeriodKey(event.target.value)} className="h-10 rounded-xl border border-[#dce1da] bg-white px-3 text-sm" /></div>

    <div className="grid gap-3 sm:grid-cols-3">
      <MetricCard icon={Check} label="Completados" value={`${completed.length} de ${rows.length}`} featured />
      <MetricCard icon={Clock3} label="Pendiente estimado" value={formatCOP(pendingAmount)} />
      <MetricCard icon={CircleAlert} label="Vencidos" value={String(overdue.length)} tone={overdue.length ? "warning" : "positive"} />
    </div>

    <Panel title="Progreso del periodo" description={`${completionRate}% de tus responsabilidades están completadas.`}><div className="h-3 overflow-hidden rounded-full bg-[#e7ebe5]"><div className="h-full rounded-full bg-[#5f806d] transition-[width]" style={{ width: `${completionRate}%` }} /></div></Panel>

    {loading ? <div className="rounded-2xl border border-[#dce1da] bg-white p-8 text-center text-sm text-[#68776e]">Cargando responsabilidades…</div> : rows.length === 0 ? <div className="rounded-3xl border border-dashed border-[#cbd5cc] bg-white p-10 text-center"><CalendarDays className="mx-auto text-[#4f6c5c]" /><h2 className="mt-4 text-lg font-semibold">Crea tu primer pago fijo</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#68776e]">Agrega arriendo, servicios, suscripciones o cualquier responsabilidad que no quieras olvidar.</p><button type="button" onClick={() => setEditing("new")} className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-[#17231e] px-5 text-sm font-semibold text-white"><Plus size={16} />Agregar pago fijo</button></div> : <>
      {overdue.length > 0 && <PaymentSection title="Necesitan atención" rows={overdue} saving={saving} onToggle={togglePaid} onEdit={setEditing} onDelete={remove} />}
      <PaymentSection title="Próximos" rows={pending.filter((item) => !overdue.includes(item))} saving={saving} onToggle={togglePaid} onEdit={setEditing} onDelete={remove} />
      {completed.length > 0 && <details className="rounded-2xl border border-[#dce1da] bg-white"><summary className="cursor-pointer px-5 py-4 text-sm font-semibold">Completados ({completed.length})</summary><div className="border-t border-[#edf0eb] p-4"><PaymentRows rows={completed} saving={saving} onToggle={togglePaid} onEdit={setEditing} onDelete={remove} /></div></details>}
    </>}

    {editing && <FixedPaymentEditor template={editing === "new" ? null : editing} accounts={state.accounts} categories={state.categories} saving={saving} onClose={() => setEditing(null)} onSave={saveTemplate} />}
  </section>;
}

function PaymentSection({ title, rows, ...actions }: { title: string; rows: Array<{ template: FixedPaymentTemplate; occurrence: FixedPaymentOccurrence }>; saving: boolean; onToggle: (occurrence: FixedPaymentOccurrence) => void; onEdit: (template: FixedPaymentTemplate) => void; onDelete: (template: FixedPaymentTemplate) => void }) {
  if (!rows.length) return null;
  return <section><h2 className="mb-3 text-lg font-semibold">{title}</h2><PaymentRows rows={rows} {...actions} /></section>;
}

function PaymentRows({ rows, saving, onToggle, onEdit, onDelete }: { rows: Array<{ template: FixedPaymentTemplate; occurrence: FixedPaymentOccurrence }>; saving: boolean; onToggle: (occurrence: FixedPaymentOccurrence) => void; onEdit: (template: FixedPaymentTemplate) => void; onDelete: (template: FixedPaymentTemplate) => void }) {
  return <div className="space-y-3">{rows.map(({ template, occurrence }) => { const paid = occurrence.status === "completed"; const overdue = !paid && new Date(occurrence.dueDate + "T12:00:00") < new Date(); return <article key={template.id} className={`flex items-start gap-4 rounded-2xl border bg-white p-4 ${overdue ? "border-[#efc8bd]" : "border-[#dce1da]"}`}><button type="button" disabled={saving} onClick={() => onToggle(occurrence)} aria-label={paid ? `Marcar ${template.name} como pendiente` : `Marcar ${template.name} como pagado`} className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border ${paid ? "border-[#4f8066] bg-[#4f8066] text-white" : "border-[#aeb9b1] bg-white"}`}>{paid && <Check size={16} />}</button><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className={`font-semibold ${paid ? "text-[#637168] line-through" : ""}`}>{template.name}</h3><p className="mt-1 text-xs text-[#68776e]">{paid ? `Pagado ${occurrence.completedAt ? new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(new Date(occurrence.completedAt)) : ""}` : `${overdue ? "Vencido" : "Vence"} ${new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(new Date(occurrence.dueDate + "T12:00:00"))}`}</p></div><p className="font-semibold tabular-nums">{template.amountType === "approximate" ? "~" : ""}{formatCOP(occurrence.actualAmount ?? occurrence.expectedAmount)}</p></div><p className="mt-2 text-xs text-[#819087]">{paid ? occurrence.completionSource === "bank_email" ? "Detectado por correo" : occurrence.completionSource === "transaction" ? "Vinculado a movimiento" : "Marcado por ti" : template.description || "Responsabilidad recurrente"}</p></div><div className="relative group"><button type="button" aria-label="Opciones" className="grid h-9 w-9 place-items-center rounded-xl hover:bg-[#edf0eb]"><MoreHorizontal size={18} /></button><div className="invisible absolute right-0 top-9 z-10 w-36 rounded-xl border border-[#dce1da] bg-white p-1 opacity-0 shadow-lg group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"><button type="button" onClick={() => onEdit(template)} className="w-full rounded-lg px-3 py-2 text-left text-xs font-medium hover:bg-[#f1f4ef]">Editar</button><button type="button" onClick={() => onDelete(template)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-[#9a4d3b] hover:bg-[#fff4ef]"><Trash2 size={13} />Eliminar</button></div></div></article>; })}</div>;
}

function FixedPaymentEditor({ template, accounts, categories, saving, onClose, onSave }: { template: FixedPaymentTemplate | null; accounts: Array<{ id: string; name: string; institution: string }>; categories: Array<{ id: string; name: string }>; saving: boolean; onClose: () => void; onSave: (template: FixedPaymentTemplate) => Promise<void> }) {
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void onSave({
      id: template?.id ?? crypto.randomUUID(),
      name: String(data.get("name")).trim(),
      description: String(data.get("description")).trim(),
      categoryId: String(data.get("categoryId") || "") || null,
      defaultAccountId: String(data.get("accountId") || "") || null,
      frequency: String(data.get("frequency")) as FixedPaymentTemplate["frequency"],
      nextDueDate: String(data.get("nextDueDate")),
      amountType: String(data.get("amountType")) as FixedPaymentTemplate["amountType"],
      expectedAmount: Number(String(data.get("amount")).replace(/\D/g, "")),
      minimumAmount: null,
      maximumAmount: null,
      reminderDays: [3, 0],
      isActive: true,
    });
  }
  return <Modal title={template ? "Editar pago fijo" : "Nuevo pago fijo"} subtitle="Define la responsabilidad y RutaSaldo la mostrará en cada periodo." onClose={onClose}><form onSubmit={submit} className="space-y-4"><label className="block text-sm font-medium">Nombre<input name="name" required defaultValue={template?.name} placeholder="Ej. Internet hogar" className={fieldClass} /></label><label className="block text-sm font-medium">Descripción<input name="description" defaultValue={template?.description} placeholder="Opcional" className={fieldClass} /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Monto<input name="amount" inputMode="numeric" required defaultValue={template?.expectedAmount || ""} className={fieldClass} /></label><label className="block text-sm font-medium">Tipo de monto<select name="amountType" defaultValue={template?.amountType ?? "exact"} className={fieldClass}><option value="exact">Exacto</option><option value="approximate">Aproximado</option><option value="range">Rango</option></select></label><label className="block text-sm font-medium">Próximo vencimiento<input name="nextDueDate" type="date" required defaultValue={template?.nextDueDate ?? new Date().toISOString().slice(0, 10)} className={fieldClass} /></label><label className="block text-sm font-medium">Frecuencia<select name="frequency" defaultValue={template?.frequency ?? "monthly"} className={fieldClass}><option value="weekly">Semanal</option><option value="biweekly">Quincenal</option><option value="monthly">Mensual</option><option value="bimonthly">Cada dos meses</option><option value="quarterly">Trimestral</option><option value="semiannual">Semestral</option><option value="annual">Anual</option></select></label><label className="block text-sm font-medium">Cuenta habitual<select name="accountId" defaultValue={template?.defaultAccountId ?? ""} className={fieldClass}><option value="">Sin cuenta definida</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.institution} · {account.name}</option>)}</select></label><label className="block text-sm font-medium">Categoría<select name="categoryId" defaultValue={template?.categoryId ?? ""} className={fieldClass}><option value="">Sin categoría</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label></div><button type="submit" disabled={saving} className="h-12 w-full rounded-xl bg-[#17231e] text-sm font-semibold text-white disabled:opacity-50">{saving ? "Guardando…" : "Guardar pago fijo"}</button></form></Modal>;
}
