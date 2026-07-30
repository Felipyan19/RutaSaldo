import { date, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull().default("google"),
  providerAccountId: text("provider_account_id").notNull(),
  email: text("email").notNull(),
  name: text("name"),
  image: text("image"),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  googleDataConsentAt: timestamp("google_data_consent_at", { withTimezone: true }),
  googleDataConsentVersion: text("google_data_consent_version"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  providerAccountUnique: uniqueIndex("users_provider_account_unique").on(table.provider, table.providerAccountId),
  workspaceUnique: uniqueIndex("users_workspace_unique").on(table.workspaceId),
}));

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
