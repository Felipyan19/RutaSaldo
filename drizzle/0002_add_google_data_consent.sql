ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_data_consent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_data_consent_version" text;
