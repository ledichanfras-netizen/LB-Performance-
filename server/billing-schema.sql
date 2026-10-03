-- Apply only in staging first, using a privileged server database role.
-- This schema must NOT be added to the Supabase exposed schemas.
BEGIN;
CREATE SCHEMA IF NOT EXISTS lb_billing;
REVOKE ALL ON SCHEMA lb_billing FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS lb_billing.plans (
 id uuid PRIMARY KEY, name text NOT NULL, audience text NOT NULL CHECK(audience IN ('coach','athlete')),
 price_cents integer NOT NULL CHECK(price_cents>=0), duration_days integer NOT NULL CHECK(duration_days BETWEEN 1 AND 366),
 grace_days integer NOT NULL DEFAULT 3 CHECK(grace_days BETWEEN 0 AND 30), athlete_limit integer CHECK(athlete_limit>0)
);
CREATE TABLE IF NOT EXISTS lb_billing.subscriptions (
 id uuid PRIMARY KEY, user_id text NOT NULL UNIQUE REFERENCES public.users(id), plan_id uuid NOT NULL REFERENCES lb_billing.plans(id),
 valid_until timestamptz, suspended boolean NOT NULL DEFAULT false,
 provider text, provider_subscription_id text UNIQUE
);
CREATE TABLE IF NOT EXISTS lb_billing.entries (
 id uuid PRIMARY KEY, request_id text NOT NULL UNIQUE, subscription_id uuid NOT NULL REFERENCES lb_billing.subscriptions(id),
 kind text NOT NULL CHECK(kind IN ('payment','grant')), amount_cents integer NOT NULL CHECK(amount_cents>=0),
 method text NOT NULL, reason text NOT NULL, recorded_by text NOT NULL REFERENCES public.users(id),
 valid_until timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 source text NOT NULL DEFAULT 'manual' CHECK(source IN ('manual','provider')), provider_payment_id text UNIQUE
);
ALTER TABLE lb_billing.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE lb_billing.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lb_billing.entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA lb_billing FROM PUBLIC, anon, authenticated;
COMMIT;
