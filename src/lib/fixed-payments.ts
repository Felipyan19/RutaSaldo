export type FixedPaymentFrequency = "weekly" | "biweekly" | "monthly" | "bimonthly" | "quarterly" | "semiannual" | "annual";
export type FixedPaymentAmountType = "exact" | "approximate" | "range";
export type FixedPaymentStatus = "pending" | "completed" | "skipped" | "overdue";
export type FixedPaymentCompletionSource = "manual" | "transaction" | "bank_email";

export interface FixedPaymentTemplate {
  id: string;
  name: string;
  description: string;
  categoryId: string | null;
  defaultAccountId: string | null;
  frequency: FixedPaymentFrequency;
  nextDueDate: string;
  amountType: FixedPaymentAmountType;
  expectedAmount: number;
  minimumAmount: number | null;
  maximumAmount: number | null;
  reminderDays: number[];
  isActive: boolean;
}

export interface FixedPaymentOccurrence {
  id: string;
  templateId: string;
  periodKey: string;
  dueDate: string;
  expectedAmount: number;
  actualAmount: number | null;
  status: FixedPaymentStatus;
  completedAt: string | null;
  completionSource: FixedPaymentCompletionSource | null;
  transactionId: string | null;
  bankEmailMessageId: string | null;
  notes: string;
}

export interface FixedPaymentsPayload {
  templates: FixedPaymentTemplate[];
  occurrences: FixedPaymentOccurrence[];
}

export function fixedPaymentPeriodKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
