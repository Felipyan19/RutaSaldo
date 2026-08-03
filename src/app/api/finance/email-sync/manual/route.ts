import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ error: "CRON_SECRET no está configurado" }, { status: 503 });

  const response = await fetch(new URL("/api/finance/email-sync", request.nextUrl.origin), {
    method: "POST",
    headers: { authorization: `Bearer ${cronSecret}` },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({ error: "Respuesta inválida del sincronizador" }));
  return NextResponse.json(payload, { status: response.status });
}
