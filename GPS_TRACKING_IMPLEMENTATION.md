# KEMEX — GPS Tracking implementation

## Included

- `029_live_gps_tracking.sql`
- `src/features/gpsTracking/types.ts`
- `src/features/gpsTracking/service.ts`
- `src/components/GpsTrackingMap.tsx`
- `src/pages/GpsTrackingPage.tsx`
- `supabase/functions/gps-ingest/index.ts`
- `supabase/functions/gps-ingest/README.md`
- `tests/db/gps-tracking.test.mjs`
- `tests/frontend/gps-tracking-contract.test.mjs`
- `apply-gps-tracking.mjs`

## What the module does

The module introduces a provider-neutral GPS device registry and append-only telemetry history. Operations roles can read live positions through a secured view and receive new position events via Supabase Realtime, while telemetry rows cannot be inserted or modified by authenticated application users.

The UI provides:

- live fleet map
- online / stale / offline health
- latest speed and timestamp
- driver / trip context when present
- last 24 hours path for a selected asset
- device registration for admin/fleet
- device activation/deactivation
- polling fallback every 30 seconds

The external ingestion endpoint is `/functions/v1/gps-ingest`. It is protected by a server-side secret and uses the registered external device identifier to resolve the KEMEX asset.

## Existing app changes applied by the script

- add `tracking` to the shared role/module matrix for `mgmt`, `fleet`, and `pm`
- add a `المراقبة` dropdown with `تتبع المركبات`
- add the `tracking` route and page
- add route registry metadata
- add GPS DB test to `test:db`
- add GPS contract test to `test:enterprise-sprint`
- allow migration `029` after the repository's existing historical production-only `028` gap

## Important production note

The repository currently does not contain the historical production migration `028` that was applied out-of-band earlier. The implementation therefore uses `029` for GPS and makes the migration verifier explicitly recognize that historical gap. Before using a fresh Supabase project from zero as the canonical source, reconcile that historical `028` migration into the repository.
