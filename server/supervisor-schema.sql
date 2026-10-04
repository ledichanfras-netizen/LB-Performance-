BEGIN;
CREATE TABLE IF NOT EXISTS lb_accounts.supervisor_links (
 supervisor_id text NOT NULL REFERENCES public.users(id),
 organization_id uuid NOT NULL REFERENCES lb_accounts.organizations(id),
 granted_by text NOT NULL REFERENCES public.users(id),
 granted_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(supervisor_id,organization_id)
);
CREATE TABLE IF NOT EXISTS lb_accounts.supervisor_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_id text NOT NULL REFERENCES public.users(id),
 supervisor_id text NOT NULL REFERENCES public.users(id),
 organization_id uuid NOT NULL REFERENCES lb_accounts.organizations(id),
 enabled boolean NOT NULL, changed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE lb_accounts.supervisor_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE lb_accounts.supervisor_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON lb_accounts.supervisor_links,lb_accounts.supervisor_audit FROM PUBLIC,anon,authenticated;
COMMIT;
