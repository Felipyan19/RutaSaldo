import Link from "next/link";
import { ArrowRight, CalendarClock } from "lucide-react";
import { SummaryPage } from "@/components/finance/summary-page";

export default function Page() {
  return <div className="space-y-5">
    <Link href="/obligaciones" className="flex items-center gap-4 rounded-2xl border border-[#dce1da] bg-white p-4 transition hover:border-[#bfc9c0]">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#eef3ef] text-[#4f6c5c]"><CalendarClock size={20} /></span>
      <span className="min-w-0 flex-1"><span className="block font-semibold">Cuotas, deudas y próximos pagos</span><span className="mt-1 block text-xs text-[#5e6d63]">Gestiona las funciones de la Fase 2 y concilia transferencias.</span></span>
      <ArrowRight size={18} className="shrink-0 text-[#5e6d63]" />
    </Link>
    <SummaryPage />
  </div>;
}
