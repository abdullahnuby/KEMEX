# KEMEX Change Log — Enterprise Audit Continuation

## Database
- Added `supabase/migrations/019_domain_integrity_hardening.sql`.
- Preserved the existing `018_schema_recovery_breakdown_trips.sql` as the P0 recovery migration.

## Domain integrity
- Added explicit AssetStatus / AssetCondition / AssetOwnership / AssetMeterType TypeScript vocabulary while preserving existing database field names.
- Added database-side integrity checks for asset state, work-order costs and fuel amounts.

## Maintenance
- Completed preventive-maintenance plan lifecycle synchronization: completing a Work Order linked to a plan now advances `lastMeter`, `lastDate`, and records the last Work Order reference.
- Added MTTR and estimated MTBF operational KPIs to the maintenance workspace.

## Fuel
- Added proactive abnormal-consumption alerts using approved fuel transactions and the asset standard-consumption baseline.

## Frontend / build
- Added Vite vendor chunking for React, React Query, Supabase and icons.
- Restored the source-integrity gate script referenced by package scripts.
- Added `docs/INDEX.md` as the documentation entry point.

## Scope discipline
- No destructive database operations.
- No new business module.
- No data deletion.
- Existing short database-compatible TypeScript field names remain unchanged.
