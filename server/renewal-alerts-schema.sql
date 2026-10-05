BEGIN;
CREATE TABLE IF NOT EXISTS lb_billing.renewal_requests (
 id uuid PRIMARY KEY,subscription_id uuid NOT NULL REFERENCES lb_billing.subscriptions(id),
 user_id text NOT NULL REFERENCES public.users(id),message text NOT NULL,
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','contacted','closed')),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS renewal_open_request ON lb_billing.renewal_requests(subscription_id,user_id) WHERE status IN ('open','contacted');
ALTER TABLE lb_billing.renewal_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON lb_billing.renewal_requests FROM PUBLIC,anon,authenticated;
COMMIT;
