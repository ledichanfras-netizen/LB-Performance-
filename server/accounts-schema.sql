-- Staging only. Do not expose lb_accounts in the Supabase Data API.
BEGIN;
CREATE SCHEMA IF NOT EXISTS lb_accounts;
REVOKE ALL ON SCHEMA lb_accounts FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS lb_accounts.organizations (
 id uuid PRIMARY KEY, name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS lb_accounts.memberships (
 user_id text PRIMARY KEY REFERENCES public.users(id), organization_id uuid NOT NULL REFERENCES lb_accounts.organizations(id),
 platform_admin boolean NOT NULL DEFAULT false, active boolean NOT NULL DEFAULT true, session_version integer NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS lb_accounts.athlete_scopes (
 athlete_id text PRIMARY KEY REFERENCES public.athletes(id), organization_id uuid NOT NULL REFERENCES lb_accounts.organizations(id)
);
CREATE TABLE IF NOT EXISTS lb_accounts.invites (
 id uuid PRIMARY KEY, token_hash text UNIQUE NOT NULL, organization_id uuid NOT NULL REFERENCES lb_accounts.organizations(id),
 username text NOT NULL, role text NOT NULL CHECK(role IN ('coach','athlete')), athlete_id text REFERENCES public.athletes(id),
 created_by text NOT NULL REFERENCES public.users(id), expires_at timestamptz NOT NULL, accepted_at timestamptz,
 CHECK((role='athlete' AND athlete_id IS NOT NULL) OR (role='coach' AND athlete_id IS NULL))
);
ALTER TABLE lb_accounts.memberships ADD COLUMN IF NOT EXISTS ai_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE lb_accounts.invites ADD COLUMN IF NOT EXISTS revoked_at timestamptz;
ALTER TABLE lb_accounts.invites ADD COLUMN IF NOT EXISTS target_user_id text REFERENCES public.users(id);
CREATE UNIQUE INDEX IF NOT EXISTS lb_invite_username ON lb_accounts.invites(lower(username)) WHERE accepted_at IS NULL AND revoked_at IS NULL;
ALTER TABLE lb_accounts.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lb_accounts.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE lb_accounts.athlete_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lb_accounts.invites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA lb_accounts FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS lb_accounts.athlete_archives (athlete_id text PRIMARY KEY REFERENCES public.athletes(id),organization_id uuid NOT NULL REFERENCES lb_accounts.organizations(id),archived_by text NOT NULL REFERENCES public.users(id),archived_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE lb_accounts.athlete_archives ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE lb_accounts.athlete_archives FROM PUBLIC,anon,authenticated;
COMMIT;
