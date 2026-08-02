"use client";

import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

export function ObligationsNavItem() {
  const pathname = usePathname();
  const [targets, setTargets] = useState<HTMLElement[]>([]);

  useEffect(() => {
    const sync = () => setTargets(Array.from(document.querySelectorAll<HTMLElement>('nav[aria-label="Navegación financiera"]')));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const active = pathname.startsWith("/obligaciones");
  return <>{targets.map((target, index) => createPortal(
    <Link
      key={`obligaciones-${index}`}
      href="/obligaciones"
      className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${active ? "bg-[#b7f34b] text-[#17231e]" : "text-[#aab7af] hover:bg-white/[.06] hover:text-white"}`}
    >
      <CalendarClock size={18} />
      Obligaciones
    </Link>,
    target,
  ))}</>;
}
