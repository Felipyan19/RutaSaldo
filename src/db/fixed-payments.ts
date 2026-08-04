import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { fixedPaymentOccurrences, fixedPaymentTemplates } from "@/db/schema";
import type { FixedPaymentOccurrence, FixedPaymentTemplate, FixedPaymentsPayload } from "@/lib/fixed-payments";

function toTemplate(row: typeof fixedPaymentTemplates.$inferSelect): FixedPaymentTemplate {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    categoryId: row.categoryId,
    defaultAccountId: row.defaultAccountId,
    frequency: row.frequency as FixedPaymentTemplate["frequency"],
    nextDueDate: row.nextDueDate,
    amountType: row.amountType as FixedPaymentTemplate["amountType"],
    expectedAmount: row.expectedAmount,
    minimumAmount: row.minimumAmount,
    maximumAmount: row.maximumAmount,
    reminderDays: row.reminderDays.split(",").map(Number).filter(Number.isFinite),
    isActive: row.isActive,
  };
}

function toOccurrence(row: typeof fixedPaymentOccurrences.$inferSelect): FixedPaymentOccurrence {
  return {
    id: row.id,
    templateId: row.templateId,
    periodKey: row.periodKey,
    dueDate: row.dueDate,
    expectedAmount: row.expectedAmount,
    actualAmount: row.actualAmount,
    status: row.status as FixedPaymentOccurrence["status"],
    completedAt: row.completedAt?.toISOString() ?? null,
    completionSource: row.completionSource as FixedPaymentOccurrence["completionSource"],
    transactionId: row.transactionId,
    bankEmailMessageId: row.bankEmailMessageId,
    notes: row.notes,
  };
}

export async function readFixedPayments(workspaceId: string): Promise<FixedPaymentsPayload> {
  const db = getDb();
  const [templates, occurrences] = await Promise.all([
    db.select().from(fixedPaymentTemplates).where(eq(fixedPaymentTemplates.workspaceId, workspaceId)).orderBy(asc(fixedPaymentTemplates.nextDueDate)),
    db.select().from(fixedPaymentOccurrences).where(eq(fixedPaymentOccurrences.workspaceId, workspaceId)).orderBy(asc(fixedPaymentOccurrences.dueDate)),
  ]);
  return { templates: templates.map(toTemplate), occurrences: occurrences.map(toOccurrence) };
}

export async function createFixedPaymentTemplate(workspaceId: string, input: FixedPaymentTemplate) {
  const db = getDb();
  await db.insert(fixedPaymentTemplates).values({
    id: input.id,
    workspaceId,
    name: input.name,
    description: input.description,
    categoryId: input.categoryId,
    defaultAccountId: input.defaultAccountId,
    frequency: input.frequency,
    nextDueDate: input.nextDueDate,
    amountType: input.amountType,
    expectedAmount: input.expectedAmount,
    minimumAmount: input.minimumAmount,
    maximumAmount: input.maximumAmount,
    reminderDays: input.reminderDays.join(","),
    isActive: input.isActive,
  });
  return readFixedPayments(workspaceId);
}

export async function updateFixedPaymentTemplate(workspaceId: string, input: FixedPaymentTemplate) {
  const db = getDb();
  await db.update(fixedPaymentTemplates).set({
    name: input.name,
    description: input.description,
    categoryId: input.categoryId,
    defaultAccountId: input.defaultAccountId,
    frequency: input.frequency,
    nextDueDate: input.nextDueDate,
    amountType: input.amountType,
    expectedAmount: input.expectedAmount,
    minimumAmount: input.minimumAmount,
    maximumAmount: input.maximumAmount,
    reminderDays: input.reminderDays.join(","),
    isActive: input.isActive,
    updatedAt: new Date(),
  }).where(and(eq(fixedPaymentTemplates.id, input.id), eq(fixedPaymentTemplates.workspaceId, workspaceId)));
  return readFixedPayments(workspaceId);
}

export async function upsertFixedPaymentOccurrence(workspaceId: string, input: FixedPaymentOccurrence) {
  const db = getDb();
  await db.insert(fixedPaymentOccurrences).values({
    id: input.id,
    workspaceId,
    templateId: input.templateId,
    periodKey: input.periodKey,
    dueDate: input.dueDate,
    expectedAmount: input.expectedAmount,
    actualAmount: input.actualAmount,
    status: input.status,
    completedAt: input.completedAt ? new Date(input.completedAt) : null,
    completionSource: input.completionSource,
    transactionId: input.transactionId,
    bankEmailMessageId: input.bankEmailMessageId,
    notes: input.notes,
  }).onConflictDoUpdate({
    target: [fixedPaymentOccurrences.templateId, fixedPaymentOccurrences.periodKey],
    set: {
      dueDate: input.dueDate,
      expectedAmount: input.expectedAmount,
      actualAmount: input.actualAmount,
      status: input.status,
      completedAt: input.completedAt ? new Date(input.completedAt) : null,
      completionSource: input.completionSource,
      transactionId: input.transactionId,
      bankEmailMessageId: input.bankEmailMessageId,
      notes: input.notes,
      updatedAt: new Date(),
    },
  });
  return readFixedPayments(workspaceId);
}

export async function deleteFixedPaymentTemplate(workspaceId: string, templateId: string) {
  const db = getDb();
  await db.delete(fixedPaymentTemplates).where(and(eq(fixedPaymentTemplates.id, templateId), eq(fixedPaymentTemplates.workspaceId, workspaceId)));
  return readFixedPayments(workspaceId);
}
