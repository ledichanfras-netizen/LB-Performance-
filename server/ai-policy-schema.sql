BEGIN;
ALTER TABLE lb_accounts.memberships ADD COLUMN IF NOT EXISTS ai_enabled boolean NOT NULL DEFAULT false;
COMMIT;
