BEGIN;
ALTER TABLE lb_billing.subscriptions ADD COLUMN IF NOT EXISTS renewal_cancelled boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS lb_billing.audit_events (
 id uuid PRIMARY KEY, subscription_id uuid NOT NULL REFERENCES lb_billing.subscriptions(id),
 action text NOT NULL, reason text NOT NULL, actor_id text NOT NULL REFERENCES public.users(id),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS lb_accounts.athlete_archives (
 athlete_id text PRIMARY KEY REFERENCES public.athletes(id), organization_id uuid NOT NULL REFERENCES lb_accounts.organizations(id),
 archived_by text NOT NULL REFERENCES public.users(id), archived_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE lb_billing.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE lb_accounts.athlete_archives ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE lb_billing.audit_events,lb_accounts.athlete_archives FROM PUBLIC,anon,authenticated;

-- Existing users may reset their password through a verified organization invitation.
ALTER TABLE lb_accounts.invites ADD COLUMN IF NOT EXISTS target_user_id text REFERENCES public.users(id);

ALTER TABLE lb_accounts.invites ADD COLUMN IF NOT EXISTS revoked_at timestamptz;
DROP INDEX IF EXISTS lb_accounts.lb_invite_username;
CREATE UNIQUE INDEX lb_invite_username ON lb_accounts.invites(lower(username)) WHERE accepted_at IS NULL AND revoked_at IS NULL;
COMMIT;
