# KEMEX Phase 0 — Printing Status

- Shared `PrintableDocument` shell with company header, document metadata, signatures, footer and print-only isolation.
- `ReportsPage` uses `PrintButton` + `PrintableDocument`.
- `TrueCostReportPage` now uses the same shared print system; the legacy direct `window.print()` button has been removed.
- `window.print()` remains only inside the shared `printDocument()` service, where it is the actual browser print invocation.
- True Cost report print layout is A4 landscape and includes all sorted rows, KPIs, date filters, signatures, and footer.
- A true programmatic PDF file export is still a separate task if required beyond browser Print -> Save as PDF.
