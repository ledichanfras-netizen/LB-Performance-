# Readiness NUMERIC persistence

PostgreSQL stores `wellness.readiness_score` as NUMERIC. The pg driver returns this type as a string, while the API's sports validator expects numbers. The old `/ler` mapping forwarded that string unchanged; a later full-snapshot save then rejected a valid historical score as `Valor inválido em prontidão`, including when only a workout was edited or a new readiness entry was added.

The shared `normalizeReadinessScore` converts only finite, canonical decimal strings within 0–100. It runs on database read mapping, client cached-athlete normalization, and API validation for compatibility with already-open clients. Scores outside the allowed range, blanks, units, booleans, non-finite values and malformed strings remain invalid and are rejected. Nulls and absent scores are not converted by this helper. It neither recalculates scores nor changes subjective answers.

Both existing save paths preserve valid fractional scores instead of rounding historical values during a round trip. No schema migration, permission expansion, cache clearing or production-data rewrite is required. Snapshot completeness, row ownership, stale revision checks and transactional rollback remain in place.

Regression coverage uses synthetic data and a PostgreSQL-compatible local database: NUMERIC string serialization, loaded/cache/save normalization, coach snapshot validation with new readiness and edited/completed workouts, the actual student persistence transaction, decimal/zero preservation, invalid input rejection, stale writes and cross-athlete protection. All 173 tests, TypeScript checks and the production build passed. Real records were inspected only through aggregate/schema queries, never modified for verification.

After updating the app, previously unconfirmed actions must be saved again and confirmed by the server. This fix does not assert that an earlier failed action has already reached the database.
