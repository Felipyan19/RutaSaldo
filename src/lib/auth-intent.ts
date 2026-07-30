import { createHmac, timingSafeEqual } from "node:crypto";
import type { GoogleAuthIntentMode } from "./privacy";

const INTENT_TTL_MS = 10 * 60 * 1000;

type GoogleAuthIntent = {
  mode: GoogleAuthIntentMode;
  consentVersion?: string;
  expiresAt: number;
};

function secret() {
  const configured = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET is required to sign OAuth intents.");
  }
  return "rutasaldo-local-development-secret";
}

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signature(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createGoogleAuthIntent(mode: GoogleAuthIntentMode, consentVersion?: string) {
  const payload = encode(JSON.stringify({
    mode,
    ...(consentVersion ? { consentVersion } : {}),
    expiresAt: Date.now() + INTENT_TTL_MS,
  } satisfies GoogleAuthIntent));

  return `${payload}.${signature(payload)}`;
}

export function verifyGoogleAuthIntent(value: string | undefined): GoogleAuthIntent | null {
  if (!value) return null;

  const [payload, providedSignature] = value.split(".");
  if (!payload || !providedSignature) return null;

  const expectedSignature = signature(payload);
  const expected = Buffer.from(expectedSignature);
  const provided = Buffer.from(providedSignature);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return null;

  try {
    const parsed = JSON.parse(decode(payload)) as Partial<GoogleAuthIntent>;
    if (parsed.mode !== "login" && parsed.mode !== "register") return null;
    if (typeof parsed.expiresAt !== "number" || parsed.expiresAt < Date.now()) return null;
    if (parsed.consentVersion !== undefined && typeof parsed.consentVersion !== "string") return null;
    return parsed as GoogleAuthIntent;
  } catch {
    return null;
  }
}
