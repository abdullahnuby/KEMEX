# KEMEX Sprint 1 — Data Protection Implementation

## Apply to the repository

1. Replace `scripts/backup/kemex-backup.mjs` with the bundled file.
2. Add `.github/workflows/backup.yml`.
3. Add `tests/enterprise/data-protection.test.mjs`.
4. Replace `scripts/verify-migrations.mjs` with the bundled version.
5. Add `test:data-protection` to `package.json`.
6. Keep `supabase/migrations/028_live_gps_tracking.sql` as the canonical GPS migration.
7. Migration 028 is now resolved; there is no migration-numbering gap to reconcile.

## GitHub Production Environment secrets

Create a public-repository Actions Environment named `production` and add:

- `KEMEX_SUPABASE_DB_URL`
- `KEMEX_STORAGE_S3_ENDPOINT`
- `KEMEX_STORAGE_S3_REGION`
- `KEMEX_STORAGE_S3_ACCESS_KEY_ID`
- `KEMEX_STORAGE_S3_SECRET_ACCESS_KEY`
- `KEMEX_B2_ENDPOINT`
- `KEMEX_B2_REGION`
- `KEMEX_B2_BUCKET`
- `KEMEX_B2_KEY_ID`
- `KEMEX_B2_APPLICATION_KEY`
- `KEMEX_BACKUP_AGE_RECIPIENT`

No secret belongs in the React application or repository.

## One-time B2 configuration

Create a private bucket, enable Object Lock, and use a scoped application key. The workflow applies Governance retention for 30 days to each object it uploads.

Recommended lifecycle rules:

- `daily/` 30 days
- `weekly/` 84 days
- `monthly/` 365 days
- `pre_release/` 730 days or company policy
- `manual/` 30 days unless explicitly retained

## What the backup contains

- PostgreSQL roles
- public schema
- public data
- `auth` schema/data capture
- `storage` metadata schema/data capture
- `supabase_migrations` schema/data
- all binaries in `kemex-attachments`
- repository migrations
- Supabase Edge Functions
- migration verifier
- manifest + SHA-256 checksums

The encrypted package is created locally on the GitHub runner, encrypted with `age`, then uploaded to B2. The runner never writes the private age identity into GitHub.

## Manual run

GitHub → Actions → `KEMEX Data Protection Backup` → Run workflow → choose `manual`.

A normal schedule runs daily at 02:00 UTC. Sunday scheduled runs also create the weekly copy; the first UTC day of a month also creates the monthly copy.

## Important production prerequisite

The workflow must be pointed at the real KEMEX production Supabase project. The currently connected Supabase MCP project seen during this implementation is not the KEMEX project, so no production SQL was executed remotely.

## Restore drill

Do this only in a disposable Supabase project:

1. Decrypt the latest `.tar.gz.age` with the offline age identity.
2. Validate `payload/checksums.sha256` before restore.
3. Restore database roles/schema/data and migration history using Supabase's documented backup/restore order.
4. Restore Auth and Storage managed-schema customizations separately.
5. Restore Storage binary files to `kemex-attachments`.
6. Deploy Edge Functions from the bundled source.
7. Verify login, RLS/roles, assets, drivers, projects, trips, driver execution, receipts, deliveries, notifications, GPS, attachments and reports.
8. Record measured RPO and RTO.

Do not blindly apply managed `auth`/`storage` SQL on an existing production project.
