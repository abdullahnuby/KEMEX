# KEMEX — Enterprise Gap Register after v0.50

## Closed in this phase

- Schema recovery for the previously missing operational tables.
- Domain integrity hardening for assets, maintenance and fuel.
- Central workflow transition validation in the application.
- Database enforcement for transportation transitions.
- RBAC/audit hardening and append-only audit boundary.
- Operational audit trigger coverage for recovered tables.
- Immutable workflow history for maintenance and transportation.
- Audit UI visibility of workflow history.
- Repository CI workflow baseline.

## Still open from the original enterprise audit

### P0 / release blockers

1. **Real production CI verification** — workflow is now present, but it must run in GitHub against the real repository and pass with Node 24.
2. **Production database verification** — migrations 018–022 must be applied to the actual Supabase project and checked against the live schema/RLS, not only the repository.
3. **Reference integrity** — the historical `legacy/TFMS_Fixed.html` references still need either removal or restoration; the reference is a repository hygiene issue, not an active runtime dependency unless a remaining import/path requires it.

### P1

4. **Automated RLS matrix** — add role-by-role tests for read/write/delete/approval/export on every critical module.
5. **Action-level database authorization** — approval/rejection/PO/receive/payment actions should eventually use explicit trusted RPCs or narrowly scoped policies rather than generic module writes.
6. **Bootstrap coupling** — the application still loads many domains together. Move toward route/domain-level queries and avoid a product-wide initial data load.
7. **Generic CRUD debt** — specialized workflows are still mixed with generic module-record screens. Purchases/invoices and other operational domains need dedicated domain services and typed records instead of broad JSONB/EAV payloads.
8. **Design-system consolidation** — the global CSS layers remain duplicated/overlapping. A single token/component ownership model is still required.
9. **Hard-coded role checks** — remaining page-level checks should be migrated to the central capability matrix.
10. **Test pyramid** — add component tests, workflow transition tests, repository integration tests and browser E2E coverage. Source-integrity tests alone are insufficient.
11. **Accessibility** — centralize modal focus trap, escape handling, focus restoration, keyboard navigation and validation announcements.
12. **Performance** — reduce global bootstrap payload, split large operational pages and measure route-level bundle sizes and query latency.
13. **Notifications** — the notification schema exists, but the production notification generation/delivery pipeline and user-facing inbox still need completion.
14. **Attachments/documents** — attachment metadata/storage primitives exist, but a complete upload/download/permission/audit lifecycle needs verification.

### P2 / hardening

15. **Responsive QA** across complex tables/forms/detail pages.
16. **Observability** — structured client/server error telemetry, slow-query visibility and operational health checks.
17. **Backup/restore and retention runbook** for audit/workflow history.
18. **Data-quality constraints** for remaining JSONB fields and reference IDs.
19. **Financial controls** — stronger accounting invariants, period locking, reconciliation and payment/collection authorization.
20. **Release process** — versioned migrations, rollback strategy, staging smoke tests and release checklist.

## Recommended order from here

1. Apply and verify migrations 018–022 on staging/production.
2. Build the RLS/action authorization test matrix.
3. Replace generic purchase/invoice mutation paths with trusted domain actions.
4. Decouple bootstrap data loading.
5. Consolidate the CSS/design-system layers.
6. Add component + E2E tests.
7. Finish notifications/attachments/observability and release operations.
