"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Database, Inbox, LockKeyhole, LogOut, Mail, RefreshCw, ShieldCheck, Unplug, WalletCards } from "lucide-react";
import { useFinance } from "./finance-provider";
import { logOut } from "@/app/actions";

type GmailConnection = {
  connected: boolean;
  email: string | null;
  status: string | null;
  lastSyncedAt: string | null;
};

function formatSyncDate(value: string | null) {
  if (!value) return "Aún no se ha sincronizado";
  return `Última sincronización: ${new Date(value).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}`;
}

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
    <section className="mx-auto max-w-7xl">
      <div className="mb-7 max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-[-0.04em]">Configuración</h1>
        <p className="mt-2 text-sm text-[#5e6d63]">Gestiona tu espacio, conexiones y privacidad.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <article className="rounded-3xl border border-[#e0e4dd] bg-white p-6 xl:col-span-4">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#eef3ef] text-[#486356]"><WalletCards size={20} /></span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[.12em] text-[#748178]">Espacio activo</p>
              <h2 className="mt-1 truncate text-lg font-semibold">{state.workspaceName}</h2>
              <p className="mt-2 text-sm text-[#5e6d63]">{state.accounts.length} cuentas · {state.transactions.length} movimientos</p>
            </div>
          </div>
        </article>

        <article className="rounded-3xl border border-[#d8e4dc] bg-white p-6 xl:col-span-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#edf4ef] text-[#486356]"><Mail size={20} /></span>
              <div className="min-w-0">
                <h2 className="font-semibold">Correos bancarios</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-[#5e6d63]">RutaSaldo lee notificaciones bancarias con permiso de solo lectura y guarda la autorización cifrada.</p>
              </div>
            </div>

            {!gmailLoading && gmail?.connected && (
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#edf7ef] px-3 py-1.5 text-xs font-semibold text-[#315443]"><ShieldCheck size={14} />Conectado</span>
            )}
          </div>

          {gmailLoading ? (
            <p className="mt-5 flex items-center gap-2 text-sm text-[#5e6d63]"><RefreshCw size={15} className="animate-spin" />Consultando conexión…</p>
          ) : gmail?.connected ? (
            <div className="mt-5 grid gap-4 rounded-2xl bg-[#f5f8f5] p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#315443]">{gmail.email}</p>
                <p className="mt-1 text-xs text-[#6b786f]">{formatSyncDate(gmail.lastSyncedAt)}</p>
                {gmail.status === "reauth_required" && <p className="mt-2 text-sm font-medium text-[#8a5a22]">Google requiere una nueva autorización.</p>}
              </div>
              <div className="flex flex-wrap gap-2 md:justify-end">
                <Link href="/bandeja" className="flex items-center gap-2 rounded-xl bg-[#17231e] px-4 py-2.5 text-sm font-semibold text-white"><Inbox size={15} />Ver bandeja</Link>
                <a href="/api/integrations/gmail/connect" className="rounded-xl border border-[#bfd0c5] bg-white px-4 py-2.5 text-sm font-semibold text-[#315443]">Reconectar</a>
                <button type="button" onClick={disconnectGmail} disabled={disconnecting} className="flex items-center gap-2 rounded-xl border border-[#d9b8ae] bg-white px-4 py-2.5 text-sm font-semibold text-[#754638] disabled:opacity-50"><Unplug size={15} />{disconnecting ? "Desconectando…" : "Desconectar"}</button>
              </div>
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-[#f5f8f5] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-sm font-semibold">Gmail no está conectado</p><p className="mt-1 text-xs text-[#6b786f]">Conéctalo para detectar compras y transferencias notificadas por correo.</p></div>
              <a href="/api/integrations/gmail/connect" className="inline-flex w-fit rounded-xl bg-[#17231e] px-4 py-2.5 text-sm font-semibold text-white">Conectar Gmail</a>
            </div>
          )}
        </article>

        <article className="rounded-3xl border border-[#e0e4dd] bg-white p-6 xl:col-span-4">
          <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#eef3ef] text-[#486356]"><LockKeyhole size={20} /></span><div><h2 className="font-semibold">Privacidad</h2><p className="mt-1 text-sm leading-6 text-[#5e6d63]">Consulta qué datos usa RutaSaldo y cómo protege tu información.</p></div></div>
          <Link href="/privacidad" className="mt-5 inline-flex text-sm font-semibold text-[#587164] underline underline-offset-4">Ver aviso de privacidad</Link>
        </article>

        <article className="rounded-3xl border border-[#e0e4dd] bg-white p-6 xl:col-span-4">
          <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#eef3ef] text-[#486356]"><LogOut size={20} /></span><div><h2 className="font-semibold">Sesión</h2><p className="mt-1 text-sm leading-6 text-[#5e6d63]">Cierra tu sesión en este dispositivo.</p></div></div>
          <form action={logOut} className="mt-5"><button type="submit" className="rounded-xl border border-[#cfd7d1] bg-white px-4 py-2.5 text-sm font-semibold text-[#25372e]">Cerrar sesión</button></form>
        </article>

        <article className="rounded-3xl border border-[#ead0c8] bg-[#fff8f5] p-6 xl:col-span-4">
          <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#fbe9e3] text-[#8a4c3c]"><Database size={20} /></span><div><h2 className="font-semibold text-[#754638]">Eliminar datos financieros</h2><p className="mt-1 text-sm leading-6 text-[#754638]">Borra cuentas y movimientos del espacio. Tu usuario seguirá activo.</p></div></div>
          {confirming ? (
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={clear} disabled={saving} className="rounded-xl bg-[#9a4f3e] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Confirmar eliminación</button>
              <button type="button" onClick={() => setConfirming(false)} className="rounded-xl border border-[#d9b8ae] bg-white px-4 py-2.5 text-sm font-semibold text-[#754638]">Cancelar</button>
            </div>
          ) : <button type="button" onClick={() => setConfirming(true)} className="mt-5 rounded-xl border border-[#d9b8ae] bg-white px-4 py-2.5 text-sm font-semibold text-[#754638]">Eliminar datos</button>}
        </article>
      </div>
    </section>
  );
}
