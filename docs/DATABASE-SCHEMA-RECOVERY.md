# KEMEX — Database Schema Recovery & Integrity

## Current status

- `018_schema_recovery_breakdown_trips.sql` reconstructs the seven production-critical tables that were missing from tracked migration history.
- `019_domain_integrity_hardening.sql` adds forward-looking integrity constraints and indexes for assets, work orders and fuel without rewriting existing rows.
- Production parity is **not yet certified** because the repository still does not contain a complete production schema dump.

## Recovered objects

- `breakdown_events`
- `downtime_tracking`
- `maintenance_cost_items`
- `maintenance_transports`
- `trips`
- `trip_costs`
- `trip_permits`

## Integrity hardening

Migration 019 adds:

- Asset status vocabulary checks.
- Asset technical-condition vocabulary checks.
- Non-negative work-order cost / downtime checks.
- Non-negative fuel quantity / price / total checks.
- Indexes for asset status, work-order plan lifecycle and fuel history.

The checks are `NOT VALID` so existing production rows are not blocked during adoption. New or updated rows must satisfy the rules.

## Maintenance lifecycle fix

The application now advances a preventive-maintenance plan automatically when a linked work order reaches `مكتمل`:

- `lastMeter` is advanced to the current asset meter without moving backwards.
- `lastDate` is advanced to the completion date without moving backwards.
- `lastWorkOrderId` and `lastCompletedAt` are recorded for traceability.

## Validation sequence

1. Apply migrations 001–019 to a fresh Supabase environment.
2. Compare `information_schema` and `pg_catalog` against Production.
3. Reconcile any production-only objects before declaring parity.
4. Run RLS tests.
5. Run application typecheck/build under the project's required Node 24+ environment.
6. Smoke-test Breakdown, Trips, Maintenance Plans and Fuel Alerts.

## Important limitation

`018` is a recovery migration, not a byte-for-byte production snapshot. Any production-only columns, constraints, triggers, functions, views, indexes or policies still require an explicit schema diff before production parity can be certified.
