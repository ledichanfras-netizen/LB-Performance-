# Anamnesis persistence and local recovery

Anamnesis history is stored in the existing athlete `injury_history` JSON envelope alongside other athlete metadata. No schema change or direct production-record migration is needed. `/api/salvar` validates record IDs, dates and athlete ownership, then persists the history inside the existing scoped, revision-checked transaction. The read response includes anamnesis only when the envelope contains that field.

Omitted history from an older client preserves the stored array under the existing athlete row lock. Explicit `[]` remains an intentional empty history. Legacy database absence must not be converted to an empty array: the client merges retain tablet-only history when the remote property is absent, while explicit remote arrays remain authoritative.

The modal awaits the server save receipt and displays success only afterward. Failures retain the form/local athlete cache. Retries of an unconfirmed form use the same record ID. The history tab offers `Salvar histórico no banco` to submit a legacy local history through the normal authenticated save path. The button does not recreate answers or recover cache which has already been erased. Recovery still requires using the original device/browser where a local copy may exist.

Validation used synthetic data: 24 focused tests including PostgreSQL-compatible storage round-trip, omitted-history preservation, invalid/cross-athlete rejection and cache merge behavior. Chromium checks verified rejected saves, stable retry IDs, acknowledgment-driven success, history confirmation and resetting the confirmation label on a new form. Type checks and the production build passed. No real athlete's answers were created or altered during verification.
