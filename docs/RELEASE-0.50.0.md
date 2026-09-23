# KEMEX v0.50.0 — Operational Audit & Workflow History

## Delivered

- Added repository-level `listApprovalEvents()` contract for both Supabase and local adapters.
- Added a user-scoped React Query stream for `approval_events`.
- Expanded the Audit screen with a dedicated **workflow history** view alongside the immutable audit log.
- Added database audit coverage for the schema-recovered operational tables:
  - `breakdown_events`
  - `downtime_tracking`
  - `maintenance_cost_items`
  - `maintenance_transports`
  - `trip_costs`
  - `trip_permits`
  - `trips`
- Added database-generated immutable workflow history for maintenance work-order status changes and transportation trip status changes using the existing `approval_events` table.
- Added an index for workflow investigation by module/status/time.
- Added `.github/workflows/kemex-ci.yml` using Node 24 with source verification, source tests, TypeScript checking and production build.

## Important boundary

The browser can read workflow history but cannot write it. `approval_events` remains server-generated and the existing database trigger/RLS boundary remains authoritative.

## Verification

The archive was validated structurally in the working environment. A full dependency-backed typecheck/build is intentionally not claimed here because the working archive does not contain `node_modules`.
