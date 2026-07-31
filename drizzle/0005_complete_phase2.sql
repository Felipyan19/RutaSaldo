CREATE TABLE "installment_plans" (
  "id" text PRIMARY KEY NOT NULL,
  "workspace_id" text NOT NULL,
  "transaction_id" text NOT NULL,
  "account_id" text NOT NULL,
  "description" text NOT NULL,
  "total_amount" integer NOT NULL,
  "installment_count" integer NOT NULL,
  "purchase_date" date NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "installments" (
  "id" text PRIMARY KEY NOT NULL,
  "workspace_id" text NOT NULL,
  "plan_id" text NOT NULL,
  "number" integer NOT NULL,
  "amount" integer NOT NULL,
  "due_date" date NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "paid_at" date
);
CREATE UNIQUE INDEX "installments_plan_number_unique" ON "installments" USING btree ("plan_id","number");
CREATE TABLE "debts" (
  "id" text PRIMARY KEY NOT NULL,
  "workspace_id" text NOT NULL,
  "name" text NOT NULL,
  "creditor" text NOT NULL,
  "original_amount" integer NOT NULL,
  "current_balance" integer NOT NULL,
  "interest_rate_basis_points" integer DEFAULT 0 NOT NULL,
  "minimum_payment" integer DEFAULT 0 NOT NULL,
  "payment_due_day" integer NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "debt_payments" (
  "id" text PRIMARY KEY NOT NULL,
  "workspace_id" text NOT NULL,
  "debt_id" text NOT NULL,
  "account_id" text NOT NULL,
  "transaction_id" text NOT NULL,
  "amount" integer NOT NULL,
  "paid_at" date NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "installment_plans" ADD CONSTRAINT "installment_plans_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade;
ALTER TABLE "installment_plans" ADD CONSTRAINT "installment_plans_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade;
ALTER TABLE "installment_plans" ADD CONSTRAINT "installment_plans_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade;
ALTER TABLE "installments" ADD CONSTRAINT "installments_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade;
ALTER TABLE "installments" ADD CONSTRAINT "installments_plan_id_installment_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."installment_plans"("id") ON DELETE cascade;
ALTER TABLE "debts" ADD CONSTRAINT "debts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade;
ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade;
ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_debt_id_debts_id_fk" FOREIGN KEY ("debt_id") REFERENCES "public"."debts"("id") ON DELETE cascade;
ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict;
ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE restrict;
