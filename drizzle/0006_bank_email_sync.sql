CREATE TABLE IF NOT EXISTS "bank_email_connections" (
  "id" text PRIMARY KEY NOT NULL,
  "workspace_id" text NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "provider" text NOT NULL DEFAULT 'gmail',
  "email" text NOT NULL,
  "status" text NOT NULL DEFAULT 'active',
  "encrypted_refresh_token" text,
  "token_key_version" integer,
  "last_history_id" text,
  "last_synced_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "bank_email_connections_provider_check" CHECK ("provider" IN ('gmail')),
  CONSTRAINT "bank_email_connections_status_check" CHECK ("status" IN ('active', 'reauth_required', 'disabled'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "bank_email_connections_workspace_email_unique"
  ON "bank_email_connections" ("workspace_id", lower("email"));

CREATE TABLE IF NOT EXISTS "bank_email_messages" (
  "id" text PRIMARY KEY NOT NULL,
  "workspace_id" text NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "connection_id" text NOT NULL REFERENCES "bank_email_connections"("id") ON DELETE CASCADE,
  "gmail_message_id" text NOT NULL,
  "thread_id" text,
  "history_id" text,
  "sender" text NOT NULL,
  "sender_domain" text NOT NULL,
  "authentication_results" text,
  "subject" text NOT NULL,
  "received_at" timestamp with time zone NOT NULL,
  "raw_body_hash" text NOT NULL,
  "movement_fingerprint" text,
  "processing_status" text NOT NULL DEFAULT 'pending_review',
  "movement_status" text NOT NULL DEFAULT 'unknown',
  "confidence_basis_points" integer NOT NULL DEFAULT 0,
  "parsed_payload" text NOT NULL,
  "account_id" text REFERENCES "accounts"("id") ON DELETE SET NULL,
  "transaction_id" text REFERENCES "transactions"("id") ON DELETE SET NULL,
  "processed_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "bank_email_messages_processing_status_check" CHECK (
    "processing_status" IN ('received', 'pending_review', 'ignored', 'imported', 'duplicate', 'failed')
  ),
  CONSTRAINT "bank_email_messages_movement_status_check" CHECK (
    "movement_status" IN ('posted', 'pending', 'rejected', 'reversed', 'unknown')
  ),
  CONSTRAINT "bank_email_messages_confidence_check" CHECK (
    "confidence_basis_points" BETWEEN 0 AND 10000
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS "bank_email_messages_connection_message_unique"
  ON "bank_email_messages" ("connection_id", "gmail_message_id");

CREATE UNIQUE INDEX IF NOT EXISTS "bank_email_messages_transaction_unique"
  ON "bank_email_messages" ("transaction_id") WHERE "transaction_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "bank_email_messages_review_queue_idx"
  ON "bank_email_messages" ("workspace_id", "processing_status", "received_at" DESC);

CREATE INDEX IF NOT EXISTS "bank_email_messages_fingerprint_idx"
  ON "bank_email_messages" ("workspace_id", "movement_fingerprint", "received_at" DESC)
  WHERE "movement_fingerprint" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "bank_email_sync_runs" (
  "id" text PRIMARY KEY NOT NULL,
  "workspace_id" text NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "connection_id" text NOT NULL REFERENCES "bank_email_connections"("id") ON DELETE CASCADE,
  "started_at" timestamp with time zone NOT NULL DEFAULT now(),
  "finished_at" timestamp with time zone,
  "status" text NOT NULL DEFAULT 'running',
  "messages_scanned" integer NOT NULL DEFAULT 0,
  "messages_stored" integer NOT NULL DEFAULT 0,
  "transactions_created" integer NOT NULL DEFAULT 0,
  "messages_pending_review" integer NOT NULL DEFAULT 0,
  "messages_ignored" integer NOT NULL DEFAULT 0,
  "messages_duplicate" integer NOT NULL DEFAULT 0,
  "error_message" text,
  CONSTRAINT "bank_email_sync_runs_status_check" CHECK ("status" IN ('running', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS "bank_email_sync_runs_connection_started_idx"
  ON "bank_email_sync_runs" ("connection_id", "started_at" DESC);
