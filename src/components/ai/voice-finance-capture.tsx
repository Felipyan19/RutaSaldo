"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Check, LoaderCircle, Mic, MicOff, RotateCcw, Sparkles } from "lucide-react";
import { Modal } from "@/components/modal";
import type { Account, Category, Transaction, TransactionKind, Transfer } from "@/lib/finance";
import { formatCOP } from "@/lib/finance";
import { scoreVoiceHint, type VoiceFinanceDraft } from "@/lib/voice-finance";

type SpeechRecognitionEventLike = {
  resultIndex?: number;
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
};
type SpeechRecognitionErrorLike = { error: string };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const inputClass = "mt-1.5 h-11 w-full rounded-xl border border-[#dce1da] bg-white px-3 text-sm outline-none transition focus:border-[#819b8a] focus:ring-2 focus:ring-[#b7f34b]/30";
const waveHeights = [10, 18, 27, 16, 32, 22, 13, 25, 17, 29, 14, 21];

function digits(value: string) {
  return value.replace(/\D/g, "");
}

function formatAmount(value: string | number | null) {
  const raw = digits(String(value ?? ""));
  return raw ? new Intl.NumberFormat("es-CO").format(Number(raw)) : "";
}

function accountCandidates(accounts: Account[]) {
  return accounts.map((account) => ({ id: account.id, labels: [account.name, account.institution, `${account.institution} ${account.name}`] }));
}

function categoryCandidates(categories: Category[]) {
  return categories.map((category) => ({ id: category.id, labels: [category.name] }));
}

