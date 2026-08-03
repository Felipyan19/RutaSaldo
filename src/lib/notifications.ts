import { AlertTriangle, ArrowDownCircle, ArrowRightLeft, ArrowUpCircle, BellRing, CalendarClock, CheckCircle2, Tags, Trash2, WalletCards, type LucideIcon } from "lucide-react";
import { creditCardDebt, formatCOP, type FinanceState } from "@/lib/finance";
import { FINANCE_ACTION_HISTORY_KEY } from "@/components/finance/finance-provider";

export type FinanceNotification = {
  id: string;
  title: string;
  description: string;
  href: string;
  severity: "info" | "warning" | "urgent";
  icon: LucideIcon;
};

type StoredAction = {
  id: string;
  title: string;
  description: string;
  href: string;
  createdAt: string;
  action: "account" | "category" | "income" | "expense" | "transfer" | "clear";
};

const actionIcons: Record<StoredAction["action"], LucideIcon> = {
  account: WalletCards,
  category: Tags,
  income: ArrowUpCircle,
  expense: ArrowDownCircle,
  transfer: ArrowRightLeft,
  clear: Trash2,
};

function readActionHistory(): FinanceNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(FINANCE_ACTION_HISTORY_KEY);
    const actions = stored ? JSON.parse(stored) as StoredAction[] : [];
    return actions
      .filter((action) => !["income", "expense"].includes(action.action))
      .slice(0, 20)
      .map((action) => ({
        id: `history:${action.id}`,
        title: action.title,
        description: action.description,
        href: action.href,
        severity: "info" as const,
        icon: actionIcons[action.action] ?? CheckCircle2,
      }));
  } catch {
    return [];
  }
}

function recentMovementNotifications(state: FinanceState): FinanceNotification[] {
  return [...state.transactions]
    .filter((transaction) => !transaction.transferId)
    .sort((a, b) => {
      const dateOrder = b.date.localeCompare(a.date);
      if (dateOrder !== 0) return dateOrder;
      return b.id.localeCompare(a.id);
    })
    .slice(0, 12)
    .map((transaction) => {
      const income = transaction.kind === "income";
      return {
        id: `movement:${transaction.id}`,
        title: income ? "Ingreso registrado" : "Gasto registrado",
        description: `${transaction.description} · ${formatCOP(transaction.amount)}`,
        href: "/movimientos",
        severity: "info" as const,
        icon: income ? ArrowUpCircle : ArrowDownCircle,
      };
    });
}

function nextMonthlyDate(day: number, now: Date) {
  const safeDay = Math.min(Math.max(day, 1), 28);
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), safeDay, 12);
  if (currentMonth >= now) return currentMonth;
  return new Date(now.getFullYear(), now.getMonth() + 1, safeDay, 12);
}

function daysBetween(from: Date, to: Date) {
  const dayMs = 24 * 60 * 60 * 1000;
  const fromDay = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const toDay = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.round((toDay - fromDay) / dayMs);
}

export function buildFinanceNotifications(state: FinanceState, now = new Date()): FinanceNotification[] {
  const alerts: FinanceNotification[] = [];

  for (const account of state.accounts) {
    if (account.kind !== "credit_card" || !account.creditCardDetails) continue;

    const debt = creditCardDebt(account, state.transactions);
    const limit = account.creditCardDetails.creditLimit;
    const utilization = limit > 0 ? debt / limit : 0;
    const dueDate = nextMonthlyDate(account.creditCardDetails.paymentDueDay, now);
    const daysUntilDue = daysBetween(now, dueDate);
    const period = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}`;

    if (debt > 0 && daysUntilDue <= 7) {
      const dueLabel = daysUntilDue === 0 ? "vence hoy" : daysUntilDue === 1 ? "vence mañana" : `vence en ${daysUntilDue} días`;
      alerts.push({
        id: `card-due:${account.id}:${period}`,
        title: `${account.institution} ${dueLabel}`,
        description: `Tienes una deuda actual de ${formatCOP(debt)} en ${account.name}.`,
        href: "/cuentas",
        severity: daysUntilDue <= 1 ? "urgent" : "warning",
        icon: CalendarClock,
      });
    }

    if (debt > 0 && utilization >= 0.8) {
      alerts.push({
        id: `card-limit:${account.id}:${Math.floor(utilization * 10)}`,
        title: "Cupo de tarjeta casi agotado",
        description: `${account.institution} está usando ${Math.round(utilization * 100)}% de su cupo.`,
        href: "/cuentas",
        severity: utilization >= 0.95 ? "urgent" : "warning",
        icon: AlertTriangle,
      });
    }
  }

  if (state.accounts.length > 0 && state.transactions.length === 0) {
    alerts.push({
      id: "first-movement",
      title: "Registra tu primer movimiento",
      description: "Agrega un ingreso o gasto para que el resumen refleje tu situación real.",
      href: "/movimientos",
      severity: "info",
      icon: BellRing,
    });
  }

  alerts.sort((a, b) => {
    const weight = { urgent: 0, warning: 1, info: 2 } as const;
    return weight[a.severity] - weight[b.severity];
  });

  return [...alerts, ...recentMovementNotifications(state), ...readActionHistory()];
}
