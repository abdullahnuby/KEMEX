# KEMEX Production Runbook — v0.52

## Release order
1. Confirm clean Git commit and CI green.
2. Capture a provider backup / restore point and register it in `backup_registry`.
3. Apply migrations 001–024 to staging.
4. Run smoke tests for login, RBAC, assets, maintenance, trips, purchases, invoices, inventory and reports.
5. Verify RLS with every production role.
6. Register the staging release in `release_registry`.
7. Promote the exact same migration/artifact to production.
8. Run post-release smoke tests.
9. Register production deployment.

## Rollback
- Do not delete applied migrations.
- Roll back application code to the last known-good artifact.
- Restore the database only when a data correction is required and after incident approval.
- Record the restore point and resulting release in `backup_registry` and `release_registry`.

## Backup verification
A backup is not considered verified until a restore has been executed in an isolated environment and core relational counts plus login/RLS smoke tests pass.
