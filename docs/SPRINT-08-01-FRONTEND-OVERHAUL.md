# Sprint 08-01 — Frontend Overhaul

## Scope
- Upgrade Arabic RTL typography and visual hierarchy.
- Premium navbar/dropdown navigation with group icons.
- Upgrade tables, cards, forms, buttons and modals.
- Rebuild the reports workspace into a report-selection + filters + result dashboard.
- Standardize asset/project references so names are primary and codes remain secondary.
- Remove isolated raw-code displays from operational dashboard/report surfaces.

## Verified in source
- Dashboard work-order asset cells use `ReferenceValue`.
- Report asset/project cells use readable reference cells with secondary codes.
- Rental report resolves contract asset IDs to readable asset names.
- Maintenance and planning selectors show name before code.
- Navbar groups have contextual icons.

## Deferred
- Full browser visual regression.
- TypeScript/build and production tests.
- Live Supabase/RLS integration tests.
