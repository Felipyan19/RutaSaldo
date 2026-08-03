import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function encryptionKey() {
  const value = required("GMAIL_TOKEN_ENCRYPTION_KEY");
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) throw new Error("GMAIL_TOKEN_ENCRYPTION_KEY must be a base64 encoded 32-byte key");
  return key;
}

export function gmailRedirectUri(origin: string) {
  return process.env.GMAIL_OAUTH_REDIRECT_URI ?? `${origin}/api/integrations/gmail/callback`;
}

export function createGmailState() {
  const nonce = randomBytes(24).toString("base64url");
  const signature = createHmac("sha256", required("AUTH_SECRET")).update(nonce).digest("base64url");
  return `${nonce}.${signature}`;
}

export function verifyGmailState(value: string) {
  const [nonce, signature] = value.split(".");
  if (!nonce || !signature) return false;
  const expected = createHmac("sha256", required("AUTH_SECRET")).update(nonce).digest();
  const supplied = Buffer.from(signature, "base64url");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function gmailAuthorizationUrl(origin: string, state: string) {
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", required("GMAIL_CLIENT_ID"));
  url.searchParams.set("redirect_uri", gmailRedirectUri(origin));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GMAIL_SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeGmailCode(code: string, origin: string) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: required("GMAIL_CLIENT_ID"),
      client_secret: required("GMAIL_CLIENT_SECRET"),
      redirect_uri: gmailRedirectUri(origin),
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  const payload = (await response.json()) as { access_token?: string; refresh_token?: string; error?: string };
  if (!response.ok || !payload.access_token) throw new Error(payload.error ?? "Google did not return an access token");
  return payload;
}

export async function gmailProfile(accessToken: string) {
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Unable to read the Gmail profile");
  return response.json() as Promise<{ emailAddress: string; historyId?: string }>;
}

export function encryptRefreshToken(refreshToken: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(refreshToken, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptRefreshToken(value: string) {
  const [version, ivValue, tagValue, encryptedValue] = value.split(".");
  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) throw new Error("Invalid encrypted Gmail token");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export async function gmailAccessTokenFromRefreshToken(refreshToken: string) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: required("GMAIL_CLIENT_ID"),
      client_secret: required("GMAIL_CLIENT_SECRET"),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  const payload = (await response.json()) as { access_token?: string; error?: string };
  if (!response.ok || !payload.access_token) throw new Error(payload.error ?? "Gmail refresh token is invalid or expired");
  return payload.access_token;
}
