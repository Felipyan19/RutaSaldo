"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { startGoogleAuth } from "@/app/actions";
import { BrandMark } from "@/components/brand-mark";

type AuthMode = "login" | "register";

const errorMessages: Record<string, { title: string; text: string; mode: AuthMode }> = {
  not_registered: {
    title: "Tu cuenta aún no está registrada",
    text: "No encontramos un espacio RutaSaldo asociado a esa cuenta de Google. Cambia a “Crear cuenta” para registrarte.",
    mode: "register",
  },
  already_registered: {
    title: "Esta cuenta ya está registrada",
    text: "Usa “Iniciar sesión” para entrar a tu espacio RutaSaldo existente.",
    mode: "login",
  },
  consent_required: {
    title: "Necesitas aceptar la política",
    text: "Para crear o recuperar tu cuenta debes aceptar el tratamiento de datos descrito en el aviso de privacidad.",
    mode: "register",
  },
  auth_intent_expired: {
    title: "La solicitud expiró",
    text: "Vuelve a seleccionar iniciar sesión o crear cuenta para comenzar de nuevo.",
    mode: "login",
  },
};

export function LoginScreen({ errorCode }: { errorCode?: string }) {
  const initialError = errorCode ? errorMessages[errorCode] : undefined;
  const [mode, setMode] = useState<AuthMode>(initialError?.mode ?? "login");
  const isRegistering = mode === "register";

  return (
    <main className="grid min-h-screen bg-[#f4f5f0] lg:grid-cols-[1.08fr_.92fr]">
      <section className="relative hidden overflow-hidden bg-[#17231e] p-14 text-white lg:flex lg:flex-col">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#b7f34b]/10 blur-3xl" />
        <div className="relative flex items-center gap-3 text-lg font-semibold">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#b7f34b] text-[#17231e]"><BrandMark size={22} /></span>
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
            {[ ["$4,2 M", "En cuentas"], ["6", "Cuentas activas"], ["$1,6 M", "Saldo real"] ].map(([value, label]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[.04] p-4"><p className="text-xl font-semibold">{value}</p><p className="mt-1 text-xs text-[#aebbb3]">{label}</p></div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-[#aebbb3]">Construido para cómo se mueve el dinero en Colombia.</p>
      </section>
      <section className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#17231e] text-[#b7f34b]"><BrandMark size={22} /></span><span className="text-lg font-semibold">RutaSaldo</span></div>
          <div className="mb-8"><p className="text-sm font-medium text-[#587164]">Tu espacio financiero privado</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-[#17231e]">{isRegistering ? "Crea tu cuenta" : "Inicia sesión"}</h2><p className="mt-3 text-sm leading-6 text-[#5e6d63]">{isRegistering ? "Regístrate con Google y empieza a organizar tus cuentas, ingresos y gastos." : "Solo pueden entrar cuentas que ya estén registradas en RutaSaldo."}</p></div>

          <div className="mb-6 grid grid-cols-2 rounded-xl bg-[#e8ede9] p-1 text-sm font-semibold">
            <button type="button" aria-pressed={!isRegistering} onClick={() => setMode("login")} className={`rounded-lg px-3 py-2 transition ${!isRegistering ? "bg-white text-[#17231e] shadow-sm" : "text-[#5e6d63]"}`}>Iniciar sesión</button>
            <button type="button" aria-pressed={isRegistering} onClick={() => setMode("register")} className={`rounded-lg px-3 py-2 transition ${isRegistering ? "bg-white text-[#17231e] shadow-sm" : "text-[#5e6d63]"}`}>Crear cuenta</button>
          </div>

          {initialError && (
            <div role="alert" className="mb-5 rounded-2xl border border-[#e6c8a6] bg-[#fff8ed] p-4 text-sm text-[#704c24]">
              <p className="font-semibold">{initialError.title}</p>
              <p className="mt-1 leading-5">{initialError.text}</p>
            </div>
          )}

          <form action={startGoogleAuth}>
            <input type="hidden" name="intent" value={mode} />
            {isRegistering && (
              <div className="mb-5 rounded-2xl border border-[#dce4dd] bg-white/70 p-4">
                <div className="flex gap-3">
                  <div className="mt-0.5 text-[#587164]"><ShieldCheck size={18} /></div>
                  <div>
                    <p className="text-sm font-semibold text-[#17231e]">Registro y tratamiento de datos</p>
                    <p className="mt-1 text-xs leading-5 text-[#5e6d63]">Google compartirá con RutaSaldo tu nombre, correo, foto y un identificador para crear tu cuenta y tu espacio privado. No solicitamos acceso a Drive, contactos ni información financiera de Google.</p>
                    <Link href="/privacidad" target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-[#587164] underline underline-offset-2">Leer el aviso de privacidad</Link>
                  </div>
                </div>
                <label className="mt-4 flex cursor-pointer items-start gap-3 border-t border-[#e8ede9] pt-4 text-xs leading-5 text-[#46564d]">
                  <input required name="googleDataConsent" type="checkbox" aria-describedby="privacy-consent-description" className="peer sr-only" />
                  <span aria-hidden="true" className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border border-[#afc0b4] bg-white text-transparent transition peer-checked:border-[#17231e] peer-checked:bg-[#17231e] peer-checked:text-[#b7f34b]"><Check size={12} strokeWidth={3} /></span>
                  <span id="privacy-consent-description">Acepto el tratamiento de los datos que Google comparte con RutaSaldo y la <Link href="/privacidad" target="_blank" rel="noreferrer" className="font-semibold text-[#17231e] underline underline-offset-2">política de privacidad</Link>.</span>
                </label>
              </div>
            )}
            <GoogleAuthButton isRegistering={isRegistering} />
          </form>
          <p className="mt-8 text-center text-xs leading-5 text-[#5e6d63]">{isRegistering ? "Al continuar, si no existe una cuenta con ese Google, crearemos una cuenta y un workspace privado." : "Si tu cuenta aún no existe, RutaSaldo no te dejará entrar: selecciona “Crear cuenta” para registrarte."}</p>
        </div>
      </section>
    </main>
  );
}

function GoogleAuthButton({ isRegistering }: { isRegistering: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-disabled={pending}
      className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#17231e] text-sm font-semibold text-white transition hover:bg-[#26372f] disabled:cursor-wait disabled:opacity-75"
      disabled={pending}
      type="submit"
    >
      {pending ? (
        <>
          <span className="rutasaldo-button-spinner" aria-hidden="true" />
          {isRegistering ? "Creando tu cuenta…" : "Iniciando sesión…"}
        </>
      ) : (
        <>
          {isRegistering ? "Crear cuenta con Google" : "Continuar con Google"}
          <ArrowRight size={17} className="transition group-hover:translate-x-1" />
        </>
      )}
    </button>
  );
}
