import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getWorkspaceIdForUser } from "@/db/users";
import { readFinanceState } from "@/db/finance";
import { DashboardShell } from "@/components/finance/dashboard-shell";
import { FinanceProvider } from "@/components/finance/finance-provider";
import { ObligationsNavItem } from "@/components/finance/obligations-nav-item";

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const workspaceId = await getWorkspaceIdForUser(session.user.id);
  if (!workspaceId) redirect("/?auth_error=not_registered");

  const initialState = await readFinanceState(workspaceId);
  return <FinanceProvider initialState={initialState}><DashboardShell user={session.user}>{children}</DashboardShell><ObligationsNavItem /></FinanceProvider>;
}
