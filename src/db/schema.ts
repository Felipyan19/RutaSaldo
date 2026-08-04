import { boolean, date, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const workspaces = pgTable("workspaces", { id: text("id").primaryKey(), name: text("name").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() });
export const users = pgTable("users", { id: text("id").primaryKey(), provider: text("provider").notNull().default("google"), providerAccountId: text("provider_account_id").notNull(), email: text("email").notNull(), name: text("name"), image: text("image"), workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }), googleDataConsentAt: timestamp("google_data_consent_at", { withTimezone: true }), googleDataConsentVersion: text("google_data_consent_version"), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull() }, (table) => ({ providerAccountUnique: uniqueIndex("users_provider_account_unique").on(table.provider, table.providerAccountId), workspaceUnique: uniqueIndex("users_workspace_unique").on(table.workspaceId) }));
export const accounts = pgTable("accounts", { id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }), name: text("name").notNull(), institution: text("institution").notNull(), kind: text("kind").notNull(), color: text("color").notNull(), openingBalance: integer("opening_balance").notNull().default(0), currency: text("currency").notNull().default("COP") });
export const creditCardDetails = pgTable("credit_card_details", { accountId: text("account_id").primaryKey().references(() => accounts.id, { onDelete: "cascade" }), workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }), creditLimit: integer("credit_limit").notNull(), statementDay: integer("statement_day").notNull(), paymentDueDay: integer("payment_due_day").notNull(), lastFourDigits: text("last_four_digits"), interestRateBasisPoints: integer("interest_rate_basis_points").notNull().default(0) });
export const accountPaymentInstruments = pgTable("account_payment_instruments", { id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }), accountId: text("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }), instrumentType: text("instrument_type").notNull(), brand: text("brand"), label: text("label"), lastFourDigits: text("last_four_digits").notNull(), isPrimary: boolean("is_primary").notNull().default(false), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull() }, (table) => ({ accountLastFourUnique: uniqueIndex("account_payment_instruments_account_last4_unique").on(table.accountId, table.lastFourDigits) }));
export const categories = pgTable("categories", { id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }), name: text("name").notNull(), color: text("color").notNull(), icon: text("icon").notNull() });
export const transfers = pgTable("transfers", { id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }), fromAccountId: text("from_account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }), toAccountId: text("to_account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }), amount: integer("amount").notNull(), description: text("description").notNull(), date: date("date").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() });
export const transactions = pgTable("transactions", { id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }), accountId: text("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }), categoryId: text("category_id").references(() => categories.id, { onDelete: "restrict" }), kind: text("kind").notNull(), amount: integer("amount").notNull(), description: text("description").notNull(), date: date("date").notNull(), transferId: text("transfer_id").references(() => transfers.id, { onDelete: "cascade" }), transferSide: text("transfer_side"), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() });

export const installmentPlans = pgTable("installment_plans", { id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }), transactionId: text("transaction_id").notNull().references(() => transactions.id, { onDelete: "cascade" }), accountId: text("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }), description: text("description").notNull(), totalAmount: integer("total_amount").notNull(), installmentCount: integer("installment_count").notNull(), purchaseDate: date("purchase_date").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() });
export const installments = pgTable("installments", { id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }), planId: text("plan_id").notNull().references(() => installmentPlans.id, { onDelete: "cascade" }), number: integer("number").notNull(), amount: integer("amount").notNull(), dueDate: date("due_date").notNull(), status: text("status").notNull().default("pending"), paidAt: date("paid_at") }, (table) => ({ planNumberUnique: uniqueIndex("installments_plan_number_unique").on(table.planId, table.number) }));
export const debts = pgTable("debts", { id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }), name: text("name").notNull(), creditor: text("creditor").notNull(), originalAmount: integer("original_amount").notNull(), currentBalance: integer("current_balance").notNull(), interestRateBasisPoints: integer("interest_rate_basis_points").notNull().default(0), minimumPayment: integer("minimum_payment").notNull().default(0), paymentDueDay: integer("payment_due_day").notNull(), status: text("status").notNull().default("active"), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() });
export const debtPayments = pgTable("debt_payments", { id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }), debtId: text("debt_id").notNull().references(() => debts.id, { onDelete: "cascade" }), accountId: text("account_id").notNull().references(() => accounts.id, { onDelete: "restrict" }), transactionId: text("transaction_id").notNull().references(() => transactions.id, { onDelete: "restrict" }), amount: integer("amount").notNull(), paidAt: date("paid_at").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() });

export const fixedPaymentTemplates = pgTable("fixed_payment_templates", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
  defaultAccountId: text("default_account_id").references(() => accounts.id, { onDelete: "set null" }),
  frequency: text("frequency").notNull().default("monthly"),
  nextDueDate: date("next_due_date").notNull(),
  amountType: text("amount_type").notNull().default("exact"),
  expectedAmount: integer("expected_amount").notNull().default(0),
  minimumAmount: integer("minimum_amount"),
  maximumAmount: integer("maximum_amount"),
  reminderDays: text("reminder_days").notNull().default("3,0"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const fixedPaymentOccurrences = pgTable("fixed_payment_occurrences", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  templateId: text("template_id").notNull().references(() => fixedPaymentTemplates.id, { onDelete: "cascade" }),
  periodKey: text("period_key").notNull(),
  dueDate: date("due_date").notNull(),
  expectedAmount: integer("expected_amount").notNull().default(0),
  actualAmount: integer("actual_amount"),
  status: text("status").notNull().default("pending"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  completionSource: text("completion_source"),
  transactionId: text("transaction_id").references(() => transactions.id, { onDelete: "set null" }),
  bankEmailMessageId: text("bank_email_message_id"),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({ templatePeriodUnique: uniqueIndex("fixed_payment_occurrences_template_period_unique").on(table.templateId, table.periodKey) }));
