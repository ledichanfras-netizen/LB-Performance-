# Readiness NUMERIC persistence

PostgreSQL stores `wellness.readiness_score` as NUMERIC. The pg driver returns this type as a string, while the API's sports validator expects numbers. The old `/ler` mapping forwarded that string unchanged; a later full-snapshot save then rejected a valid historical score as `Valor inválido em prontidão`, including when only a workout was edited or a new readiness entry was added.

The shared `normalizeReadinessScore` converts only finite, canonical decimal strings within 0–100. It runs on database read mapping, client cached-athlete normalization, and API validation for compatibility with already-open clients. Scores outside the allowed range, blanks, units, booleans, non-finite values and malformed strings remain invalid and are rejected. Nulls and absent scores are not converted by this helper. It neither recalculates scores nor changes subjective answers.

Both existing save paths preserve valid fractional scores instead of rounding historical values during a round trip. No schema migration, permission expansion, cache clearing or production-data rewrite is required. Snapshot completeness, row ownership, stale revision checks and transactional rollback remain in place.

Regression coverage uses synthetic data and a PostgreSQL-compatible local database: NUMERIC string serialization, loaded/cache/save normalization, coach snapshot validation with new readiness and edited/completed workouts, the actual student persistence transaction, decimal/zero preservation, invalid input rejection, stale writes and cross-athlete protection. All 173 tests, TypeScript checks and the production build passed. Real records were inspected only through aggregate/schema queries, never modified for verification.

After updating the app, previously unconfirmed actions must be saved again and confirmed by the server. This fix does not assert that an earlier failed action has already reached the database.

## Completed NUMERIC audit: performed loads and derived metrics

The follow-up audit found the same serialization issue in `performed_sets.weight`. Historical sets were returned as strings, so a later full snapshot failed on `carga` after passing readiness validation. The shared storage decoder now covers the database's decimal fields explicitly:

| Stored value | Application field | Boundary |
| --- | --- | --- |
| wellness.readiness_score | readinessScore | 0–100 |
| performed_sets.weight | performedSets[].weight | 0–2000 kg |
| workouts.total_load / monotony / strain | totalLoad / monotony / strain | non-negative safe numeric values |
| external_sessions.load | load | non-negative safe numeric values |

Database readers (full and paged history), cached workout normalization, incoming set validation and tonnage calculations share the bounded decoder. The existing readiness helper delegates to it. Integer fields and all existing validation ranges remain strict. Prescribed exercise weights and unilateral prescriptions are deliberately not decoded: values such as `70% 1RM`, `BW` and `12kg` retain their text and meaning.

Regression fixtures for workout history and execution now use NUMERIC columns for both actual weights and total loads, matching production rather than substituting REAL. The added tests cover simultaneous readiness/weight strings, decimal and zero values, cache recovery, edited/completed workout snapshots, correct tonnage, and idempotent execution retries after a lost response. Foreign scopes, stale snapshots and malformed data remain rejected. All 178 tests, TypeScript checks and the production build passed. No production rows were changed for testing.
