import { SummaryPage } from "@/components/finance/summary-page";
import { ObligationsSummaryCard } from "@/components/finance/obligations-summary-card";

export default function Page() {
  return <div className="space-y-6">
    <SummaryPage />
    <ObligationsSummaryCard />
  </div>;
}
