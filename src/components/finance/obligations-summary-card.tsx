"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { deriveUpcomingPayments, type Phase2State } from "@/lib/phase2";

export function ObligationsSummaryCard() {
  const [state, setState] = useState<Phase2State | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/finance/phase2", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => { if (active && payload) setState(payload); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const payments = useMemo(() => state ? deriveUpcomingPayments(state) : [], [state]);
  const overdue = payments.filter((item) => item.overdue).length;
  const activeDebts = state?.debts.filter((item) => item.status === "active").length ?? 0;
  const pendingInstallments = state?.installmentPlans.reduce((total, plan) => total + plan.installments.filter((item) => item.status === "pending").length, 0) ?? 0;

  return <Link href="/obligaciones" className="block rounded-[2rem] border border-[#dce1da] bg-white p-6 transition hover:border-[#bfc9c0] hover:shadow-[0_12px_30px_rgba(23,35,30,.06)]">
    <div className="flex items-start gap-4">
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${overdue ? "bg-[#fff0ec] text-[#b24e3d]" : "bg-[#eef3ef] text-[#4f6c5c]"}`}><CalendarClock size={22} /></span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span>
            <span className="block text-sm text-[#5e6d63]">Obligaciones</span>
            <span className="mt-1 block text-xl font-semibold">{overdue ? `${overdue} pago${overdue === 1 ? "" : "s"} vencido${overdue === 1 ? "" : "s"}` : `${payments.length} pagos pendientes`}</span>
          </span>
          <ArrowRight size={19} className="mt-1 shrink-0 text-[#5e6d63]" />
        </span>
        <span className="mt-4 grid grid-cols-2 gap-3 border-t border-[#edf0eb] pt-4 text-xs text-[#5e6d63]">
          <span><strong className="block text-base text-[#18241e]">{pendingInstallments}</strong> cuotas pendientes</span>
          <span><strong className="block text-base text-[#18241e]">{activeDebts}</strong> deudas activas</span>
        </span>
      </span>
    </div>
  </Link>;
}
