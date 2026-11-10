# Single workout completion screen

Active-session completion uses one body-level dialog titled `CONCLUIR E REGISTRAR TREINO`. Header, time adjustment, bottom shortcut and automatic last-exercise completion all open this same form. The duplicate inline form and the previous PSE verification form were removed.

The remaining form preserves progress/volume, execution date, editable duration, the 1–10 Borg CR10 choices with emojis on every button, intensity summary and optional feedback. It retains light/dark themes, a dynamic viewport layout, independent field scrolling, fixed actions, safe-area padding and dialog focus handling.

`FINALIZAR TREINO` saves directly. The optional secondary action is `CONCLUIR E POSTAR TREINO`; no visible completion label mentions Strava. Internal callback names remain compatible with existing callers. Posting continues only after the caller confirms the server save, and no external post is sent by this screen.

Incomplete-workout and resumed-duration notices are displayed in the form. A blank or invalid manually edited duration stays invalid rather than silently falling back to the stopwatch. Duration is prefilled on opening only. Save controls and closing are disabled during the request; a rejected acknowledgment keeps the same form, answers and retry controls. Confirmation closes the form; returning to the workout preserves the inputs.

Validation used the actual component in a browser with synthetic data and mocked save receipts: light/dark at 320×568, 390×844, 844×390 and 1280×900; one copy of each field; all ten emojis and PSE selection; scroll extremes and unobstructed actions; required PSE/duration; return/reopen; direct completion; failed save/retry; pending-request closing guard; optional posting after confirmation; automatic completion of the last exercise. TypeScript checks and the production build passed. No real workout or social post was created for verification.
