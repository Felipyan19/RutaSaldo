import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createFixedPaymentTemplate, deleteFixedPaymentTemplate, readFixedPayments, updateFixedPaymentTemplate, upsertFixedPaymentOccurrence } from "@/db/fixed-payments";
import { getWorkspaceIdForUser } from "@/db/users";
import type { FixedPaymentOccurrence, FixedPaymentTemplate } from "@/lib/fixed-payments";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function workspaceId() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return getWorkspaceIdForUser(session.user.id);
}

function validTemplate(value: unknown): value is FixedPaymentTemplate {
  const item = value as FixedPaymentTemplate;
  return Boolean(item && typeof item.id === "string" && item.name?.trim() && item.nextDueDate && Number.isFinite(item.expectedAmount));
}

function validOccurrence(value: unknown): value is FixedPaymentOccurrence {
  const item = value as FixedPaymentOccurrence;
  return Boolean(item && typeof item.id === "string" && item.templateId && item.periodKey && item.dueDate);
}

export async function GET() {
  try {
    const currentWorkspaceId = await workspaceId();
    if (!currentWorkspaceId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    return NextResponse.json(await readFixedPayments(currentWorkspaceId), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[fixed-payments] GET failed", error);
    return NextResponse.json({ error: "No se pudieron cargar los pagos fijos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const currentWorkspaceId = await workspaceId();
    if (!currentWorkspaceId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const body = await request.json();
    if (body?.type === "occurrence") {
      if (!validOccurrence(body.occurrence)) return NextResponse.json({ error: "La ocurrencia no es válida" }, { status: 400 });
      return NextResponse.json(await upsertFixedPaymentOccurrence(currentWorkspaceId, body.occurrence));
    }
    if (!validTemplate(body?.template)) return NextResponse.json({ error: "El pago fijo no es válido" }, { status: 400 });
    return NextResponse.json(await createFixedPaymentTemplate(currentWorkspaceId, body.template));
  } catch (error) {
    console.error("[fixed-payments] POST failed", error);
    return NextResponse.json({ error: "No se pudo guardar el pago fijo" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const currentWorkspaceId = await workspaceId();
    if (!currentWorkspaceId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const body = await request.json();
    if (!validTemplate(body?.template)) return NextResponse.json({ error: "El pago fijo no es válido" }, { status: 400 });
    return NextResponse.json(await updateFixedPaymentTemplate(currentWorkspaceId, body.template));
  } catch (error) {
    console.error("[fixed-payments] PATCH failed", error);
    return NextResponse.json({ error: "No se pudo actualizar el pago fijo" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const currentWorkspaceId = await workspaceId();
    if (!currentWorkspaceId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const templateId = new URL(request.url).searchParams.get("templateId");
    if (!templateId) return NextResponse.json({ error: "Falta el pago fijo" }, { status: 400 });
    return NextResponse.json(await deleteFixedPaymentTemplate(currentWorkspaceId, templateId));
  } catch (error) {
    console.error("[fixed-payments] DELETE failed", error);
    return NextResponse.json({ error: "No se pudo eliminar el pago fijo" }, { status: 500 });
  }
}
