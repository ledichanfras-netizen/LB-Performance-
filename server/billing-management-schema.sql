BEGIN;
ALTER TABLE lb_billing.plans ADD COLUMN IF NOT EXISTS deliveries text NOT NULL DEFAULT '';
ALTER TABLE lb_billing.plans ADD COLUMN IF NOT EXISTS resources text NOT NULL DEFAULT '';
ALTER TABLE lb_billing.plans ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
ALTER TABLE lb_billing.entries ADD COLUMN IF NOT EXISTS voided_at timestamptz;
CREATE TABLE IF NOT EXISTS lb_billing.management_audit (
 id uuid PRIMARY KEY,entity_type text NOT NULL,entity_id uuid NOT NULL,action text NOT NULL,
 reason text NOT NULL,actor_id text NOT NULL REFERENCES public.users(id),before_data jsonb NOT NULL,after_data jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE lb_billing.management_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON lb_billing.management_audit FROM PUBLIC,anon,authenticated;
COMMIT;
