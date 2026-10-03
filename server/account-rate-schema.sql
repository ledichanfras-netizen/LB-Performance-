BEGIN;
CREATE TABLE IF NOT EXISTS lb_accounts.rate_limits (
 key text PRIMARY KEY, bucket bigint NOT NULL, attempts integer NOT NULL CHECK(attempts>0)
);
ALTER TABLE lb_accounts.rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE lb_accounts.rate_limits FROM PUBLIC,anon,authenticated;
COMMIT;
