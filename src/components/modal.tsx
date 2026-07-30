"use client";

import { X } from "lucide-react";

export function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-[#0d1712]/45 p-0 backdrop-blur-sm sm:place-items-center sm:p-6">
      <div className="max-h-[92vh] w-full overflow-auto rounded-t-3xl bg-[#fbfcf8] p-6 shadow-2xl sm:max-w-lg sm:rounded-3xl sm:p-8">
        <div className="mb-7 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.025em] text-[#18241e]">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-[#758079]">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-[#edf0eb] text-[#59645e] hover:bg-[#e2e6df]">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
