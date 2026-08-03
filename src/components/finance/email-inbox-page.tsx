"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Inbox, RefreshCw, ShieldAlert, X } from "lucide-react";
import { useFinance } from "./finance-provider";

type InboxAccount = { id: string; name: string; institution: string; kind: string };
type InboxItem = {
  id: string;
  subject: string;
  sender: string;
  received_at: string;
  processing_status: string;
  movement_status: string;
  account_id: string | null;
  transaction_id: string | null;
  account_name: string | null;
  confidence: number;
  parsed: {
    institution?: string;
    kind?: string;
    amount?: number | null;
    description?: string;
    merchant?: string | null;
    reference?: string | null;
    accountLastFour?: string | null;
    destinationLastFour?: string | null;
  };
};

const filters = [["all", "Todos"], ["pending_review", "Por revisar"], ["imported", "Importados"], ["ignored", "Ignorados"], ["duplicate", "Duplicados"]] as const;
const statusLabels: Record<string, string> = { pending_review: "Por revisar", imported: "Importado", ignored: "Ignorado", duplicate: "Duplicado", received: "Recibido", failed: "Falló" };
const kindLabels: Record<string, string> = { purchase: "Compra", withdrawal: "Retiro", refund: "Devolución", transfer_sent: "Transferencia enviada", transfer_received: "Transferencia recibida", card_payment: "Pago de tarjeta", unknown: "Sin clasificar" };

function money(value?: number | null) {
  return typeof value === "number" ? new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value) : "Monto no detectado";
}

