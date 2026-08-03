CREATE TABLE IF NOT EXISTS "account_payment_instruments" (
  "id" text PRIMARY KEY NOT NULL,
  "workspace_id" text NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "account_id" text NOT NULL REFERENCES "accounts"("id") ON DELETE CASCADE,
  "instrument_type" text NOT NULL,
  "brand" text,
  "label" text,
  "last_four_digits" text NOT NULL,
  "is_primary" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "account_payment_instruments_type_check" CHECK ("instrument_type" IN ('debit_card','credit_card','virtual_card','digital_card','other')),
  CONSTRAINT "account_payment_instruments_last_four_check" CHECK ("last_four_digits" ~ '^[0-9]{4}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS "account_payment_instruments_account_last4_unique"
  ON "account_payment_instruments" ("account_id", "last_four_digits");

CREATE INDEX IF NOT EXISTS "account_payment_instruments_workspace_last4_idx"
  ON "account_payment_instruments" ("workspace_id", "last_four_digits");

INSERT INTO "account_payment_instruments" (
  "id", "workspace_id", "account_id", "instrument_type", "label", "last_four_digits", "is_primary"
)
SELECT
  'credit-' || ccd."account_id",
  ccd."workspace_id",
  ccd."account_id",
  'credit_card',
  a."name",
  ccd."last_four_digits",
  true
FROM "credit_card_details" ccd
JOIN "accounts" a ON a."id" = ccd."account_id"
WHERE ccd."last_four_digits" IS NOT NULL
ON CONFLICT ("account_id", "last_four_digits") DO NOTHING;

CREATE OR REPLACE FUNCTION associate_bank_email_account()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  matched_account_id text;
BEGIN
  IF NEW.account_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT api.account_id
  INTO matched_account_id
  FROM account_payment_instruments api
  JOIN accounts a ON a.id = api.account_id AND a.workspace_id = api.workspace_id
  WHERE api.workspace_id = NEW.workspace_id
    AND api.last_four_digits = NEW.parsed_payload::jsonb ->> 'accountLastFour'
    AND (
      lower(a.institution) = lower(NEW.parsed_payload::jsonb ->> 'institution')
      OR (NEW.parsed_payload::jsonb ->> 'institution' = 'rappicard' AND lower(a.institution) IN ('rappipay', 'davivienda s.a.'))
    )
  LIMIT 1;

  NEW.account_id := matched_account_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "bank_email_messages_associate_account" ON "bank_email_messages";
CREATE TRIGGER "bank_email_messages_associate_account"
BEFORE INSERT OR UPDATE OF "parsed_payload", "account_id"
ON "bank_email_messages"
FOR EACH ROW
EXECUTE FUNCTION associate_bank_email_account();

UPDATE "bank_email_messages"
SET "account_id" = NULL
WHERE "account_id" IS NULL;
