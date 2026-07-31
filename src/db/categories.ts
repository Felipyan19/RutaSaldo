import { and, eq } from "drizzle-orm";
import { getDb } from "./index";
import { categories, transactions } from "./schema";
import { FinanceInputError, readFinanceState } from "./finance";
import { categoryInputSchema } from "@/lib/finance-schema";
import type { Category } from "@/lib/finance";

export async function createCategory(workspaceId: string, input: Category) {
  const parsed = categoryInputSchema.parse(input);
  const db = getDb();
  const [duplicate] = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.workspaceId, workspaceId), eq(categories.name, parsed.name)));
  if (duplicate) throw new FinanceInputError("Ya existe una categoría con ese nombre.");
  await db.insert(categories).values({ ...parsed, workspaceId });
  return readFinanceState(workspaceId);
}

export async function updateCategory(workspaceId: string, categoryId: string, input: Omit<Category, "id">) {
  const parsed = categoryInputSchema.parse({ ...input, id: categoryId });
  const db = getDb();
  const [existing] = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.workspaceId, workspaceId), eq(categories.id, categoryId)));
  if (!existing) throw new FinanceInputError("Categoría no encontrada.");
  await db.update(categories).set({ name: parsed.name, color: parsed.color, icon: parsed.icon }).where(and(eq(categories.workspaceId, workspaceId), eq(categories.id, categoryId)));
  return readFinanceState(workspaceId);
}

export async function deleteCategory(workspaceId: string, categoryId: string) {
  const db = getDb();
  const [usage] = await db.select({ id: transactions.id }).from(transactions).where(and(eq(transactions.workspaceId, workspaceId), eq(transactions.categoryId, categoryId))).limit(1);
  if (usage) throw new FinanceInputError("No puedes eliminar una categoría que tiene movimientos. Edítala o reasigna primero esos movimientos.");
  const deleted = await db.delete(categories).where(and(eq(categories.workspaceId, workspaceId), eq(categories.id, categoryId))).returning({ id: categories.id });
  if (!deleted.length) throw new FinanceInputError("Categoría no encontrada.");
  return readFinanceState(workspaceId);
}
