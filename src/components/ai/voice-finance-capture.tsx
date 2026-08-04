"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, LoaderCircle, Mic, RotateCcw } from "lucide-react";
import { Modal } from "@/components/modal";
import type { Account, Category, Transaction, TransactionKind, Transfer } from "@/lib/finance";
import { scoreVoiceHint, type VoiceFinanceDraft } from "@/lib/voice-finance";

type SpeechRecognitionEventLike = {
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
const SILENCE_DELAY_MS = 1500;

function digits(value: string) {
  return value.replace(/\D/g, "");
}

function formatAmount(value: string | number | null) {
  const raw = digits(String(value ?? ""));
  return raw ? new Intl.NumberFormat("es-CO").format(Number(raw)) : "";
}

function normalizeTranscript(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function accountCandidates(accounts: Account[]) {
  return accounts.map((account) => ({ id: account.id, labels: [account.name, account.institution, `${account.institution} ${account.name}`] }));
}

function categoryCandidates(categories: Category[]) {
  return categories.map((category) => ({ id: category.id, labels: [category.name] }));
}

export function VoiceFinanceCapture({ accounts, categories, onSaveTransaction, onSaveTransfer, onClose }: {
  accounts: Account[];
  categories: Category[];
  onSaveTransaction: (transaction: Transaction) => void;
  onSaveTransfer: (transfer: Transfer) => void;
  onClose: () => void;
}) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptRef = useRef("");
  const analyzingRef = useRef(false);
  const closingRef = useRef(false);

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

  const speechSupported = typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  const canSave = useMemo(() => {
    const base = Number(digits(amount)) > 0 && Boolean(description.trim() && date && sourceAccountId);
    return operation === "transfer" ? base && Boolean(destinationAccountId) && destinationAccountId !== sourceAccountId : base;
  }, [amount, date, description, destinationAccountId, operation, sourceAccountId]);

  useEffect(() => () => {
    closingRef.current = true;
    recognitionRef.current?.abort();
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
  }, []);

  function clearSilenceTimer() {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = null;
  }

  function reset() {
    closingRef.current = true;
    recognitionRef.current?.abort();
    clearSilenceTimer();
    recognitionRef.current = null;
    transcriptRef.current = "";
    analyzingRef.current = false;
    setTranscript("");
    setInterimTranscript("");
    setListening(false);
    setLoading(false);
    setError("");
    setDraft(null);
    window.setTimeout(() => { closingRef.current = false; }, 0);
  }

  function finishAndAnalyze() {
    const text = normalizeTranscript(transcriptRef.current);
    if (text.length < 3 || analyzingRef.current) return;

    analyzingRef.current = true;
    clearSilenceTimer();
    setListening(false);
    setInterimTranscript("");
    recognitionRef.current?.stop();
    void analyze(text);
  }

  function scheduleSilenceDetection(text: string) {
    clearSilenceTimer();
    if (text.length < 3) return;
    silenceTimerRef.current = setTimeout(finishAndAnalyze, SILENCE_DELAY_MS);
  }

  function startListening() {
    const Constructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Constructor) {
      setError("Tu navegador no permite dictado en vivo. Abre RutaSaldo en Chrome.");
      return;
    }

    reset();
    closingRef.current = false;
    const recognition = new Constructor();
    recognition.lang = "es-CO";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let finalized = "";
      let interim = "";

      // Chrome vuelve a enviar resultados anteriores en cada evento. Reconstruir
      // toda la sesión evita anexar las mismas palabras repetidamente.
      for (let index = 0; index < event.results.length; index += 1) {
        const phrase = normalizeTranscript(event.results[index][0].transcript);
        if (!phrase) continue;
        if (event.results[index].isFinal) finalized = normalizeTranscript(`${finalized} ${phrase}`);
        else interim = normalizeTranscript(`${interim} ${phrase}`);
      }

      const combined = normalizeTranscript(`${finalized} ${interim}`);
      transcriptRef.current = combined;
      setTranscript(finalized);
      setInterimTranscript(interim);
      scheduleSilenceDetection(combined);
    };

    recognition.onerror = (event) => {
      clearSilenceTimer();
      setListening(false);
      if (closingRef.current || analyzingRef.current || event.error === "aborted") return;
      setError(event.error === "not-allowed"
        ? "Permite el acceso al micrófono."
        : event.error === "no-speech"
          ? "No escuché una frase. Pulsa el micrófono e intenta de nuevo."
          : "El dictado se interrumpió. Intenta nuevamente.");
    };

    recognition.onend = () => {
      clearSilenceTimer();
      setListening(false);
      if (closingRef.current || analyzingRef.current) return;
      const text = normalizeTranscript(transcriptRef.current);
      if (text.length >= 3) {
        analyzingRef.current = true;
        setInterimTranscript("");
        void analyze(text);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  async function analyze(text: string) {
    setLoading(true);
    setError("");
    setDraft(null);
    setTranscript(text);
    setInterimTranscript("");

    try {
      const response = await fetch("/api/ai/voice-finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text }),
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

      const source = scoreVoiceHint(recognized.sourceAccountHint, accountCandidates(accounts));
      const destination = scoreVoiceHint(recognized.destinationAccountHint, accountCandidates(accounts));
      const category = scoreVoiceHint(recognized.categoryHint, categoryCandidates(categories));
      if (source) setSourceAccountId(source);
      if (destination && destination !== source) setDestinationAccountId(destination);
      if (nextOperation === "income") setCategoryId(categories.find((item) => item.name === "Ingresos")?.id ?? category ?? categories[0]?.id ?? "");
      else if (category) setCategoryId(category);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo interpretar la frase.");
    } finally {
      analyzingRef.current = false;
      setLoading(false);
    }
  }

  function save() {
    if (!canSave) return;
    const numericAmount = Number(digits(amount));
    if (operation === "transfer") {
      onSaveTransfer({ id: crypto.randomUUID(), fromAccountId: sourceAccountId, toAccountId: destinationAccountId, amount: numericAmount, description: description.trim(), date });
      return;
    }
    onSaveTransaction({ id: crypto.randomUUID(), kind: operation as TransactionKind, description: description.trim(), amount: numericAmount, accountId: sourceAccountId, categoryId: categoryId || null, date });
  }

  const combinedTranscript = normalizeTranscript(`${transcript} ${interimTranscript}`);

  return (
    <Modal title="Registrar por voz" subtitle={draft ? "Revisa o corrige los datos y guarda." : "Habla una vez; RutaSaldo detecta cuando terminas."} onClose={() => { closingRef.current = true; clearSilenceTimer(); recognitionRef.current?.abort(); onClose(); }}>
      <div className="space-y-5">
        {!draft && !loading && (
          <section className={`rounded-3xl border p-5 text-center ${listening ? "border-[#9eb68d] bg-[#f1f7ee]" : "border-[#dce1da] bg-[#f8faf7]"}`} aria-live="polite">
            <button type="button" onClick={startListening} disabled={listening} aria-label="Iniciar dictado" className={`mx-auto grid h-20 w-20 place-items-center rounded-full ${listening ? "bg-[#17231e] text-white" : "bg-white text-[#17231e] shadow-[0_8px_30px_rgba(23,35,30,.12)]"}`}>
              <Mic size={30} />
            </button>
            <p className="mt-4 text-base font-semibold">{listening ? "Te estoy escuchando" : "Pulsa el micrófono y habla"}</p>
            <p className="mt-1 text-xs text-[#68776e]">{listening ? "Cuando dejes de hablar, prepararé el formulario automáticamente." : "Ejemplo: Gasté 35 mil en mercado con Nequi"}</p>
            <div className="mx-auto mt-5 flex h-9 max-w-52 items-center justify-center gap-1" aria-hidden="true">
              {waveHeights.map((height, index) => <span key={`${height}-${index}`} className={`w-1 rounded-full bg-[#5f806d] ${listening ? "voice-wave-bar" : "opacity-25"}`} style={{ height, animationDelay: `${index * 70}ms` }} />)}
            </div>
            <div className="mt-5 min-h-24 rounded-2xl border border-[#dce1da] bg-white px-4 py-5 text-left">
              {combinedTranscript ? <p className="text-lg leading-8 text-[#26372e]">{transcript}{transcript && interimTranscript ? " " : ""}<span className="text-[#829087]">{interimTranscript}</span></p> : <p className="text-sm text-[#94a098]">Tus palabras aparecerán aquí…</p>}
            </div>
            {!speechSupported && <p className="mt-3 text-xs text-[#8a6328]">El dictado en vivo requiere Chrome.</p>}
          </section>
        )}

        {loading && <section className="grid min-h-64 place-items-center rounded-3xl border border-[#dce1da] bg-[#f8faf7] p-8 text-center" role="status"><div><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#17231e] text-white"><LoaderCircle size={28} className="animate-spin" /></span><h3 className="mt-5 text-lg font-semibold">Preparando el formulario</h3><p className="mt-2 text-sm text-[#68776e]">Identificando tipo, valor, cuenta y categoría.</p></div></section>}

        {error && <div role="alert" className="rounded-xl border border-[#e8c9bf] bg-[#fff4ef] px-4 py-3 text-sm text-[#914f3d]"><div className="flex gap-2"><AlertTriangle size={17} className="shrink-0" /><p>{error}</p></div><button type="button" onClick={startListening} className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-[#17231e] px-4 font-semibold text-white"><RotateCcw size={15} />Reintentar</button></div>}

        {draft && (
          <form onSubmit={(event) => { event.preventDefault(); save(); }} className="space-y-4">
            <div className="grid grid-cols-3 rounded-xl bg-[#edf0eb] p-1">
              {(["expense", "income", "transfer"] as const).map((value) => <button key={value} type="button" onClick={() => setOperation(value)} className={`h-10 rounded-lg text-xs font-semibold sm:text-sm ${operation === value ? "bg-white shadow-sm" : "text-[#5e6d63]"}`}>{value === "expense" ? "Gasto" : value === "income" ? "Ingreso" : "Transferencia"}</button>)}
            </div>
            <label className="block text-sm font-medium">Descripción<input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={200} className={inputClass} /></label>
            <label className="block text-sm font-medium">Valor<input value={amount} onChange={(event) => setAmount(formatAmount(event.target.value))} inputMode="numeric" className={inputClass} /></label>
            <label className="block text-sm font-medium">{operation === "transfer" ? "Desde" : "Cuenta"}<select value={sourceAccountId} onChange={(event) => setSourceAccountId(event.target.value)} className={inputClass}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.institution} · {account.name}</option>)}</select></label>
            {operation === "transfer" ? <label className="block text-sm font-medium">Hacia<select value={destinationAccountId} onChange={(event) => setDestinationAccountId(event.target.value)} className={inputClass}>{accounts.filter((account) => account.id !== sourceAccountId).map((account) => <option key={account.id} value={account.id}>{account.institution} · {account.name}</option>)}</select></label> : <label className="block text-sm font-medium">Categoría<select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className={inputClass}>{categories.filter((category) => operation === "income" ? category.name === "Ingresos" : category.name !== "Ingresos").map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>}
            <label className="block text-sm font-medium">Fecha<input value={date} onChange={(event) => setDate(event.target.value)} type="date" className={inputClass} /></label>
            {draft.clarificationQuestion && <p className="rounded-xl border border-[#eadfbd] bg-[#fffbef] px-3 py-2 text-sm text-[#745f2d]">{draft.clarificationQuestion}</p>}
            <div className="grid gap-2 sm:grid-cols-[1fr_2fr]"><button type="button" onClick={reset} className="h-12 rounded-xl border border-[#cfd8d0] bg-white text-sm font-semibold">Reintentar</button><button type="submit" disabled={!canSave} className="h-12 rounded-xl bg-[#17231e] text-sm font-semibold text-white disabled:opacity-45">Guardar</button></div>
            <p className="text-center text-xs text-[#68776e]">Nada se guarda hasta pulsar Guardar.</p>
          </form>
        )}
      </div>
    </Modal>
  );
}
