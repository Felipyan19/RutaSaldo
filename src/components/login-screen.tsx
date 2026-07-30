"use client";

import { ArrowRight, Route } from "lucide-react";
import { signInWithGoogle } from "@/app/actions";

export function LoginScreen() {
  return (
    <main className="grid min-h-screen bg-[#f4f5f0] lg:grid-cols-[1.08fr_.92fr]">
      <section className="relative hidden overflow-hidden bg-[#17231e] p-14 text-white lg:flex lg:flex-col">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#b7f34b]/10 blur-3xl" />
        <div className="relative flex items-center gap-3 text-lg font-semibold">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#b7f34b] text-[#17231e]"><Route size={22} /></span>
          RutaSaldo
        </div>
        <div className="relative my-auto max-w-xl">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-[#d8e1db]">
            <span className="h-2 w-2 rounded-full bg-[#b7f34b]" />
            Tu dinero, sin movimientos duplicados
          </span>
          <h1 className="text-5xl font-semibold leading-[1.05] tracking-[-0.045em] xl:text-6xl">Entiende dónde está tu plata.</h1>
          <p className="mt-7 max-w-lg text-lg leading-8 text-[#aebbb3]">Reúne bancos, billeteras y efectivo en un solo lugar. RutaSaldo te muestra lo que entra, lo que sale y lo que realmente tienes.</p>
          <div className="mt-12 grid grid-cols-3 gap-3">
            {[["$4,2 M", "En cuentas"], ["6", "Cuentas activas"], ["$1,6 M", "Saldo real"]].map(([value, label]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[.04] p-4"><p className="text-xl font-semibold">{value}</p><p className="mt-1 text-xs text-[#92a199]">{label}</p></div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-[#728078]">Construido para cómo se mueve el dinero en Colombia.</p>
      </section>
      <section className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#17231e] text-[#b7f34b]"><Route size={22} /></span><span className="text-lg font-semibold">RutaSaldo</span></div>
          <div className="mb-9"><p className="text-sm font-medium text-[#587164]">Bienvenido de nuevo</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-[#17231e]">Entra a tu espacio</h2><p className="mt-3 text-sm leading-6 text-[#68736d]">Inicia sesión con Google para mantener tus finanzas privadas y separadas de otros usuarios.</p></div>
          <form action={signInWithGoogle}>
            <button type="submit" className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#17231e] text-sm font-semibold text-white transition hover:bg-[#26372f]">Continuar con Google<ArrowRight size={17} className="transition group-hover:translate-x-1" /></button>
          </form>
          <p className="mt-8 text-center text-xs leading-5 text-[#8a948e]">Tus movimientos se guardan en tu workspace privado de Neon.</p>
        </div>
      </section>
    </main>
  );
}
