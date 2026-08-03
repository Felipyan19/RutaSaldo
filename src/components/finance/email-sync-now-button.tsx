"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";

export function EmailSyncNowButton() {
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function syncNow() {
    setSyncing(true);
    setMessage(null);
    try {
      const response = await fetch("/api/finance/email-sync/manual", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "No se pudo sincronizar Gmail");
      const imported = (payload.results ?? []).reduce((total: number, item: { imported?: number }) => total + (item.imported ?? 0), 0);
      const pending = (payload.results ?? []).reduce((total: number, item: { pendingReview?: number }) => total + (item.pendingReview ?? 0), 0);
      setMessage(`Sincronización lista: ${imported} importados y ${pending} por revisar.`);
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo sincronizar Gmail");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <button type="button" onClick={() => void syncNow()} disabled={syncing} className="flex items-center gap-2 rounded-xl bg-[#17231e] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
        {syncing ? "Sincronizando…" : "Sincronizar ahora"}
      </button>
      {message && <p aria-live="polite" className="text-sm text-[#5e6d63]">{message}</p>}
    </div>
  );
}
