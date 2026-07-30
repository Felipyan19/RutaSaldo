"use server";

import { cookies } from "next/headers";
import { signIn, signOut } from "@/auth";
import { createGoogleAuthIntent } from "@/lib/auth-intent";
import { GOOGLE_AUTH_INTENT_COOKIE, GOOGLE_DATA_CONSENT_VERSION } from "@/lib/privacy";

export async function startGoogleAuth(formData: FormData) {
  const mode = formData.get("intent");
  if (mode !== "login" && mode !== "register") {
    throw new Error("Flujo de autenticación inválido.");
  }

  if (mode === "register" && formData.get("googleDataConsent") !== "on") {
    throw new Error("Debes aceptar el tratamiento de datos para continuar.");
  }

  const cookieStore = await cookies();
  cookieStore.set({
    name: GOOGLE_AUTH_INTENT_COOKIE,
    value: createGoogleAuthIntent(
      mode,
      mode === "register" ? GOOGLE_DATA_CONSENT_VERSION : undefined,
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 10 * 60,
    path: "/",
  });

  await signIn("google", { redirectTo: "/" });
}

export async function logOut() {
  await signOut({ redirectTo: "/" });
}
