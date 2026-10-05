BEGIN;
ALTER TABLE lb_billing.entries ADD COLUMN IF NOT EXISTS effective_on date;
UPDATE lb_billing.entries SET effective_on=(created_at AT TIME ZONE 'America/Sao_Paulo')::date WHERE effective_on IS NULL;
ALTER TABLE lb_billing.entries ALTER COLUMN effective_on SET DEFAULT ((now() AT TIME ZONE 'America/Sao_Paulo')::date);
ALTER TABLE lb_billing.subscriptions ADD COLUMN IF NOT EXISTS registered_on date;
UPDATE lb_billing.subscriptions s SET registered_on=(SELECT min(e.effective_on) FROM lb_billing.entries e WHERE e.subscription_id=s.id) WHERE registered_on IS NULL;
ALTER TABLE lb_billing.subscriptions ALTER COLUMN registered_on SET DEFAULT ((now() AT TIME ZONE 'America/Sao_Paulo')::date);
COMMIT;
