"use client";

import { useEffect, useId, useRef } from "react";
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
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex min-h-[100dvh] items-end justify-center overflow-y-auto bg-[#0d1712]/45 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? descriptionId : undefined}
        className="my-0 max-h-[100dvh] w-full overflow-y-auto rounded-t-3xl bg-[#fbfcf8] p-6 shadow-2xl sm:my-auto sm:max-h-[calc(100dvh-3rem)] sm:max-w-lg sm:rounded-3xl sm:p-8"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-7 flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-xl font-semibold tracking-[-0.025em] text-[#18241e]">{title}</h2>
            {subtitle && <p id={descriptionId} className="mt-1 text-sm text-[#4e5f54]">{subtitle}</p>}
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label={`Cerrar ${title.toLowerCase()}`} title="Cerrar" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#edf0eb] text-[#59645e] hover:bg-[#e2e6df]">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
