"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Inbox, RefreshCw, ShieldAlert, X } from "lucide-react";

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

const filters = [
  ["all", "Todos"],
  ["pending_review", "Por aprobar"],
  ["imported", "Importados"],
  ["ignored", "Ignorados"],
  ["duplicate", "Duplicados"],
] as const;

const statusLabels: Record<string, string> = {
  pending_review: "Por aprobar",
  imported: "Importado",
  ignored: "Ignorado",
  duplicate: "Duplicado",
  received: "Recibido",
  failed: "Falló",
};

const kindLabels: Record<string, string> = {
  purchase: "Compra",
  withdrawal: "Retiro",
  refund: "Devolución",
  transfer_sent: "Transferencia enviada",
  transfer_received: "Transferencia recibida",
  card_payment: "Pago de tarjeta",
  unknown: "Sin clasificar",
};

function money(value?: number | null) {
  return typeof value === "number" ? new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value) : "Monto no detectado";
}

export function EmailInboxPage() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [filter, setFilter] = useState<(typeof filters)[number][0]>("pending_review");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/finance/email-inbox", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "No se pudo cargar la bandeja");
      setItems(payload.items ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la bandeja");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const visible = useMemo(() => filter === "all" ? items : items.filter((item) => item.processing_status === filter), [filter, items]);
  const pendingCount = items.filter((item) => item.processing_status === "pending_review").length;

  async function act(id: string, action: "approve" | "ignore") {
    setBusyId(id);
    setError(null);
    try {
      const response = await fetch("/api/finance/email-inbox", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "No se pudo procesar el correo");
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "No se pudo procesar el correo");
    } finally {
      setBusyId(null);
    }
  }

  return <section className="max-w-5xl">
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div><h2 className="text-2xl font-semibold tracking-tight">Bandeja bancaria</h2><p className="mt-1 text-sm text-[#5e6d63]">Revisa lo que RutaSaldo leyó en Gmail antes de afectar tus saldos.</p></div>
      <button type="button" onClick={() => void load()} disabled={loading} className="flex items-center gap-2 rounded-xl border border-[#dce1da] bg-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50"><RefreshCw size={16} className={loading ? "animate-spin" : ""} />Actualizar</button>
    </div>

    <div className="mb-5 grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-[#e0e4dd] bg-white p-4"><p className="text-xs text-[#6b786f]">Correos leídos</p><p className="mt-1 text-2xl font-semibold">{items.length}</p></div>
      <div className="rounded-2xl border border-[#eadfbd] bg-[#fffbef] p-4"><p className="text-xs text-[#7c6a3f]">Por aprobar</p><p className="mt-1 text-2xl font-semibold">{pendingCount}</p></div>
      <div className="rounded-2xl border border-[#d7e5db] bg-[#f3f8f4] p-4"><p className="text-xs text-[#587164]">Importados</p><p className="mt-1 text-2xl font-semibold">{items.filter((item) => item.processing_status === "imported").length}</p></div>
    </div>

    <div className="mb-5 flex flex-wrap gap-2">{filters.map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-full px-4 py-2 text-sm font-semibold ${filter === value ? "bg-[#17231e] text-white" : "border border-[#dce1da] bg-white text-[#4f5f56]"}`}>{label}</button>)}</div>

    {error && <div role="alert" className="mb-5 rounded-2xl border border-[#e8c9bf] bg-[#fff4ef] px-4 py-3 text-sm text-[#914f3d]">{error}</div>}

    {loading ? <div className="rounded-3xl border border-[#e0e4dd] bg-white p-8 text-sm text-[#6b786f]">Cargando correos…</div> : visible.length === 0 ? <div className="rounded-3xl border border-[#e0e4dd] bg-white p-10 text-center"><Inbox className="mx-auto text-[#6d7d73]" /><p className="mt-3 font-semibold">No hay correos en esta vista</p><p className="mt-1 text-sm text-[#6b786f]">Los nuevos movimientos aparecerán después de la próxima sincronización.</p></div> : <div className="space-y-3">{visible.map((item) => {
      const transferLike = ["transfer_sent", "transfer_received", "card_payment"].includes(item.parsed.kind ?? "");
      return <article key={item.id} className="rounded-3xl border border-[#e0e4dd] bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#eef3ef] px-2.5 py-1 text-xs font-semibold text-[#4f6c5c]">{statusLabels[item.processing_status] ?? item.processing_status}</span><span className="text-xs text-[#738078]">{new Date(item.received_at).toLocaleString("es-CO")}</span></div>
            <h3 className="mt-3 truncate font-semibold">{item.parsed.description || item.subject}</h3>
            <p className="mt-1 text-sm text-[#637168]">{kindLabels[item.parsed.kind ?? "unknown"] ?? item.parsed.kind} · {item.parsed.institution ?? "Banco no identificado"}</p>
            <p className="mt-3 text-xl font-semibold">{money(item.parsed.amount)}</p>
            <div className="mt-3 grid gap-1 text-xs text-[#6b786f] sm:grid-cols-2"><p>Cuenta: {item.account_name ?? "Sin asociar"}</p><p>Confianza: {Math.round(item.confidence * 100)}%</p>{item.parsed.reference && <p>Referencia: {item.parsed.reference}</p>}<p>Remitente: {item.sender}</p></div>
          </div>
          {item.processing_status === "pending_review" && <div className="flex shrink-0 flex-wrap gap-2">
            {!transferLike && <button type="button" disabled={busyId === item.id} onClick={() => void act(item.id, "approve")} className="flex items-center gap-2 rounded-xl bg-[#17231e] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Check size={16} />Aprobar</button>}
            <button type="button" disabled={busyId === item.id} onClick={() => void act(item.id, "ignore")} className="flex items-center gap-2 rounded-xl border border-[#e3c8bf] px-4 py-2.5 text-sm font-semibold text-[#8b4d3d] disabled:opacity-50"><X size={16} />Ignorar</button>
          </div>}
        </div>
        {transferLike && item.processing_status === "pending_review" && <div className="mt-4 flex gap-3 rounded-2xl border border-[#eadfbd] bg-[#fffbef] p-4 text-sm text-[#745f2d]"><ShieldAlert size={18} className="mt-0.5 shrink-0" /><p>Este correo parece una transferencia o pago de tarjeta. Debe conciliarse con otro movimiento antes de modificar saldos.</p></div>}
      </article>;
    })}</div>}
  </section>;
}
