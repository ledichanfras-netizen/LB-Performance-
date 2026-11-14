BEGIN;
ALTER TABLE lb_billing.plans ADD COLUMN IF NOT EXISTS calendar_months integer CHECK(calendar_months IN (1,3,6,12));
ALTER TABLE lb_billing.plans ADD COLUMN IF NOT EXISTS by_periodization boolean NOT NULL DEFAULT false;
ALTER TABLE lb_billing.subscriptions ADD COLUMN IF NOT EXISTS payment_required boolean;
ALTER TABLE lb_billing.subscriptions ADD COLUMN IF NOT EXISTS complimentary_until date;
ALTER TABLE lb_billing.subscriptions ADD COLUMN IF NOT EXISTS access_start date;
ALTER TABLE lb_billing.invoices ADD COLUMN IF NOT EXISTS request_id text UNIQUE;
ALTER TABLE lb_billing.invoices ADD COLUMN IF NOT EXISTS request_hash text;
COMMIT;