export function VoiceFinanceCapture({
  accounts,
  categories,
  onSaveTransaction,
  onSaveTransfer,
  onClose,
}: {
  accounts: Account[];
  categories: Category[];
  onSaveTransaction: (transaction: Transaction) => void;
  onSaveTransfer: (transfer: Transfer) => void;
  onClose: () => void;
}) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef("");
  const shouldAnalyzeOnEndRef = useRef(false);
  const finalTranscriptRef = useRef("");

  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<VoiceFinanceDraft | null>(null);
  const [operation, setOperation] = useState<"expense" | "income" | "transfer">("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [sourceAccountId, setSourceAccountId] = useState(accounts[0]?.id ?? "");
  const [destinationAccountId, setDestinationAccountId] = useState(accounts.find((account) => account.id !== accounts[0]?.id)?.id ?? "");
  const [categoryId, setCategoryId] = useState(categories.find((category) => category.name !== "Ingresos")?.id ?? categories[0]?.id ?? "");
  const [showDetails, setShowDetails] = useState(false);

  const speechSupported = typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  const canConfirm = useMemo(() => {
    const validBase = Number(digits(amount)) > 0 && Boolean(description.trim() && date && sourceAccountId);
    return operation === "transfer" ? validBase && Boolean(destinationAccountId) && destinationAccountId !== sourceAccountId : validBase;
  }, [amount, date, description, destinationAccountId, operation, sourceAccountId]);

  const sourceAccount = accounts.find((account) => account.id === sourceAccountId);
  const destinationAccount = accounts.find((account) => account.id === destinationAccountId);
  const category = categories.find((item) => item.id === categoryId);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  function resetCapture() {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    transcriptRef.current = "";
    finalTranscriptRef.current = "";
    shouldAnalyzeOnEndRef.current = false;
    setTranscript("");
    setInterimTranscript("");
    setListening(false);
    setLoading(false);
    setError("");
    setDraft(null);
    setShowDetails(false);
  }

  function stopListening() {
    shouldAnalyzeOnEndRef.current = true;
    recognitionRef.current?.stop();
    setListening(false);
  }

  function startListening() {
    const Constructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Constructor) {
      setError("Este navegador no permite dictado. Usa Chrome o escribe la frase manualmente.");
      return;
    }

    resetCapture();
    const recognition = new Constructor();
    recognition.lang = "es-CO";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      let finalized = finalTranscriptRef.current;
      let interim = "";
      const start = event.resultIndex ?? 0;
      for (let index = start; index < event.results.length; index += 1) {
        const phrase = event.results[index][0].transcript.trim();
        if (!phrase) continue;
        if (event.results[index].isFinal) finalized = `${finalized} ${phrase}`.trim();
        else interim = `${interim} ${phrase}`.trim();
      }
      finalTranscriptRef.current = finalized;
      const combined = `${finalized} ${interim}`.trim();
      transcriptRef.current = combined;
      setTranscript(finalized);
      setInterimTranscript(interim);
    };
    recognition.onerror = (event) => {
      shouldAnalyzeOnEndRef.current = false;
      setListening(false);
      const message = event.error === "not-allowed"
        ? "Permite el acceso al micrófono para usar el registro por voz."
        : event.error === "no-speech"
          ? "No escuché ninguna frase. Pulsa Reintentar y habla cerca del micrófono."
          : "El dictado se interrumpió. Intenta nuevamente.";
      setError(message);
    };
    recognition.onend = () => {
      setListening(false);
      setInterimTranscript("");
      const text = transcriptRef.current.trim();
      if (shouldAnalyzeOnEndRef.current && text.length >= 3) {
        shouldAnalyzeOnEndRef.current = false;
        void analyze(text);
      }
    };
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  async function analyze(explicitTranscript?: string) {
    const cleanTranscript = (explicitTranscript ?? `${transcript} ${interimTranscript}`).trim();
    if (cleanTranscript.length < 3) {
      setError("Di o escribe el movimiento que deseas registrar.");
      return;
    }

    transcriptRef.current = cleanTranscript;
    setTranscript(cleanTranscript);
    setInterimTranscript("");
    setLoading(true);
    setError("");
    setDraft(null);
    try {
      const response = await fetch("/api/ai/voice-finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: cleanTranscript }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "No se pudo interpretar la frase.");
      const recognized = payload as VoiceFinanceDraft;
      setDraft(recognized);

      const nextOperation = recognized.operation === "transfer" ? "transfer" : recognized.operation === "income" ? "income" : "expense";
      setOperation(nextOperation);
      setAmount(formatAmount(recognized.amount ? Math.round(recognized.amount) : null));
      setDescription(recognized.description ?? "");
      setDate(recognized.date ?? new Date().toISOString().slice(0, 10));

      const matchedSource = scoreVoiceHint(recognized.sourceAccountHint, accountCandidates(accounts));
      const matchedDestination = scoreVoiceHint(recognized.destinationAccountHint, accountCandidates(accounts));
      const matchedCategory = scoreVoiceHint(recognized.categoryHint, categoryCandidates(categories));
      if (matchedSource) setSourceAccountId(matchedSource);
      if (matchedDestination && matchedDestination !== matchedSource) setDestinationAccountId(matchedDestination);
      if (nextOperation === "income") {
        setCategoryId(categories.find((item) => item.name === "Ingresos")?.id ?? matchedCategory ?? categories[0]?.id ?? "");
      } else if (matchedCategory) setCategoryId(matchedCategory);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo interpretar la frase.");
    } finally {
      setLoading(false);
    }
  }

  function confirm() {
    if (!canConfirm) return;
    const numericAmount = Number(digits(amount));
    if (operation === "transfer") {
      onSaveTransfer({ id: crypto.randomUUID(), fromAccountId: sourceAccountId, toAccountId: destinationAccountId, amount: numericAmount, description: description.trim(), date });
      return;
    }
    onSaveTransaction({ id: crypto.randomUUID(), kind: operation as TransactionKind, description: description.trim(), amount: numericAmount, accountId: sourceAccountId, categoryId: categoryId || null, date });
  }

  const combinedTranscript = `${transcript} ${interimTranscript}`.trim();

  return (
    <Modal title="Registrar por voz" subtitle={draft ? "Revisa lo que RutaSaldo va a guardar." : "Habla con naturalidad. Verás la frase mientras la dices."} onClose={() => { recognitionRef.current?.abort(); onClose(); }}>
      <div className="space-y-5">
        {!draft && !loading && (
          <section className={`rounded-3xl border p-5 text-center transition-colors ${listening ? "border-[#9eb68d] bg-[#f1f7ee]" : "border-[#dce1da] bg-[#f8faf7]"}`} aria-live="polite">
            <button
              type="button"
              onClick={listening ? stopListening : startListening}
              aria-label={listening ? "Detener dictado" : "Iniciar dictado"}
              className={`mx-auto grid h-20 w-20 place-items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7aa52f] ${listening ? "bg-[#17231e] text-white" : "bg-white text-[#17231e] shadow-[0_8px_30px_rgba(23,35,30,.12)]"}`}
            >
              {listening ? <MicOff size={30} /> : <Mic size={30} />}
            </button>

            <p className="mt-4 text-base font-semibold">{listening ? "Te estoy escuchando" : combinedTranscript ? "Dictado detenido" : "Pulsa el micrófono para hablar"}</p>
            <p className="mt-1 text-xs text-[#68776e]">{listening ? "Pulsa de nuevo cuando termines" : "Ejemplo: Gasté 35 mil en mercado con Nequi"}</p>

            <div className="mx-auto mt-5 flex h-9 max-w-52 items-center justify-center gap-1" aria-hidden="true">
              {waveHeights.map((height, index) => (
                <span
                  key={`${height}-${index}`}
                  className={`w-1 rounded-full bg-[#5f806d] ${listening ? "voice-wave-bar" : "opacity-25"}`}
                  style={{ height, animationDelay: `${index * 70}ms` }}
                />
              ))}
            </div>

            <div className="mt-5 min-h-28 rounded-2xl border border-[#dce1da] bg-white px-4 py-5 text-left">
              {combinedTranscript ? (
                <p className="text-lg leading-8 tracking-[-0.02em] text-[#26372e]">
                  {transcript}{transcript && interimTranscript ? " " : ""}<span className="text-[#829087]">{interimTranscript}</span>
                  {listening && <span className="voice-caret ml-1 inline-block h-5 w-0.5 bg-[#6f8f7c] align-middle" />}
                </p>
              ) : (
                <p className="text-sm leading-6 text-[#94a098]">Tus palabras aparecerán aquí en tiempo real…</p>
              )}
            </div>

            {!listening && combinedTranscript && (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <button type="button" onClick={() => void analyze()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#17231e] px-5 text-sm font-semibold text-white"><Sparkles size={17} />Crear vista previa</button>
                <button type="button" onClick={resetCapture} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#cfd8d0] bg-white px-5 text-sm font-semibold"><RotateCcw size={16} />Reintentar</button>
              </div>
            )}
            {!speechSupported && <p className="mt-3 text-xs text-[#8a6328]">Tu navegador no admite dictado en vivo. Abre RutaSaldo en Chrome.</p>}
          </section>
        )}

        {loading && (
          <section className="grid min-h-72 place-items-center rounded-3xl border border-[#dce1da] bg-[#f8faf7] p-8 text-center" role="status">
            <div>
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#17231e] text-white"><LoaderCircle size={28} className="animate-spin" /></span>
              <h3 className="mt-5 text-lg font-semibold">Preparando tu movimiento</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#68776e]">Gemini está identificando tipo, valor, cuenta y categoría. Todavía no se ha guardado nada.</p>
              <p className="mt-4 rounded-xl bg-white px-4 py-3 text-sm italic text-[#52665a]">“{transcript}”</p>
            </div>
          </section>
        )}

        {error && <p role="alert" className="rounded-xl border border-[#e8c9bf] bg-[#fff4ef] px-4 py-3 text-sm text-[#914f3d]">{error}</p>}

        {draft && (
          <section className="space-y-4">
            <div className="rounded-3xl border border-[#d8e4dc] bg-[#f3f8f4] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#4f6c5c]">Vista previa</span>
                  <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em]">{operation === "expense" ? "Registrar gasto" : operation === "income" ? "Registrar ingreso" : "Realizar transferencia"}</h3>
                  <p className="mt-1 text-sm text-[#68776e]">Esto es lo que ocurrirá cuando pulses Guardar.</p>
                </div>
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${operation === "expense" ? "bg-[#fff0ec] text-[#a65343]" : "bg-[#eaf5ed] text-[#3f7258]"}`}>
                  {operation === "expense" ? <ArrowUpRight size={20} /> : operation === "income" ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                </span>
              </div>

              <p className="mt-5 text-3xl font-semibold tracking-[-0.04em]">{amount ? formatCOP(Number(digits(amount))) : "Valor pendiente"}</p>
              <p className="mt-2 font-medium">{description || "Descripción pendiente"}</p>

              <dl className="mt-5 grid gap-3 rounded-2xl bg-white p-4 text-sm sm:grid-cols-2">
                <div><dt className="text-xs text-[#738078]">{operation === "transfer" ? "Cuenta origen" : "Cuenta"}</dt><dd className="mt-1 font-semibold">{sourceAccount?.name ?? "Sin seleccionar"}</dd></div>
                {operation === "transfer" ? <div><dt className="text-xs text-[#738078]">Cuenta destino</dt><dd className="mt-1 font-semibold">{destinationAccount?.name ?? "Sin seleccionar"}</dd></div> : <div><dt className="text-xs text-[#738078]">Categoría</dt><dd className="mt-1 font-semibold">{category?.name ?? "Sin categoría"}</dd></div>}
                <div><dt className="text-xs text-[#738078]">Fecha</dt><dd className="mt-1 font-semibold">{date}</dd></div>
                <div><dt className="text-xs text-[#738078]">Confianza</dt><dd className="mt-1 font-semibold">{Math.round(draft.confidence * 100)}%</dd></div>
              </dl>
            </div>

            {draft.clarificationQuestion && <div className="flex gap-2 rounded-xl border border-[#eadfbd] bg-[#fffbef] px-4 py-3 text-sm text-[#745f2d]"><AlertTriangle size={17} className="mt-0.5 shrink-0" /><p>{draft.clarificationQuestion}</p></div>}

            <button type="button" onClick={() => setShowDetails((value) => !value)} className="text-sm font-semibold text-[#52665a] underline underline-offset-4">{showDetails ? "Ocultar detalles" : "Revisar o editar detalles"}</button>

            {showDetails && (
              <div className="space-y-4 rounded-2xl border border-[#e0e4dd] bg-white p-4">
                <div className="grid grid-cols-3 rounded-xl bg-[#edf0eb] p-1">
                  {(["expense", "income", "transfer"] as const).map((value) => <button key={value} type="button" onClick={() => setOperation(value)} aria-pressed={operation === value} className={`h-10 rounded-lg text-xs font-semibold sm:text-sm ${operation === value ? "bg-white shadow-sm" : "text-[#5e6d63]"}`}>{value === "expense" ? "Gasto" : value === "income" ? "Ingreso" : "Transferencia"}</button>)}
                </div>
                <label className="block text-sm font-medium">Descripción<input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={200} className={inputClass} /></label>
                <label className="block text-sm font-medium">Valor<input value={amount} onChange={(event) => setAmount(formatAmount(event.target.value))} inputMode="numeric" className={inputClass} /></label>
                <label className="block text-sm font-medium">{operation === "transfer" ? "Desde" : "Cuenta"}<select value={sourceAccountId} onChange={(event) => setSourceAccountId(event.target.value)} className={inputClass}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.institution} · {account.name}</option>)}</select></label>
                {operation === "transfer" ? <label className="block text-sm font-medium">Hacia<select value={destinationAccountId} onChange={(event) => setDestinationAccountId(event.target.value)} className={inputClass}>{accounts.filter((account) => account.id !== sourceAccountId).map((account) => <option key={account.id} value={account.id}>{account.institution} · {account.name}</option>)}</select></label> : <label className="block text-sm font-medium">Categoría<select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className={inputClass}>{categories.filter((item) => operation === "income" ? item.name === "Ingresos" : item.name !== "Ingresos").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
                <label className="block text-sm font-medium">Fecha<input value={date} onChange={(event) => setDate(event.target.value)} type="date" className={inputClass} /></label>
              </div>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={resetCapture} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#cfd8d0] bg-white text-sm font-semibold"><RotateCcw size={17} />Reintentar</button>
              <button type="button" onClick={confirm} disabled={!canConfirm} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#17231e] text-sm font-semibold text-white disabled:opacity-45"><Check size={17} />Guardar</button>
            </div>
            <p className="text-center text-xs text-[#68776e]">Nada se guarda hasta que pulses Guardar.</p>
          </section>
        )}
      </div>
    </Modal>
  );
}
