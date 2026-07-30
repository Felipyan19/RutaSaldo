import { date, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  institution: text("institution").notNull(),
  kind: text("kind").notNull(),
  color: text("color").notNull(),
  openingBalance: integer("opening_balance").notNull().default(0),
  currency: text("currency").notNull().default("COP"),
});

export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull(),
  icon: text("icon").notNull(),
});

export const transactions = pgTable("transactions", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  categoryId: text("category_id").notNull().references(() => categories.id, { onDelete: "restrict" }),
  kind: text("kind").notNull(),
  amount: integer("amount").notNull(),
  description: text("description").notNull(),
  date: date("date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
