"use client";

import Link from "next/link";
import { useState } from "react";
import { useFinance } from "./finance-provider";
import { logOut } from "@/app/actions";

export function SettingsPage() {
  const { state, clearState, saving } = useFinance();
  const [confirming, setConfirming] = useState(false);
  async function clear() { setConfirming(false); await clearState(); }
  return <section className="max-w-3xl"><div className="mb-7"><h2 className="text-2xl font-semibold tracking-tight">Configuración</h2><p className="mt-1 text-sm text-[#5e6d63]">Administra tu espacio y tus datos de RutaSaldo.</p></div><div className="space-y-4"><div className="rounded-3xl border border-[#e0e4dd] bg-white p-6"><h3 className="font-semibold">Tu espacio</h3><p className="mt-2 text-sm text-[#5e6d63]">{state.workspaceName}</p><p className="mt-1 text-xs text-[#5e6d63]">{state.accounts.length} cuentas · {state.transactions.length} movimientos</p></div><div className="rounded-3xl border border-[#e0e4dd] bg-white p-6"><h3 className="font-semibold">Privacidad</h3><p className="mt-2 text-sm leading-6 text-[#5e6d63]">Consulta cómo RutaSaldo trata los datos básicos compartidos durante el registro con Google.</p><Link href="/privacidad" className="mt-4 inline-block text-sm font-semibold text-[#587164] underline underline-offset-2">Leer aviso de privacidad</Link></div><div className="rounded-3xl border border-[#ead0c8] bg-[#fff8f5] p-6"><h3 className="font-semibold text-[#754638]">Zona de datos</h3><p className="mt-2 text-sm leading-6 text-[#754638]">Elimina tus cuentas y movimientos del workspace. Tu usuario y sesión permanecerán activos.</p>{confirming ? <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={clear} disabled={saving} className="rounded-xl bg-[#9a4f3e] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Sí, limpiar datos</button><button type="button" onClick={() => setConfirming(false)} className="rounded-xl border border-[#d9b8ae] px-4 py-2.5 text-sm font-semibold text-[#754638]">Cancelar</button></div> : <button type="button" onClick={() => setConfirming(true)} className="mt-4 rounded-xl border border-[#d9b8ae] px-4 py-2.5 text-sm font-semibold text-[#754638]">Limpiar cuentas y movimientos</button>}</div><div className="rounded-3xl border border-[#e0e4dd] bg-white p-6"><h3 className="font-semibold">Sesión</h3><form action={logOut} className="mt-4"><button type="submit" className="rounded-xl bg-[#17231e] px-4 py-2.5 text-sm font-semibold text-white">Cerrar sesión</button></form></div></div></section>;
}
