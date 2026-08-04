import { Phase2Page } from "@/components/finance/phase2-page";

export default function ObligacionesPage() {
  return (
    <div className="space-y-6">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#18241e]">Obligaciones</h1>
        <p className="mt-2 text-sm leading-6 text-[#5e6d63]">
          Analiza cuotas, deudas, próximos pagos y conciliaciones desde una sección independiente.
        </p>
      </div>
      <Phase2Page />
    </div>
  );
}
