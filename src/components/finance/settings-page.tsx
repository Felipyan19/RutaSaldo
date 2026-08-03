"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Mail, RefreshCw, Unplug } from "lucide-react";
import { useFinance } from "./finance-provider";
import { logOut } from "@/app/actions";

type GmailConnection = {
  connected: boolean;
  email: string | null;
  status: string | null;
  lastSyncedAt: string | null;
};

export function SettingsPage() {
  const { state, clearState, saving } = useFinance();
  const [confirming, setConfirming] = useState(false);
  const [gmail, setGmail] = useState<GmailConnection | null>(null);
  const [gmailLoading, setGmailLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    fetch("/api/integrations/gmail", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<GmailConnection> : null)
      .then(setGmail)
      .finally(() => setGmailLoading(false));
  }, []);

  async function clear() {
    setConfirming(false);
    await clearState();
  }

  async function disconnectGmail() {
    setDisconnecting(true);
    try {
      const response = await fetch("/api/integrations/gmail", { method: "DELETE" });
      if (response.ok) setGmail({ connected: false, email: null, status: null, lastSyncedAt: null });
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <section className="max-w-3xl">
      <div className="mb-7">
        <h2 className="text-2xl font-semibold tracking-tight">Configuración</h2>
        <p className="mt-1 text-sm text-[#5e6d63]">Administra tu espacio, integraciones y datos de RutaSaldo.</p>
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl border border-[#e0e4dd] bg-white p-6">
          <h3 className="font-semibold">Tu espacio</h3>
          <p className="mt-2 text-sm text-[#5e6d63]">{state.workspaceName}</p>
          <p className="mt-1 text-xs text-[#5e6d63]">{state.accounts.length} cuentas · {state.transactions.length} movimientos</p>
        </div>

        <div className="rounded-3xl border border-[#d8e4dc] bg-white p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-[#edf4ef] p-3 text-[#486356]"><Mail size={20} /></div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold">Sincronización con Gmail</h3>
              <p className="mt-2 text-sm leading-6 text-[#5e6d63]">
                Conecta Gmail con permiso de solo lectura para detectar notificaciones bancarias. RutaSaldo nunca solicita tu contraseña y guarda el token de acceso cifrado.
              </p>

              {gmailLoading ? (
                <p className="mt-4 flex items-center gap-2 text-sm text-[#5e6d63]"><RefreshCw size={15} className="animate-spin" /> Consultando conexión…</p>
              ) : gmail?.connected ? (
                <div className="mt-4 rounded-2xl bg-[#f1f6f2] p-4">
                  <p className="text-sm font-semibold text-[#315443]">Gmail conectado</p>
                  <p className="mt-1 truncate text-sm text-[#5e6d63]">{gmail.email}</p>
                  {gmail.status === "reauth_required" && <p className="mt-2 text-sm text-[#8a5a22]">Google requiere que vuelvas a autorizar esta cuenta.</p>}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a href="/api/integrations/gmail/connect" className="rounded-xl border border-[#bfd0c5] px-4 py-2.5 text-sm font-semibold text-[#315443]">Reconectar Gmail</a>
                    <button type="button" onClick={disconnectGmail} disabled={disconnecting} className="flex items-center gap-2 rounded-xl border border-[#d9b8ae] px-4 py-2.5 text-sm font-semibold text-[#754638] disabled:opacity-50"><Unplug size={15} />{disconnecting ? "Desconectando…" : "Desconectar"}</button>
                  </div>
                </div>
              ) : (
                <a href="/api/integrations/gmail/connect" className="mt-4 inline-flex rounded-xl bg-[#17231e] px-4 py-2.5 text-sm font-semibold text-white">Conectar Gmail</a>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-[#e0e4dd] bg-white p-6">
          <h3 className="font-semibold">Privacidad</h3>
          <p className="mt-2 text-sm leading-6 text-[#5e6d63]">Consulta cómo RutaSaldo trata los datos básicos compartidos durante el registro con Google.</p>
          <Link href="/privacidad" className="mt-4 inline-block text-sm font-semibold text-[#587164] underline underline-offset-2">Leer aviso de privacidad</Link>
        </div>

        <div className="rounded-3xl border border-[#ead0c8] bg-[#fff8f5] p-6">
          <h3 className="font-semibold text-[#754638]">Zona de datos</h3>
          <p className="mt-2 text-sm leading-6 text-[#754638]">Elimina tus cuentas y movimientos del workspace. Tu usuario y sesión permanecerán activos.</p>
          {confirming ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={clear} disabled={saving} className="rounded-xl bg-[#9a4f3e] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Sí, limpiar datos</button>
              <button type="button" onClick={() => setConfirming(false)} className="rounded-xl border border-[#d9b8ae] px-4 py-2.5 text-sm font-semibold text-[#754638]">Cancelar</button>
            </div>
          ) : <button type="button" onClick={() => setConfirming(true)} className="mt-4 rounded-xl border border-[#d9b8ae] px-4 py-2.5 text-sm font-semibold text-[#754638]">Limpiar cuentas y movimientos</button>}
        </div>

        <div className="rounded-3xl border border-[#e0e4dd] bg-white p-6">
          <h3 className="font-semibold">Sesión</h3>
          <form action={logOut} className="mt-4"><button type="submit" className="rounded-xl bg-[#17231e] px-4 py-2.5 text-sm font-semibold text-white">Cerrar sesión</button></form>
        </div>
      </div>
    </section>
  );
}
