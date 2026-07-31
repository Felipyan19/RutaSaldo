"use client";

import { AlertTriangle, Camera, FileText, LoaderCircle, RotateCcw, ScanLine, Upload, X } from "lucide-react";
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
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");

  const previewUrl = useMemo(() => file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null, [file]);
  const canSave = Boolean(accountId && date && Number(digits(amount)) > 0 && description.trim());

  async function analyze(selectedFile = file) {
    if (!selectedFile) return;
    setLoading(true);
    setError("");
    setReceipt(null);
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
            <h2 id="receipt-title" className="mt-1 text-xl font-semibold tracking-tight">Escanear y revisar</h2>
            <p className="mt-1 text-xs text-[#68776e]">La IA completa un borrador. Nada se guarda sin tu confirmación.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="grid h-10 w-10 place-items-center rounded-xl hover:bg-[#f0f3ee]"><X size={19} /></button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          {!file ? (
            <div className="rounded-3xl border-2 border-dashed border-[#cbd4cc] bg-white p-8 text-center sm:p-12">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#eef3ef] text-[#4f6c5c]"><Camera size={28} /></span>
              <h3 className="mt-4 text-lg font-semibold">Toma una foto o sube un archivo</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#68776e]">Acepta JPG, PNG, WEBP y PDF de hasta 8 MB. Usa una imagen enfocada y con buena luz.</p>
              <input ref={inputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} />
              <button type="button" onClick={() => inputRef.current?.click()} className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-[#17231e] px-5 text-sm font-semibold text-white"><Upload size={17} /> Seleccionar factura</button>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[15rem_1fr]">
              <aside className="space-y-3">
                <div className="overflow-hidden rounded-2xl border border-[#dce1da] bg-white">
                  {previewUrl ? <img src={previewUrl} alt="Vista previa de la factura" className="max-h-72 w-full object-contain" /> : (
                    <div className="grid min-h-52 place-items-center p-5 text-center"><div><FileText className="mx-auto text-[#4f6c5c]" size={34} /><p className="mt-3 break-all text-xs font-medium">{file.name}</p></div></div>
                  )}
                </div>
                <button type="button" onClick={() => inputRef.current?.click()} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#dce1da] bg-white text-sm font-semibold"><RotateCcw size={16} /> Cambiar archivo</button>
                <input ref={inputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} />
              </aside>

              <div>
                {loading ? (
                  <div className="grid min-h-72 place-items-center rounded-2xl border border-[#dce1da] bg-white p-8 text-center">
                    <div><LoaderCircle className="mx-auto animate-spin text-[#4f6c5c]" size={30} /><p className="mt-4 text-sm font-semibold">Analizando factura…</p><p className="mt-1 text-xs text-[#68776e]">Buscando comercio, fecha, total y categoría.</p></div>
                  </div>
                ) : error ? (
                  <div className="rounded-2xl border border-[#efc8bd] bg-[#fff4ef] p-5 text-sm text-[#8f4938]">
                    <div className="flex gap-3"><AlertTriangle className="shrink-0" size={20} /><div><p className="font-semibold">No se pudo completar el análisis</p><p className="mt-1 leading-6">{error}</p></div></div>
                    <button type="button" onClick={() => void analyze()} className="mt-4 h-10 rounded-xl bg-[#17231e] px-4 text-sm font-semibold text-white">Intentar de nuevo</button>
                  </div>
                ) : receipt ? (
                  <div className="space-y-5">
                    {(receipt.warnings.length > 0 || receipt.confidence.total < 0.8) && (
                      <div className="rounded-2xl border border-[#ead9a9] bg-[#fff9e8] p-4 text-xs leading-5 text-[#7d6227]">
                        <div className="flex gap-2"><AlertTriangle className="mt-0.5 shrink-0" size={16} /><div><p className="font-semibold">Revisa los datos resaltados</p>{receipt.warnings.map((warning) => <p key={warning} className="mt-1">• {warning}</p>)}</div></div>
                      </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="text-xs font-semibold text-[#52665a]">Cuenta pagadora<select value={accountId} onChange={(event) => setAccountId(event.target.value)} className={inputClass}><option value="">Selecciona una cuenta</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.institution}</option>)}</select></label>
                      <label className="text-xs font-semibold text-[#52665a]">Categoría<select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className={inputClass}><option value="">Sin categoría</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                      <label className="text-xs font-semibold text-[#52665a]">Valor reconocido<input inputMode="numeric" value={amount} onChange={(event) => setAmount(formatAmountInput(event.target.value))} className={`${inputClass} ${receipt.confidence.total < 0.8 ? "border-[#d6a94d] bg-[#fffdf5]" : ""}`} placeholder="0" /><span className="mt-1 block font-normal text-[#819087]">{amount ? formatCOP(Number(digits(amount))) : "Confirma el total"}</span></label>
                      <label className="text-xs font-semibold text-[#52665a]">Fecha<input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={`${inputClass} ${receipt.confidence.date < 0.8 ? "border-[#d6a94d] bg-[#fffdf5]" : ""}`} /></label>
                    </div>
                    <label className="block text-xs font-semibold text-[#52665a]">Descripción<input value={description} onChange={(event) => setDescription(event.target.value)} className={inputClass} placeholder="Compra o comercio" /></label>

                    <div className="rounded-2xl border border-[#dce1da] bg-white p-4 text-xs text-[#68776e]">
                      <div className="grid gap-2 sm:grid-cols-2"><p><strong className="text-[#26372e]">Comercio:</strong> {receipt.merchant || "No reconocido"}</p><p><strong className="text-[#26372e]">Factura:</strong> {receipt.invoiceNumber || "No reconocida"}</p><p><strong className="text-[#26372e]">Subtotal:</strong> {receipt.subtotal == null ? "—" : formatCOP(receipt.subtotal)}</p><p><strong className="text-[#26372e]">Impuestos:</strong> {receipt.taxes == null ? "—" : formatCOP(receipt.taxes)}</p></div>
                      {receipt.items.length > 0 && <details className="mt-3"><summary className="cursor-pointer font-semibold text-[#4f6c5c]">Ver {receipt.items.length} productos detectados</summary><div className="mt-2 divide-y divide-[#edf0eb]">{receipt.items.map((item, index) => <div key={`${item.name}-${index}`} className="flex justify-between gap-3 py-2"><span>{item.name || "Producto sin nombre"}</span><span className="shrink-0 font-medium text-[#26372e]">{item.total == null ? "—" : formatCOP(item.total)}</span></div>)}</div></details>}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {receipt && !loading && (
          <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-[#e2e6df] bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button type="button" onClick={onClose} className="h-11 rounded-xl border border-[#dce1da] px-5 text-sm font-semibold">Cancelar</button>
            <button type="button" disabled={!canSave} onClick={save} className="h-11 rounded-xl bg-[#17231e] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Guardar movimiento revisado</button>
          </footer>
        )}
      </section>
    </div>
  );
}
