"use client";

import { AlertTriangle, Camera, Cpu, LoaderCircle, RotateCcw, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@/components/modal";
import type { Account, Category, Transaction } from "@/lib/finance";
import { formatCOP } from "@/lib/finance";
import type { RecognizedReceipt } from "@/lib/receipt-ocr";

const inputClass = "mt-1.5 h-11 w-full rounded-xl border border-[#dce1da] bg-white px-3 text-sm outline-none transition focus:border-[#819b8a] focus:ring-2 focus:ring-[#b7f34b]/30";
function digits(value: string) { return value.replace(/\D/g, ""); }
function formatAmountInput(value: string) { const raw = digits(value); return raw ? new Intl.NumberFormat("es-CO").format(Number(raw)) : ""; }
function findCategory(categories: Category[], suggested: string | null) {
  if (!suggested) return categories.find((category) => category.name.toLowerCase() === "otros")?.id ?? categories[0]?.id ?? "";
  const normalized = suggested.toLocaleLowerCase("es");
  return categories.find((category) => { const name = category.name.toLocaleLowerCase("es"); return name.includes(normalized) || normalized.includes(name); })?.id ?? categories.find((category) => category.name.toLowerCase() === "otros")?.id ?? categories[0]?.id ?? "";
}

export function ReceiptScanner({ accounts, categories, onSave, onClose }: { accounts: Account[]; categories: Category[]; onSave: (transaction: Transaction) => void; onClose: () => void; }) {
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

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  async function analyze(selectedFile: File) {
    setLoading(true); setError(""); setReceipt(null);
    try {
      const body = new FormData(); body.append("file", selectedFile);
      const response = await fetch("/api/ai/receipt", { method: "POST", body });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "No se pudo analizar la factura.");
      const recognized = payload as RecognizedReceipt;
      setReceipt(recognized);
      setDescription(recognized.description || recognized.merchant || "Compra registrada desde factura");
      setDate(recognized.date || new Date().toISOString().slice(0, 10));
      setAmount(recognized.total ? formatAmountInput(String(Math.round(recognized.total))) : "");
      setCategoryId(findCategory(categories, recognized.suggestedCategory));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo analizar la factura."); }
    finally { setLoading(false); }
  }

  function chooseFile(selected: File | null) {
    if (!selected) return;
    setFile(selected);
    void analyze(selected);
  }

  function retry() {
    setFile(null); setReceipt(null); setError(""); setAmount(""); setDescription("");
    requestAnimationFrame(() => inputRef.current?.click());
  }

  function save() {
    if (!canSave) return;
    onSave({ id: crypto.randomUUID(), accountId, categoryId: categoryId || null, kind: "expense", amount: Number(digits(amount)), description: description.trim(), date });
  }

  return (
    <Modal title="Escanear factura" subtitle={receipt ? "Revisa o corrige los datos y guarda." : "Selecciona una imagen; el análisis comienza automáticamente."} onClose={onClose}>
      <div className="space-y-5">
        {!file && (
          <section className="rounded-3xl border-2 border-dashed border-[#cbd4cc] bg-[#f8faf7] p-8 text-center sm:p-10">
            <button type="button" onClick={() => inputRef.current?.click()} className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white text-[#17231e] shadow-[0_8px_30px_rgba(23,35,30,.12)]" aria-label="Seleccionar factura"><Camera size={30} /></button>
            <h3 className="mt-4 text-lg font-semibold">Sube o toma una foto</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#68776e]">Al elegirla, Gemini prepara directamente el formulario editable.</p>
            <button type="button" onClick={() => inputRef.current?.click()} className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-[#17231e] px-5 text-sm font-semibold text-white"><Upload size={17} />Subir imagen</button>
            <p className="mt-3 text-[10px] text-[#819087]">JPG, PNG, WEBP o PDF · máximo 8 MB</p>
          </section>
        )}
        <input ref={inputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} />

        {loading && (
          <section className="grid min-h-64 place-items-center rounded-3xl border border-[#dce1da] bg-[#f8faf7] p-8 text-center" role="status">
            <div><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#17231e] text-white"><Cpu className="ai-soft-pulse" size={27} /></span><div className="mx-auto mt-5 flex h-8 items-center justify-center gap-1" aria-hidden="true">{[12,20,28,18,24,14,26].map((height, index) => <span key={`${height}-${index}`} className="ocr-activity-bar w-1 rounded-full bg-[#5f806d]" style={{ height, animationDelay: `${index * 90}ms` }} />)}</div><h3 className="mt-4 text-lg font-semibold">Preparando el formulario</h3><p className="mt-2 text-sm text-[#68776e]">Leyendo comercio, total, fecha y categoría.</p></div>
          </section>
        )}

        {error && <div role="alert" className="rounded-xl border border-[#e8c9bf] bg-[#fff4ef] px-4 py-3 text-sm text-[#914f3d]"><div className="flex gap-2"><AlertTriangle size={17} className="shrink-0" /><p>{error}</p></div><button type="button" onClick={retry} className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-[#17231e] px-4 font-semibold text-white"><RotateCcw size={15} />Reintentar</button></div>}

        {receipt && !loading && (
          <form onSubmit={(event) => { event.preventDefault(); save(); }} className="space-y-4">
            {previewUrl && <div className="mx-auto max-w-48 overflow-hidden rounded-2xl border border-[#dce1da] bg-white"><img src={previewUrl} alt="Factura seleccionada" className="max-h-40 w-full object-contain" /></div>}
            {(receipt.warnings.length > 0 || receipt.confidence.total < 0.8) && <div className="rounded-xl border border-[#ead9a9] bg-[#fff9e8] px-4 py-3 text-xs text-[#7d6227]"><p className="font-semibold">Revisa los datos marcados.</p>{receipt.warnings.slice(0, 2).map((warning) => <p key={warning} className="mt-1">• {warning}</p>)}</div>}
            <label className="block text-sm font-medium">Descripción<input value={description} onChange={(event) => setDescription(event.target.value)} className={inputClass} placeholder="Compra o comercio" /></label>
            <label className="block text-sm font-medium">Valor<input inputMode="numeric" value={amount} onChange={(event) => setAmount(formatAmountInput(event.target.value))} className={`${inputClass} ${receipt.confidence.total < 0.8 ? "border-[#d6a94d] bg-[#fffdf5]" : ""}`} placeholder="0" /><span className="mt-1 block text-xs font-normal text-[#819087]">{amount ? formatCOP(Number(digits(amount))) : "Confirma el total"}</span></label>
            <label className="block text-sm font-medium">Cuenta pagadora<select value={accountId} onChange={(event) => setAccountId(event.target.value)} className={inputClass}><option value="">Selecciona una cuenta</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.institution}</option>)}</select></label>
            <label className="block text-sm font-medium">Categoría<select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className={inputClass}><option value="">Sin categoría</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label className="block text-sm font-medium">Fecha<input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={`${inputClass} ${receipt.confidence.date < 0.8 ? "border-[#d6a94d] bg-[#fffdf5]" : ""}`} /></label>
            <div className="grid gap-2 sm:grid-cols-[1fr_2fr]"><button type="button" onClick={retry} className="h-12 rounded-xl border border-[#cfd8d0] bg-white text-sm font-semibold">Reintentar</button><button type="submit" disabled={!canSave} className="h-12 rounded-xl bg-[#17231e] text-sm font-semibold text-white disabled:opacity-45">Guardar</button></div>
            <p className="text-center text-xs text-[#68776e]">Nada se guarda hasta pulsar Guardar.</p>
          </form>
        )}

        {!loading && file && !receipt && !error && <LoaderCircle className="mx-auto animate-spin" />}
      </div>
    </Modal>
  );
}
