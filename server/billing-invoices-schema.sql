BEGIN;
CREATE TABLE IF NOT EXISTS lb_billing.invoices (
 id uuid PRIMARY KEY, subscription_id uuid NOT NULL REFERENCES lb_billing.subscriptions(id),
 plan_name text NOT NULL, amount_cents integer NOT NULL CHECK(amount_cents>=0),
 period_start date NOT NULL, period_end date NOT NULL CHECK(period_end>=period_start), due_on date NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','cancelled')),
 paid_on date, method text, note text, entry_id uuid UNIQUE REFERENCES lb_billing.entries(id),
 created_by text NOT NULL REFERENCES public.users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS billing_one_pending_invoice ON lb_billing.invoices(subscription_id) WHERE status='pending';
ALTER TABLE lb_billing.invoices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON lb_billing.invoices FROM PUBLIC,anon,authenticated;
COMMIT;
