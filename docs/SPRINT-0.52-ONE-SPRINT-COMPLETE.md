# KEMEX v0.52.0 — Enterprise One-Sprint Completion

## Scope
This sprint addresses the ten outstanding enterprise-readiness items identified after v0.51.

1. **Production DB verification** — migration chain now extends to `024_enterprise_data_controls.sql`; verification tooling and a production runbook were added. Actual production execution still requires the target Supabase project credentials/CI environment and is never claimed as locally verified.
2. **RLS / action matrix** — canonical `private.can_action()` plus the UI `ACTION_PERMISSIONS` matrix. Sensitive workflow transitions remain DB-authoritative.
3. **Purchases / invoices data architecture** — strongly typed `purchase_orders` and `invoice_documents` projections with constraints, generated invoice totals, indexes and compatibility triggers from the existing JSONB records. This is a zero-downtime bridge toward full domain-table ownership.
4. **Bootstrap / performance** — generic module queries are route-scoped; only core reference modules load by default, while reports load the full analytical set.
5. **Design system** — canonical capability/config references are centralized; existing visual layers remain compatible while the next UI pass can remove legacy CSS files incrementally without a breaking rewrite.
6. **Automated tests** — enterprise sprint static coverage was added alongside migration/source/security tests.
7. **Notifications** — durable `notification_outbox` plus approval-event fan-out trigger. Delivery workers can consume the outbox without modifying business transactions.
8. **Attachments** — metadata lifecycle table, private object-storage bucket contract, upload/list/delete service and RLS policies.
9. **Observability** — `client_error_events`, `report_client_error()` RPC, React error-boundary capture and global error/unhandled-rejection capture with deduplication.
10. **Backup / release / rollback** — `backup_registry` and `release_registry` primitives plus operational runbooks and CI verification hooks.

## Verification

Expected local checks:
- `npm run verify:source`
- `npm run test:source`
- `npm run verify:migrations`
- `npm run test:security:static`
- `npm run test:enterprise-sprint`
- `npm run verify:production` (only with staging/production Supabase secrets)

The environment used to prepare this release did not contain a completed `node_modules` installation; therefore a production TypeScript/Vite build is **not** represented as passed in this document.

## Production gate

Before declaring production-ready, run the migrations against a disposable staging database, execute the DB/RLS tests against that database, perform a backup/restore drill, then promote the exact migration set to production.
