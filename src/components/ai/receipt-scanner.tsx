"use client";

import {
  AlertTriangle,
  Camera,
  Check,
  ChevronDown,
  Cpu,
  FileText,
  Pencil,
  RotateCcw,
  ScanLine,
  Upload,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { Account, Category, Transaction } from "@/lib/finance";
import { formatCOP } from "@/lib/finance";
import type { RecognizedReceipt } from "@/lib/receipt-ocr";

const inputClass = "mt-1.5 h-11 w-full rounded-xl border border-[#dce1da] bg-white px-3 text-sm outline-none transition focus:border-[#819b8a] focus:ring-2 focus:ring-[#b7f34b]/30";

function digits(value: string) {
  return value.replace(/\D/g, "");
}

function formatAmountInput(value: string) {
  const raw = digits(value);
  return raw ? new Intl.NumberFormat("es-CO").format(Number(raw)) : "";
}

function findCategory(categories: Category[], suggested: string | null) {
  if (!suggested) return categories.find((category) => category.name.toLowerCase() === "otros")?.id ?? categories[0]?.id ?? "";
  const normalized = suggested.toLocaleLowerCase("es");
  return categories.find((category) => {
    const name = category.name.toLocaleLowerCase("es");
    return name.includes(normalized) || normalized.includes(name);
  })?.id ?? categories.find((category) => category.name.toLowerCase() === "otros")?.id ?? categories[0]?.id ?? "";
}

function ProcessingState() {
  return (
    <div className="grid min-h-[22rem] place-items-center rounded-3xl border border-[#dce1da] bg-white p-8 text-center">
      <div className="max-w-sm">
        <div className="relative mx-auto grid h-24 w-24 place-items-center rounded-full bg-[#17231e] text-white">
          <Cpu className="ai-soft-pulse" size={32} />
          <span aria-hidden="true" className="ai-status-dot absolute right-2 top-2 h-3.5 w-3.5 rounded-full border-2 border-[#17231e] bg-[#b7f34b]" />
        </div>
        <div aria-hidden="true" className="mt-5 flex h-7 items-end justify-center gap-1.5">
          {[0, 1, 2, 3, 4, 5, 6].map((index) => (
            <span key={index} className="ocr-activity-bar w-1.5 rounded-full bg-[#789281]" style={{ height: `${10 + ((index * 7) % 18)}px`, animationDelay: `${index * 90}ms` }} />
          ))}
        </div>
        <p className="mt-5 text-lg font-semibold text-[#26372e]">Leyendo tu factura</p>
        <p className="mt-2 text-sm leading-6 text-[#68776e]">Gemini está identificando comercio, total, fecha y categoría para preparar la vista previa.</p>
        <div className="mx-auto mt-6 h-1.5 w-48 overflow-hidden rounded-full bg-[#edf0eb]">
          <div className="ai-progress h-full w-full rounded-full bg-[#819b8a]" />
        </div>
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-[.12em] text-[#819087]">Nada se guardará todavía</p>
        <span className="sr-only" role="status">Analizando factura con inteligencia artificial</span>
      </div>
    </div>
  );
}

export function ReceiptScanner({
  accounts,
  categories,
  onSave,
  onClose,
}: {
  accounts: Account[];
  categories: Category[];
  onSave: (transaction: Transaction) => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [receipt, setReceipt] = useState<RecognizedReceipt | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");

  const previewUrl = useMemo(() => file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null, [file]);
  const selectedAccount = accounts.find((account) => account.id === accountId);
  const selectedCategory = categories.find((category) => category.id === categoryId);
  const canSave = Boolean(accountId && date && Number(digits(amount)) > 0 && description.trim());

  async function analyze(selectedFile = file) {
    if (!selectedFile) return;
    setLoading(true);
    setError("");
    setReceipt(null);
    setEditing(false);
    try {
      const body = new FormData();
      body.append("file", selectedFile);
      const response = await fetch("/api/ai/receipt", { method: "POST", body });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "No se pudo analizar la factura.");
      const recognized = payload as RecognizedReceipt;
      setReceipt(recognized);
      setDescription(recognized.description || recognized.merchant || "Compra registrada desde factura");
      setDate(recognized.date || new Date().toISOString().slice(0, 10));
      setAmount(recognized.total ? formatAmountInput(String(Math.round(recognized.total))) : "");
      setCategoryId(findCategory(categories, recognized.suggestedCategory));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo analizar la factura.");
    } finally {
      setLoading(false);
    }
  }

  function chooseFile(selected: File | null) {
    if (!selected) return;
    setFile(selected);
    setReceipt(null);
    setError("");
    void analyze(selected);
  }

  function retry() {
    setFile(null);
    setReceipt(null);
    setError("");
    setEditing(false);
    setTimeout(() => inputRef.current?.click(), 0);
  }

  function save() {
    if (!canSave) return;
    onSave({
      id: crypto.randomUUID(),
      accountId,
      categoryId: categoryId || null,
      kind: "expense",
      amount: Number(digits(amount)),
      description: description.trim(),
      date,
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/45 p-0 sm:place-items-center sm:p-5" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="receipt-title" className="flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-[#f8f9f5] shadow-2xl sm:max-w-3xl sm:rounded-3xl">
        <header className="flex items-start justify-between border-b border-[#e2e6df] bg-white px-5 py-4 sm:px-6">
          <div>
            <div className="flex items-center gap-2 text-[#4f6c5c]"><ScanLine size={18} /><span className="text-xs font-bold uppercase tracking-[.12em]">OCR de factura</span></div>
            <h2 id="receipt-title" className="mt-1 text-xl font-semibold tracking-tight">Escanear y registrar</h2>
            <p className="mt-1 text-xs text-[#68776e]">Captura, revisa la vista previa y decide cuándo guardar.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="grid h-10 w-10 place-items-center rounded-xl hover:bg-[#f0f3ee]"><X size={19} /></button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          <input ref={inputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} />

          {!file ? (
            <div className="rounded-3xl border border-[#dce1da] bg-white px-6 py-10 text-center sm:px-10 sm:py-14">
              <button type="button" onClick={() => inputRef.current?.click()} className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-[#17231e] text-white shadow-[0_14px_36px_rgba(23,35,30,.18)]" aria-label="Seleccionar factura">
                <Camera size={34} />
              </button>
              <div className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-[#dce1da] bg-[#f8f9f5] px-3 py-1 text-[10px] font-semibold text-[#5e6d63]"><Cpu size={12} /> Asistido por IA</div>
              <h3 className="mt-4 text-xl font-semibold">Toma una foto o selecciona una factura</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#68776e]">Verás lo que RutaSaldo entendió antes de registrar cualquier movimiento.</p>
              <button type="button" onClick={() => inputRef.current?.click()} className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl border border-[#dce1da] bg-white px-5 text-sm font-semibold"><Upload size={17} /> Elegir archivo</button>
              <p className="mt-3 text-[10px] text-[#819087]">JPG, PNG, WEBP o PDF · máximo 8 MB</p>
            </div>
          ) : loading ? (
            <div className="grid gap-5 lg:grid-cols-[15rem_1fr]">
              <aside>
                <div className="relative overflow-hidden rounded-2xl border border-[#c9d3ca] bg-white">
                  {previewUrl ? <img src={previewUrl} alt="Vista previa de la factura" className="max-h-72 w-full object-contain" /> : <div className="grid min-h-52 place-items-center p-5 text-center"><div><FileText className="mx-auto text-[#4f6c5c]" size={34} /><p className="mt-3 break-all text-xs font-medium">{file.name}</p></div></div>}
                  <div aria-hidden="true" className="ocr-preview-glow pointer-events-none absolute inset-0 bg-[#789281]/10" />
                  <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-white/80 bg-white/95 px-3 py-1 text-[9px] font-semibold uppercase tracking-[.1em] text-[#52665a]">Analizando</span>
                </div>
              </aside>
              <ProcessingState />
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-[#efc8bd] bg-[#fff4ef] p-6 text-center text-[#8f4938]">
              <AlertTriangle className="mx-auto" size={30} />
              <h3 className="mt-4 text-lg font-semibold">No se pudo leer la factura</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6">{error}</p>
              <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
                <button type="button" onClick={() => void analyze()} className="h-11 rounded-xl bg-[#17231e] px-5 text-sm font-semibold text-white">Intentar otra vez</button>
                <button type="button" onClick={retry} className="h-11 rounded-xl border border-[#d9b9af] bg-white px-5 text-sm font-semibold">Cambiar archivo</button>
              </div>
            </div>
          ) : receipt ? (
            <div className="space-y-5">
              <div className="rounded-3xl border border-[#dce1da] bg-white p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#edf6ef] px-3 py-1 text-xs font-semibold text-[#486b56]"><Check size={14} /> Vista previa lista</div>
                    <h3 className="mt-4 text-xl font-semibold">Esto es lo que se registrará</h3>
                    <p className="mt-1 text-sm text-[#68776e]">Confirma los datos o abre los detalles para corregirlos.</p>
                  </div>
                  <div className="rounded-2xl bg-[#17231e] px-5 py-4 text-white sm:text-right">
                    <p className="text-xs text-white/65">Gasto</p>
                    <p className="mt-1 text-2xl font-semibold">{amount ? formatCOP(Number(digits(amount))) : "Sin valor"}</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-[#f5f7f3] p-4"><p className="text-xs text-[#718077]">Descripción</p><p className="mt-1 font-semibold">{description || "Sin descripción"}</p></div>
                  <div className="rounded-2xl bg-[#f5f7f3] p-4"><p className="text-xs text-[#718077]">Cuenta</p><p className="mt-1 font-semibold">{selectedAccount ? `${selectedAccount.institution} · ${selectedAccount.name}` : "Sin seleccionar"}</p></div>
                  <div className="rounded-2xl bg-[#f5f7f3] p-4"><p className="text-xs text-[#718077]">Categoría</p><p className="mt-1 font-semibold">{selectedCategory?.name ?? "Sin categoría"}</p></div>
                  <div className="rounded-2xl bg-[#f5f7f3] p-4"><p className="text-xs text-[#718077]">Fecha</p><p className="mt-1 font-semibold">{date || "Sin fecha"}</p></div>
                </div>

                {(receipt.warnings.length > 0 || receipt.confidence.total < 0.8) && (
                  <div className="mt-4 rounded-2xl border border-[#ead9a9] bg-[#fff9e8] p-4 text-xs leading-5 text-[#7d6227]">
                    <div className="flex gap-2"><AlertTriangle className="mt-0.5 shrink-0" size={16} /><div><p className="font-semibold">Revisa los datos señalados</p>{receipt.warnings.map((warning) => <p key={warning} className="mt-1">• {warning}</p>)}</div></div>
                  </div>
                )}

                <button type="button" onClick={() => setEditing((value) => !value)} aria-expanded={editing} className="mt-5 flex w-full items-center justify-between rounded-2xl border border-[#dce1da] px-4 py-3 text-left text-sm font-semibold">
                  <span className="flex items-center gap-2"><Pencil size={16} /> Revisar o editar detalles</span><ChevronDown size={17} className={editing ? "rotate-180" : ""} />
                </button>

                {editing && (
                  <div className="mt-4 space-y-4 border-t border-[#edf0eb] pt-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="text-xs font-semibold text-[#52665a]">Cuenta pagadora<select value={accountId} onChange={(event) => setAccountId(event.target.value)} className={inputClass}><option value="">Selecciona una cuenta</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.institution}</option>)}</select></label>
                      <label className="text-xs font-semibold text-[#52665a]">Categoría<select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className={inputClass}><option value="">Sin categoría</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                      <label className="text-xs font-semibold text-[#52665a]">Valor reconocido<input inputMode="numeric" value={amount} onChange={(event) => setAmount(formatAmountInput(event.target.value))} className={`${inputClass} ${receipt.confidence.total < 0.8 ? "border-[#d6a94d] bg-[#fffdf5]" : ""}`} placeholder="0" /></label>
                      <label className="text-xs font-semibold text-[#52665a]">Fecha<input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={`${inputClass} ${receipt.confidence.date < 0.8 ? "border-[#d6a94d] bg-[#fffdf5]" : ""}`} /></label>
                    </div>
                    <label className="block text-xs font-semibold text-[#52665a]">Descripción<input value={description} onChange={(event) => setDescription(event.target.value)} className={inputClass} placeholder="Compra o comercio" /></label>
                    <details className="rounded-2xl border border-[#dce1da] bg-[#f8f9f5] p-4 text-xs text-[#68776e]">
                      <summary className="cursor-pointer font-semibold text-[#4f6c5c]">Datos detectados en la factura</summary>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2"><p><strong className="text-[#26372e]">Comercio:</strong> {receipt.merchant || "No reconocido"}</p><p><strong className="text-[#26372e]">Factura:</strong> {receipt.invoiceNumber || "No reconocida"}</p><p><strong className="text-[#26372e]">Subtotal:</strong> {receipt.subtotal == null ? "—" : formatCOP(receipt.subtotal)}</p><p><strong className="text-[#26372e]">Impuestos:</strong> {receipt.taxes == null ? "—" : formatCOP(receipt.taxes)}</p></div>
                      {receipt.items.length > 0 && <div className="mt-3 divide-y divide-[#e3e8e2]">{receipt.items.map((item, index) => <div key={`${item.name}-${index}`} className="flex justify-between gap-3 py-2"><span>{item.name || "Producto sin nombre"}</span><span className="shrink-0 font-medium text-[#26372e]">{item.total == null ? "—" : formatCOP(item.total)}</span></div>)}</div>}
                    </details>
                  </div>
                )}
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={retry} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#ccd5cd] bg-white text-sm font-semibold"><RotateCcw size={17} /> Reintentar</button>
                <button type="button" disabled={!canSave} onClick={save} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#17231e] text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"><Check size={17} /> Guardar movimiento</button>
              </div>
              <p className="text-center text-xs text-[#68776e]">Nada se guarda hasta pulsar Guardar movimiento.</p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
