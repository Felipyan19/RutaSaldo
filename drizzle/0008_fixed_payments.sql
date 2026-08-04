CREATE TABLE IF NOT EXISTS "fixed_payment_templates" (
  "id" text PRIMARY KEY NOT NULL,
  "workspace_id" text NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "category_id" text REFERENCES "categories"("id") ON DELETE set null,
  "default_account_id" text REFERENCES "accounts"("id") ON DELETE set null,
  "frequency" text DEFAULT 'monthly' NOT NULL,
  "next_due_date" date NOT NULL,
  "amount_type" text DEFAULT 'exact' NOT NULL,
  "expected_amount" integer DEFAULT 0 NOT NULL,
  "minimum_amount" integer,
  "maximum_amount" integer,
  "reminder_days" text DEFAULT '3,0' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "fixed_payment_occurrences" (
  "id" text PRIMARY KEY NOT NULL,
  "workspace_id" text NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
  "template_id" text NOT NULL REFERENCES "fixed_payment_templates"("id") ON DELETE cascade,
  "period_key" text NOT NULL,
  "due_date" date NOT NULL,
  "expected_amount" integer DEFAULT 0 NOT NULL,
  "actual_amount" integer,
  "status" text DEFAULT 'pending' NOT NULL,
  "completed_at" timestamp with time zone,
  "completion_source" text,
  "transaction_id" text REFERENCES "transactions"("id") ON DELETE set null,
  "bank_email_message_id" text,
  "notes" text DEFAULT '' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "fixed_payment_occurrences_template_period_unique"
  ON "fixed_payment_occurrences" ("template_id", "period_key");

CREATE INDEX IF NOT EXISTS "fixed_payment_templates_workspace_due_idx"
  ON "fixed_payment_templates" ("workspace_id", "next_due_date");

CREATE INDEX IF NOT EXISTS "fixed_payment_occurrences_workspace_due_idx"
  ON "fixed_payment_occurrences" ("workspace_id", "due_date");
