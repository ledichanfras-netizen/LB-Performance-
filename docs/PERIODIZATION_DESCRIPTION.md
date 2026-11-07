# Periodization description enhancement

`Aprimorar descrição` is available beside all three existing periodization description fields, following the existing AI access context. The manual field remains available without AI permission. No membership, plan or role permissions are expanded.

The authenticated `POST /api/improve-periodization-description` uses the same live AI permission and athlete ownership guards as workout generation. It accepts a bounded description plus selected modality, objective, period, weekdays and progression model. It whitelists those fields rather than forwarding athlete assessments, anamnesis, name or entire record. It does not write to the database or generate workouts.

The server requests a faithful Portuguese rewrite and up to six clarification questions. It explicitly prohibits invented restrictions, injuries, equipment, match dates, loads or prescription decisions, and asks the model to flag contradictions instead of silently resolving them. This is a model instruction, not a guarantee of semantic fidelity: the coach reviews and can edit the suggestion before applying it. No automatic prescription decision depends on this response.

The original remains in the main description until explicit acceptance. `Manter original` dismisses the suggestion; `Restaurar descrição original` restores the pre-acceptance text. Generation is a separate existing action, using whichever text the coach approved. Questions are displayed for clarification and are not silently appended to generation instructions.

Requests use the effective session, are aborted after 55 seconds, and discard stale responses if the planning context or input changes. Model requests have a 15-second per-model timeout and one attempt per configured fallback model. Truncated/malformed responses fail validation; errors leave the input untouched. The periodization drawer scrolls independently so a longer review cannot hide the workspace controls.

Validation uses synthetic data and mocked model responses: backend/client tests cover context bounds, whitelist, error and truncation handling; existing AI policy tests cover denied access. Browser checks cover preview/edit/apply, explicit generation, restoration, discard, failure preservation, stale results, permission visibility and phone/desktop layouts. No real athlete record is modified and no live model request is needed for verification.
