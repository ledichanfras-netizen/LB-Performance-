# Supabase public trust anchor

`supabase-prod-ca-2021.pem` contains the public Supabase Root 2021 CA, not a private key.

- Provider download: https://supabase.com/prod-ca-2021.crt
- Provider documentation: https://supabase.com/docs/guides/platform/ssl-enforcement
- SHA-256: `807025ad50d4ed219d2c9c7d299c004f824eb00cf7f65afef607d07b72e6cafa`
- Valid until 2031-04-26. Certificate fingerprint and validity are checked before use.

Only Supabase database/pooler hostnames use this additional CA. All remote connections verify both certificate chain and hostname. `DATABASE_SSL_CA` overrides this bundle for provider rotations or other databases. System trust roots remain available. Never disable verification to handle a rotation.
