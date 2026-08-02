"use client";

import Link from "next/link";
import { CalendarClock, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { deriveUpcomingPayments, type Phase2State } from "@/lib/phase2";

export function Phase2Status() {
  const [state, setState] = useState<Phase2State | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/finance/phase2", { cache: "no-store" });
        if (response.ok && active) setState(await response.json());
      } catch {}
    }
    void load();
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => { active = false; window.removeEventListener("focus", onFocus); };
  }, []);

  const payments = useMemo(() => state ? deriveUpcomingPayments(state) : [], [state]);
  const overdue = payments.filter((item) => item.overdue).length;
  const next = payments[0];

  return <Link href="/obligaciones" aria-label="Abrir cuotas, deudas y próximos pagos" className={`fixed bottom-4 right-4 z-40 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl border px-4 py-3 shadow-[0_14px_40px_rgba(23,35,30,.18)] transition hover:-translate-y-0.5 ${overdue ? "border-[#edc7bd] bg-[#fff6f2]" : "border-[#d7e1d9] bg-[#fbfcf8]"}`}>
    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${overdue ? "bg-[#fff0ec] text-[#b24e3d]" : "bg-[#eef3ef] text-[#4f6c5c]"}`}><CalendarClock size={18} /></span>
    <span className="min-w-0"><span className="block text-sm font-semibold">{overdue ? `${overdue} pago${overdue === 1 ? "" : "s"} vencido${overdue === 1 ? "" : "s"}` : "Cuotas y deudas"}</span><span className="block max-w-56 truncate text-xs text-[#5e6d63]">{next ? `${next.title} · ${next.dueDate}` : "Gestionar obligaciones"}</span></span>
    <ChevronRight size={16} className="shrink-0 text-[#5e6d63]" />
  </Link>;
}
