"use client";

import { useMemo, useRef, useState } from "react";
import { AlertTriangle, LoaderCircle, Mic, MicOff, RotateCcw, Sparkles } from "lucide-react";
import { Modal } from "@/components/modal";
import type { Account, Category, Transaction, TransactionKind, Transfer } from "@/lib/finance";
import { scoreVoiceHint, type VoiceFinanceDraft } from "@/lib/voice-finance";

type SpeechRecognitionEventLike = { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> };
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

function digits(value: string) {
  return value.replace(/\D/g, "");
}

function formatAmount(value: string | number | null) {
  const raw = digits(String(value ?? ""));
  return raw ? new Intl.NumberFormat("es-CO").format(Number(raw)) : "";
}

function accountCandidates(accounts: Account[]) {
  return accounts.map((account) => ({
    id: account.id,
    labels: [account.name, account.institution, `${account.institution} ${account.name}`],
  }));
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
  const [transcript, setTranscript] = useState("");
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
  const canConfirm = useMemo(() => {
    const validBase = Number(digits(amount)) > 0 && Boolean(description.trim() && date && sourceAccountId);
    return operation === "transfer" ? validBase && Boolean(destinationAccountId) && destinationAccountId !== sourceAccountId : validBase;
  }, [amount, date, description, destinationAccountId, operation, sourceAccountId]);

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  function startListening() {
    const Constructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Constructor) {
      setError("Este navegador no permite dictado. Puedes escribir la frase y procesarla.");
      return;
    }

    setError("");
    setDraft(null);
    const recognition = new Constructor();
    recognition.lang = "es-CO";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      let text = "";
      for (let index = 0; index < event.results.length; index += 1) text += event.results[index][0].transcript;
      setTranscript(text.trim());
    };
    recognition.onerror = (event) => {
      setListening(false);
      const message = event.error === "not-allowed"
        ? "Debes permitir el acceso al micrófono."
        : event.error === "no-speech"
          ? "No se detectó voz. Intenta de nuevo o escribe la frase."
          : "No se pudo completar el dictado.";
      setError(message);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  async function analyze() {
    const cleanTranscript = transcript.trim();
    if (cleanTranscript.length < 3) {
      setError("Di o escribe el movimiento que deseas registrar.");
      return;
    }

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
        setCategoryId(categories.find((category) => category.name === "Ingresos")?.id ?? matchedCategory ?? categories[0]?.id ?? "");
      } else if (matchedCategory) {
        setCategoryId(matchedCategory);
      }
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
      onSaveTransfer({
        id: crypto.randomUUID(),
        fromAccountId: sourceAccountId,
        toAccountId: destinationAccountId,
        amount: numericAmount,
        description: description.trim(),
        date,
      });
      return;
    }

    onSaveTransaction({
      id: crypto.randomUUID(),
      kind: operation as TransactionKind,
      description: description.trim(),
      amount: numericAmount,
      accountId: sourceAccountId,
      categoryId: categoryId || null,
      date,
    });
  }

  return (
    <Modal title="Registrar por voz" subtitle="La IA completa un borrador. Tú revisas y confirmas antes de guardar." onClose={() => { recognitionRef.current?.abort(); onClose(); }}>
      <div className="space-y-5">
        <div className="rounded-2xl border border-[#dce1da] bg-[#f7f9f5] p-4">
          <label className="block text-sm font-semibold" htmlFor="voice-transcript">Describe el movimiento</label>
          <textarea
            id="voice-transcript"
            value={transcript}
            onChange={(event) => { setTranscript(event.target.value); setDraft(null); }}
            placeholder="Ej. Pasé cien mil de Rappi a Nequi para ahorrar"
            rows={3}
            maxLength={600}
            className="mt-2 w-full resize-none rounded-xl border border-[#dce1da] bg-white px-3 py-3 text-sm outline-none focus:border-[#819b8a] focus:ring-2 focus:ring-[#b7f34b]/30"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={listening ? stopListening : startListening} className={`inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold ${listening ? "bg-[#fff0ec] text-[#a54c3d]" : "bg-[#17231e] text-white"}`}>
              {listening ? <MicOff size={17} /> : <Mic size={17} />}{listening ? "Detener" : "Hablar"}
            </button>
            <button type="button" onClick={() => void analyze()} disabled={loading || transcript.trim().length < 3} className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#cfd8d0] bg-white px-4 text-sm font-semibold disabled:opacity-45">
              {loading ? <LoaderCircle size={17} className="animate-spin" /> : <Sparkles size={17} />}{loading ? "Interpretando…" : "Completar borrador"}
            </button>
          </div>
          {!speechSupported && <p className="mt-2 text-xs text-[#7a6850]">El dictado no está disponible en este navegador, pero puedes escribir la frase.</p>}
        </div>

        {error && <p role="alert" className="rounded-xl border border-[#e8c9bf] bg-[#fff4ef] px-3 py-2 text-sm text-[#914f3d]">{error}</p>}
        {draft?.clarificationQuestion && <div className="flex gap-2 rounded-xl border border-[#eadfbd] bg-[#fffbef] px-3 py-3 text-sm text-[#745f2d]"><AlertTriangle size={17} className="mt-0.5 shrink-0" /><p>{draft.clarificationQuestion}</p></div>}

        {draft && (
          <div className="space-y-5 border-t border-[#e1e5de] pt-5">
            <div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold">Revisa el borrador</h3><p className="mt-0.5 text-xs text-[#68776e]">Confianza de interpretación: {Math.round(draft.confidence * 100)}%</p></div><button type="button" onClick={() => { setDraft(null); setTranscript(""); }} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#52665a]"><RotateCcw size={14} />Reiniciar</button></div>

            <div className="grid grid-cols-3 rounded-xl bg-[#edf0eb] p-1">
              {(["expense", "income", "transfer"] as const).map((value) => <button key={value} type="button" onClick={() => setOperation(value)} aria-pressed={operation === value} className={`h-10 rounded-lg text-xs font-semibold sm:text-sm ${operation === value ? "bg-white shadow-sm" : "text-[#5e6d63]"}`}>{value === "expense" ? "Gasto" : value === "income" ? "Ingreso" : "Transferencia"}</button>)}
            </div>

            <label className="block text-sm font-medium">Descripción<input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={200} className={inputClass} /></label>
            <label className="block text-sm font-medium">Valor<input value={amount} onChange={(event) => setAmount(formatAmount(event.target.value))} inputMode="numeric" className={inputClass} /></label>

            <label className="block text-sm font-medium">{operation === "transfer" ? "Desde" : "Cuenta"}<select value={sourceAccountId} onChange={(event) => setSourceAccountId(event.target.value)} className={inputClass}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.institution} · {account.name}</option>)}</select></label>

            {operation === "transfer" ? (
              <label className="block text-sm font-medium">Hacia<select value={destinationAccountId} onChange={(event) => setDestinationAccountId(event.target.value)} className={inputClass}>{accounts.filter((account) => account.id !== sourceAccountId).map((account) => <option key={account.id} value={account.id}>{account.institution} · {account.name}</option>)}</select></label>
            ) : (
              <label className="block text-sm font-medium">Categoría<select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className={inputClass}>{categories.filter((category) => operation === "income" ? category.name === "Ingresos" : category.name !== "Ingresos").map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            )}

            <label className="block text-sm font-medium">Fecha<input value={date} onChange={(event) => setDate(event.target.value)} type="date" className={inputClass} /></label>
            {operation === "transfer" && sourceAccountId === destinationAccountId && <p role="alert" className="text-sm text-[#914f3d]">Selecciona dos cuentas diferentes.</p>}

            <button type="button" onClick={confirm} disabled={!canConfirm} className="h-12 w-full rounded-xl bg-[#17231e] text-sm font-semibold text-white disabled:opacity-45">{operation === "transfer" ? "Confirmar y guardar transferencia" : "Confirmar y guardar movimiento"}</button>
            <p className="text-center text-xs text-[#68776e]">Nada se guarda hasta pulsar el botón de confirmación.</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
