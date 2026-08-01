import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getWorkspaceIdForUser } from "@/db/users";
import { createDebt, createInstallmentPurchase, payDebt, readPhase2State, reconcileTransactions, setInstallmentPayment } from "@/db/phase2";
import { FinanceInputError } from "@/db/finance";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const id = z.string().trim().min(1).max(120);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const money = z.number().int().positive().max(1_000_000_000_000);

async function workspaceId() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return getWorkspaceIdForUser(session.user.id);
}

export async function GET() {
  try {
    const current = await workspaceId();
    if (!current) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    return NextResponse.json(await readPhase2State(current), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[phase2] GET failed", error);
    return NextResponse.json({ error: "No se pudieron cargar cuotas y deudas." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const current = await workspaceId();
    if (!current) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const body = await request.json();

    if (body?.type === "installment_purchase") {
      const parsed = z.object({ id, accountId: id, categoryId: id, description: z.string().trim().min(1).max(200), totalAmount: money, installmentCount: z.number().int().min(2).max(60), purchaseDate: date }).safeParse(body.purchase);
      if (!parsed.success) return NextResponse.json({ error: "La compra a cuotas no es válida." }, { status: 400 });
      return NextResponse.json(await createInstallmentPurchase(current, parsed.data));
    }
    if (body?.type === "installment_payment") {
      const parsed = z.object({ installmentId: id, paid: z.boolean(), paidAt: date.optional() }).safeParse(body.installment);
      if (!parsed.success) return NextResponse.json({ error: "El estado de la cuota no es válido." }, { status: 400 });
      return NextResponse.json(await setInstallmentPayment(current, parsed.data));
    }
    if (body?.type === "debt") {
      const parsed = z.object({ id, name: z.string().trim().min(1).max(100), creditor: z.string().trim().min(1).max(100), amount: money, interestRate: z.number().min(0).max(500), minimumPayment: z.number().int().min(0).max(1_000_000_000_000), paymentDueDay: z.number().int().min(1).max(31) }).safeParse(body.debt);
      if (!parsed.success) return NextResponse.json({ error: "La deuda no es válida." }, { status: 400 });
      return NextResponse.json(await createDebt(current, parsed.data));
    }
    if (body?.type === "debt_payment") {
      const parsed = z.object({ id, debtId: id, accountId: id, amount: money, paidAt: date }).safeParse(body.payment);
      if (!parsed.success) return NextResponse.json({ error: "El abono no es válido." }, { status: 400 });
      return NextResponse.json(await payDebt(current, parsed.data));
    }
    if (body?.type === "reconcile") {
      const parsed = z.object({ id, outgoingTransactionId: id, incomingTransactionId: id, description: z.string().trim().max(200).optional() }).safeParse(body.reconciliation);
      if (!parsed.success) return NextResponse.json({ error: "La conciliación no es válida." }, { status: 400 });
      return NextResponse.json(await reconcileTransactions(current, parsed.data));
    }
    return NextResponse.json({ error: "Operación de fase 2 no soportada." }, { status: 400 });
  } catch (error) {
    console.error("[phase2] POST failed", error);
    return NextResponse.json({ error: error instanceof FinanceInputError ? error.message : "No se pudo completar la operación." }, { status: error instanceof FinanceInputError ? 400 : 500 });
  }
}
