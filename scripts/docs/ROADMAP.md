# KEMEX Enterprise Roadmap

## Sprint 1 — Foundation & Design System
- Normalized foundation tables: clients, cost centers, asset categories/types, project memberships, asset documents, and cost ledger.
- Financial views for straight-line depreciation and 30-day cost aggregation.
- RLS and Data API grants for the new foundation tables.
- Shared UI primitives: PageHeader, CardGrid, DataTable, StatusBadge, DetailTabs, EmptyState, Skeleton, ConfirmModal, and Toast.
- Responsive DataTable: desktop grid + automatic mobile cards.
- No seed/demo records are introduced.

## Sprint 2 — Repository & Data Access
- Introduce explicit repository contracts and an empty LocalStorage implementation for offline/demo mode without seeded data.
- Keep Supabase as production source of truth.
- Introduce React Query for server cache, invalidation, and optimistic-safe mutations.
- Centralize validation and typed API mappers.

## Sprint 3 — Assets & Fleet
- Rebuild the assets workspace around the shared DataTable.
- Complete asset detail tabs, documents, assignments, operational history, fuel, maintenance, tires, costs, audit, and financial snapshot.
- Normalize driver/asset relationships and document expiry handling.

## Sprint 4 — Projects, Drivers & Clients
- Project Grid Cards and project details.
- Drivers/operators master data and license alerts.
- Client master data linked to projects and invoices.
- Project membership management.

## Sprint 5 — Maintenance & Inventory
- Work-order lifecycle, technician assignment, parts consumption, inventory movements, minimum-stock alerts, and purchase requests.
- Cost ledger integration for maintenance and tires.

## Sprint 6 — Finance & Costs
- Unified cost ledger across fuel, maintenance, tires, purchases, and depreciation.
- 30-day cost aggregation for assets/projects.
- Customer invoices, receivables, payment status, and audit trail.

## Sprint 7 — Alerts, Automation & Reporting
- Supabase Edge Function + scheduled execution for document expiry and maintenance alerts.
- Notification inbox and read state.
- Executive dashboard and report filters/charts.

## Sprint 8 — Security, QA & Release
- Project-scoped RLS enforcement after memberships are actively maintained.
- Security review, audit coverage, validation hardening, performance checks, responsive QA, and Vercel release verification.