export function EmailInboxPage() {
  const { refreshState } = useFinance();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [accounts, setAccounts] = useState<InboxAccount[]>([]);
  const [filter, setFilter] = useState<(typeof filters)[number][0]>("pending_review");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/finance/email-inbox", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "No se pudo cargar la bandeja");
      setItems(payload.items ?? []);
      setAccounts(payload.accounts ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la bandeja");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const heading = document.querySelector("main > header h1");
    const previous = heading?.textContent;
    if (heading) heading.textContent = "Bandeja bancaria";
    return () => { if (heading && previous) heading.textContent = previous; };
  }, []);

  const visible = useMemo(() => filter === "all" ? items : items.filter((item) => item.processing_status === filter), [filter, items]);
  const pendingCount = items.filter((item) => item.processing_status === "pending_review").length;

  async function syncNow() {
    setSyncing(true); setError(null); setNotice(null);
    try {
      const response = await fetch("/api/finance/email-sync/manual", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "No se pudo sincronizar Gmail");
      const scanned = (payload.results ?? []).reduce((total: number, item: { scanned?: number }) => total + (item.scanned ?? 0), 0);
      const pending = (payload.results ?? []).reduce((total: number, item: { pendingReview?: number }) => total + (item.pendingReview ?? 0), 0);
      setNotice(scanned ? `Se revisaron ${scanned} correos. ${pending} quedaron por revisar.` : "Gmail está al día. No se encontraron correos nuevos.");
      await load();
    } catch (syncError) { setError(syncError instanceof Error ? syncError.message : "No se pudo sincronizar Gmail"); }
    finally { setSyncing(false); }
  }

  async function act(id: string, action: "approve" | "ignore", accountId?: string) {
    setBusyId(id); setError(null); setNotice(null);
    try {
      const response = await fetch("/api/finance/email-inbox", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, action, accountId }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "No se pudo procesar el correo");
      if (action === "approve") await refreshState();
      setNotice(action === "approve" ? "Movimiento aprobado. Ya aparece en el historial y las notificaciones." : "Correo ignorado sin modificar saldos.");
      await load();
    } catch (actionError) { setError(actionError instanceof Error ? actionError.message : "No se pudo procesar el correo"); }
    finally { setBusyId(null); }
  }

  async function assignAccount(id: string, accountId: string) {
    if (!accountId) return;
    setBusyId(id); setError(null); setNotice(null);
    try {
      const response = await fetch("/api/finance/email-inbox", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, action: "assign_account", accountId }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "No se pudo asociar la cuenta");
      setNotice("Cuenta asociada. Ya puedes aprobar el movimiento.");
      await load();
    } catch (assignError) { setError(assignError instanceof Error ? assignError.message : "No se pudo asociar la cuenta"); }
    finally { setBusyId(null); }
  }

  return <section className="mx-auto max-w-7xl">
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><h2 className="text-2xl font-semibold tracking-tight">Bandeja bancaria</h2><p className="mt-1 text-sm text-[#5e6d63]">Revisa los correos detectados antes de que afecten tus saldos.</p></div>
      <button type="button" onClick={() => void syncNow()} disabled={syncing || loading} className="flex w-fit items-center gap-2 rounded-xl bg-[#17231e] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><RefreshCw size={16} className={syncing ? "animate-spin" : ""} />{syncing ? "Sincronizando…" : "Sincronizar Gmail"}</button>
    </div>

    <div className="mb-5 grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-[#e0e4dd] bg-white p-4"><p className="text-xs text-[#6b786f]">Correos detectados</p><p className="mt-1 text-2xl font-semibold">{items.length}</p></div>
      <div className="rounded-2xl border border-[#eadfbd] bg-[#fffbef] p-4"><p className="text-xs text-[#7c6a3f]">Por revisar</p><p className="mt-1 text-2xl font-semibold">{pendingCount}</p></div>
      <div className="rounded-2xl border border-[#d7e5db] bg-[#f3f8f4] p-4"><p className="text-xs text-[#587164]">Importados</p><p className="mt-1 text-2xl font-semibold">{items.filter((item) => item.processing_status === "imported").length}</p></div>
    </div>

    <div className="mb-5 flex gap-2 overflow-x-auto pb-1">{filters.map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${filter === value ? "bg-[#17231e] text-white" : "border border-[#dce1da] bg-white text-[#4f5f56]"}`}>{label}</button>)}</div>
    {notice && <div aria-live="polite" className="mb-5 rounded-2xl border border-[#d7e5db] bg-[#f3f8f4] px-4 py-3 text-sm text-[#3f604f]">{notice}</div>}
    {error && <div role="alert" className="mb-5 rounded-2xl border border-[#e8c9bf] bg-[#fff4ef] px-4 py-3 text-sm text-[#914f3d]">{error}</div>}

    {loading ? <div className="rounded-3xl border border-[#e0e4dd] bg-white p-8 text-sm text-[#6b786f]">Cargando correos…</div> : visible.length === 0 ? <div className="rounded-3xl border border-[#e0e4dd] bg-white p-10 text-center"><Inbox className="mx-auto text-[#6d7d73]" /><p className="mt-3 font-semibold">No hay correos en esta vista</p><p className="mt-1 text-sm text-[#6b786f]">Usa “Sincronizar Gmail” para buscar nuevos movimientos.</p></div> : <div className="space-y-3">{visible.map((item) => {
      const transferLike = ["transfer_sent", "transfer_received", "card_payment"].includes(item.parsed.kind ?? "");
      return <article key={item.id} className="rounded-3xl border border-[#e0e4dd] bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#eef3ef] px-2.5 py-1 text-xs font-semibold text-[#4f6c5c]">{statusLabels[item.processing_status] ?? item.processing_status}</span><span className="text-xs text-[#738078]">{new Date(item.received_at).toLocaleString("es-CO")}</span></div>
            <h3 className="mt-3 break-words font-semibold">{item.parsed.description || item.subject}</h3>
            <p className="mt-1 text-sm text-[#637168]">{kindLabels[item.parsed.kind ?? "unknown"] ?? item.parsed.kind} · {item.parsed.institution ?? "Banco no identificado"}</p>
            <p className="mt-3 text-xl font-semibold">{money(item.parsed.amount)}</p>
            <div className="mt-3 grid gap-1 text-xs text-[#6b786f] sm:grid-cols-2"><p>Cuenta: {item.account_name ?? "Sin asociar"}</p><p>Confianza: {Math.round(item.confidence * 100)}%</p>{item.parsed.reference && <p>Referencia: {item.parsed.reference}</p>}<p className="break-all">Remitente: {item.sender}</p></div>
            {!item.account_id && item.processing_status === "pending_review" && <label className="mt-4 block max-w-sm text-xs font-semibold text-[#52665a]">Seleccionar cuenta<select defaultValue="" disabled={busyId === item.id} onChange={(event) => void assignAccount(item.id, event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-[#dce1da] bg-white px-3 text-sm font-normal"><option value="" disabled>Elige una cuenta</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.institution}</option>)}</select></label>}
          </div>
          {item.processing_status === "pending_review" && <div className="flex shrink-0 flex-wrap gap-2">
            {!transferLike && item.account_id && <button type="button" disabled={busyId === item.id} onClick={() => void act(item.id, "approve")} className="flex items-center gap-2 rounded-xl bg-[#17231e] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Check size={16} />Aprobar</button>}
            <button type="button" disabled={busyId === item.id} onClick={() => void act(item.id, "ignore")} className="flex items-center gap-2 rounded-xl border border-[#e3c8bf] px-4 py-2.5 text-sm font-semibold text-[#8b4d3d] disabled:opacity-50"><X size={16} />Ignorar</button>
          </div>}
        </div>
        {transferLike && item.processing_status === "pending_review" && <div className="mt-4 flex gap-3 rounded-2xl border border-[#eadfbd] bg-[#fffbef] p-4 text-sm text-[#745f2d]"><ShieldAlert size={18} className="mt-0.5 shrink-0" /><p>Este correo parece una transferencia o un pago de tarjeta. Debe conciliarse antes de modificar saldos.</p></div>}
      </article>;
    })}</div>}
  </section>;
}
