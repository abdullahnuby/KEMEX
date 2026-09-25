KEMEX - Deep Fix: duplicate report printing + Phase 2 continuation

Root cause of duplicate report preview:
ReportsPage and TrueCostReportPage render a custom PrintableDocument, while DataTable also rendered its own generic printable layer by default. The prior files-only package did not include DataTable.tsx, so the old generic print layer remained active in the deployed project. The result was two print documents in the same preview.

Fix:
- Disable DataTable's generic print layer in ReportsPage and TrueCostReportPage.
- Harden PrintableDocument so only the selected print layer can be printed.
- Improve print table sizing/wrapping and repeated table headers.
- Keep document identity separate from the application identity.
- Continue Phase 2 GPS work: historical range, playback, trip context, geofences, map fit, and direct trip-to-tracking navigation.

Overlay these files preserving paths.
