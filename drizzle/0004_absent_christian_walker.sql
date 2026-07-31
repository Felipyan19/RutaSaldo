CREATE TABLE "credit_card_details" (
	"account_id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"credit_limit" integer NOT NULL,
	"statement_day" integer NOT NULL,
	"payment_due_day" integer NOT NULL,
	"last_four_digits" text,
	"interest_rate_basis_points" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "credit_card_details" ADD CONSTRAINT "credit_card_details_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_card_details" ADD CONSTRAINT "credit_card_details_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;