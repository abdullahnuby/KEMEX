# KEMEX — Phase 0 Print Fix + Phase 2 Operations Rollout

## Phase 0 — Printing

### Done
- Shared print engine is the only source that calls `window.print()`.
- Print header is explicitly LTR so KEMEX logo + company name sit on the LEFT and report title/number sit on the RIGHT.
- Print output is isolated from the KEMEX application shell.
- Tables use fixed layout, wrapping and repeated table headers to prevent horizontal clipping and row slicing.
- Wide datasets use landscape automatically from DataTable based on visible business columns.
- Signature blocks are rendered in a fixed print footer area and repeat on every physical page.
- The fixed print area prevents signatures from being pushed onto a trailing signatures-only page when the document body fits on one page.
- Footer/page-number area is reserved from the print page content area.
- Existing Reports and True Cost Report use the shared print engine.
- Record print documents remain available for contracts, invoices, purchases, maintenance work orders and transport trips.

### Needs browser validation
- Android Chrome may default its system print dialog to Letter; select A4 when testing the physical/PDF output.
- Confirm the selected PDF/print page shows the signature row at the bottom of the same page for one-page documents.
- Confirm long tables repeat headings and do not clip the right/left edge in both portrait and landscape.

## Phase 2 — Daily Operations & Tracking

### Done
- Operations Center: direct access to Dispatch Board added to operational quick actions.
- Trips: direct `لوحة الإرسال` action added to page header.
- Dispatch Board: each trip card now exposes the next commercial status action directly, while the card body remains a navigation target for details.
- GPS Tracking: added a landscape operational tracking report with vehicle, GPS health, latest reading, speed, ignition and coordinates.
- GPS device registration/activation remains capability-gated through the existing centralized permission matrix.
- Charging: added a printable monthly internal charging report with project/month context, usage, billing and cost variance, while preserving CSV export.
- Alerts: added severity filtering (`الكل`, `عالية`, `متوسطة`, `منخفضة`) and made the printed report follow the current filter.
- Existing trip execution workflow, geofencing, pickup/delivery receipts, signature capture, exceptions and driver execution history remain in place.
- Updated notification/operations contract test to use the canonical `src/app/routing/AppRoutes.tsx` after removal of the obsolete duplicated router.

### Needs review/test
- Validate Dispatch Board progression against real role permissions and server authorization in production.
- Validate GPS realtime updates, polling fallback and map rendering on mobile networks.
- Validate actual GPS device provider payloads against `/functions/v1/gps-ingest`.
- Validate monthly charging calculations against accounting rules and actual project charging rates.
- Validate alert thresholds and whether additional alert categories should be persisted rather than derived.

### Not done yet
- Server-side pagination/filtering for very large trip/GPS datasets.
- Route optimization and ETA engine.
- Historical GPS playback with date/time range picker in the UI.
- Geofence visualization on the tracking map.
- Per-trip live tracking view linked directly from Trip Detail to the selected GPS asset.
- Native/generated PDF file export independent of the browser print dialog.
- Full validation system unification for all create/edit forms.
- Full GENERIC_MODULES disposition.

## Verification

### Passed in this packaging environment
- `npm run verify:source`
- `npm run test:source`
- `npm run test:map`
- `npm run test:enterprise-sprint`
- `npm run test:notifications`

### Blocked by the packaging environment
- `npm run build`: dependency installation is incomplete in the packaging environment; React type definitions are missing from the local `node_modules` tree.
- `npm run test:gps`: the local `@electric-sql/pglite` package is incomplete/missing its entry file.
- `npm run verify:production`: the local `@supabase/supabase-js` package is incomplete/missing its entry file.

The project itself was not changed to hide or bypass these checks.
