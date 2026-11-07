# Standard report pages

`ReportSheet` owns the A4 canvas used by assessment reports, the dynamic report engine and anamnesis. Screen pages are 794 × 1123 CSS pixels; printing uses 210 × 297 mm, with 20 mm margins. The existing full-width report headers retain their negative margin treatment.

Headers and footers reserve their own space. Only the measured body scales down when its content exceeds the available width or height. ResizeObserver, font readiness and beforeprint refresh the fit. Measurements use layout sizes rather than transformed preview bounds, so mobile zoom cannot change the exported sheet dimensions. Very extensive content can reduce text size; split large sections into separate pages when authoring templates.

All report JPEG buttons call `toReportJpeg`, which waits for fonts and images, refreshes the fit and captures at 2382 × 3369 pixels. Dashboard screenshots and other non-report images retain their original behavior.

Validation: eight targeted tests; TypeScript checks; production build. Chromium checks exercised both IMTP pages, long observations, a four-page dynamic report including its index, and anamnesis at desktop and mobile preview widths. Every sheet measured 794 × 1123, body bounds fit the reserved area and footers fit the sheet. A real JPEG capture measured 2382 × 3369. An IMTP browser PDF contained exactly two equally sized A4 pages, with text present on both; the rendered second page was visually inspected. Fixtures used synthetic athlete data and did not access production records.
