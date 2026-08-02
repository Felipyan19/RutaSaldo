CREATE TABLE IF NOT EXISTS "bank_email_connections" (
  "id" text PRIMARY KEY NOT NULL,
  "workspace_id" text NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "provider" text NOT NULL DEFAULT 'gmail',
  "email" text NOT NULL,
  "status" text NOT NULL DEFAULT 'active',
  "last_history_id" text,
  "last_synced_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "bank_email_messages" (
  "id" text PRIMARY KEY NOT NULL,
  "workspace_id" text NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "connection_id" text NOT NULL REFERENCES "bank_email_connections"("id") ON DELETE CASCADE,
  "gmail_message_id" text NOT NULL,
  "thread_id" text,
  "sender" text NOT NULL,
  "subject" text NOT NULL,
  "received_at" timestamp with time zone NOT NULL,
  "body_hash" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending_review',
  "confidence_basis_points" integer NOT NULL DEFAULT 0,
  "parsed_payload" text NOT NULL,
  "transaction_id" text REFERENCES "transactions"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "bank_email_messages_connection_message_unique"
  ON "bank_email_messages" ("connection_id", "gmail_message_id");

CREATE UNIQUE INDEX IF NOT EXISTS "bank_email_messages_workspace_hash_unique"
  ON "bank_email_messages" ("workspace_id", "body_hash");

CREATE TABLE IF NOT EXISTS "bank_email_sync_runs" (
  "id" text PRIMARY KEY NOT NULL,
  "workspace_id" text NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "connection_id" text NOT NULL REFERENCES "bank_email_connections"("id") ON DELETE CASCADE,
  "started_at" timestamp with time zone NOT NULL DEFAULT now(),
  "finished_at" timestamp with time zone,
  "status" text NOT NULL DEFAULT 'running',
  "messages_scanned" integer NOT NULL DEFAULT 0,
  "messages_imported" integer NOT NULL DEFAULT 0,
  "messages_pending_review" integer NOT NULL DEFAULT 0,
  "error_message" text
);
