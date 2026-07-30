import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center overflow-hidden bg-[#17231e] px-6 py-16 text-white">
      <div className="rutasaldo-404-glow rutasaldo-404-glow--one" />
      <div className="rutasaldo-404-glow rutasaldo-404-glow--two" />
      <section className="relative w-full max-w-lg text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-[1.7rem] bg-[#b7f34b] text-[#17231e] shadow-[0_0_70px_rgba(183,243,75,.2)]">
          <BrandMark size={48} />
        </div>
        <p className="mt-10 text-sm font-semibold uppercase tracking-[0.26em] text-[#b7f34b]">RutaSaldo</p>
        <p className="mt-4 text-[clamp(6rem,25vw,11rem)] font-semibold leading-none tracking-[-0.09em] text-white/95">404</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">Esta ruta se salió del camino</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#aebbb3]">La página que buscas no existe o cambió de dirección. Regresa al inicio y continúa organizando tu plata.</p>
        <Link className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-[#b7f34b] px-5 text-sm font-semibold text-[#17231e] transition hover:bg-[#c8fa73]" href="/">
          <ArrowLeft size={17} />
          Volver a RutaSaldo
        </Link>
      </section>
    </main>
  );
}
