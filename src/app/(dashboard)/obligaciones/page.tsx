import { Phase2Page } from "@/components/finance/phase2-page";

export default function ObligacionesPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-[#52665a]">Planificación y compromisos</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#18241e]">Obligaciones</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5e6d63]">
          Administra compras a cuotas, deudas, abonos, próximos pagos y conciliaciones desde una sección independiente.
        </p>
      </div>
      <Phase2Page />
    </div>
  );
}
