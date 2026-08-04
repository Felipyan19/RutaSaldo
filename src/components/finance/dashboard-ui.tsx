import type { LucideIcon } from "lucide-react";

export function PageHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div className="max-w-2xl"><h1 className="text-2xl font-semibold tracking-[-0.035em] text-[#18241e] sm:text-3xl">{title}</h1><p className="mt-2 text-sm leading-6 text-[#5e6d63]">{description}</p></div>
    {action && <div className="shrink-0 sm:pt-0.5">{action}</div>}
  </div>;
}

export function MetricCard({ icon: Icon, label, value, note, tone = "neutral", featured = false }: { icon: LucideIcon; label: string; value: string; note?: string; tone?: "neutral" | "positive" | "negative" | "warning"; featured?: boolean }) {
  const tones = {
    neutral: "bg-[#eef3ef] text-[#4f6c5c]",
    positive: "bg-[#eaf5ed] text-[#3f7258]",
    negative: "bg-[#fff0ec] text-[#a65343]",
    warning: "bg-[#fff6df] text-[#8a6328]",
  };
  return <article className={`flex h-full min-h-[9.5rem] flex-col rounded-2xl border border-[#e0e4dd] bg-white ${featured ? "p-5 sm:p-6" : "p-4 sm:p-5"}`}>
    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${tones[tone]}`}><Icon size={17} aria-hidden="true" /></span>
    <p className="mt-4 text-xs leading-5 text-[#5e6d63]">{label}</p>
    <p className={`mt-1 break-words font-semibold tracking-tight ${featured ? "text-2xl" : "text-xl"}`}>{value}</p>
    {note && <p className="mt-auto pt-2 text-xs leading-5 text-[#6b786f]">{note}</p>}
  </article>;
}

export function Panel({ title, description, children, className = "" }: { title?: string; description?: string; children: React.ReactNode; className?: string }) {
  return <section className={`rounded-3xl border border-[#e0e4dd] bg-white p-5 md:p-7 ${className}`}>
    {(title || description) && <div className="mb-5"><h2 className="text-lg font-semibold tracking-[-0.015em]">{title}</h2>{description && <p className="mt-1 text-xs leading-5 text-[#5e6d63]">{description}</p>}</div>}
    {children}
  </section>;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-20 place-items-center rounded-2xl border border-dashed border-[#cbd5cc] px-5 py-6 text-center text-sm leading-6 text-[#5e6d63]">{children}</div>;
}

export function AnalysisBar({ label, value, percentage, color }: { label: string; value: string; percentage: number; color: string }) {
  const safe = Math.max(0, Math.min(100, percentage));
  return <div role="img" aria-label={`${label}: ${value}, ${Math.round(safe)}% respecto al valor mayor`}>
    <div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="min-w-0 truncate font-medium">{label}</span><span className="shrink-0 font-semibold tabular-nums">{value}</span></div>
    <div className="h-2 overflow-hidden rounded-full bg-[#edf0eb]"><div className="h-full rounded-full" style={{ width: `${Math.max(safe > 0 ? 5 : 0, safe)}%`, backgroundColor: color }} /></div>
  </div>;
}
