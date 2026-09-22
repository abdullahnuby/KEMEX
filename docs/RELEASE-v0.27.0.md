# KEMEX v0.27.0 — Sprint 3: Assets & Fleet

## Scope

This release upgrades the core asset workflow around the existing v0.26 architecture.

### Delivered

- Independent React Query cache for asset detail data.
- Asset documents, financial summary, 30-day cost summary, cost ledger and asset audit queries.
- Asset detail tabs for identity, assignments, operations, fuel, maintenance, tires, costs, documents and audit.
- Straight-line depreciation and net book value are read from the database view `asset_financial_summary`.
- 30-day asset costs are read from `asset_costs_30d`.
- Asset documents derive their visible expiry state from the actual expiry date; no mock statuses are generated.
- Asset list adds type and technical condition columns plus filters.
- Asset detail edit action now returns to the asset editor for the exact selected asset.
- Mobile table rendering continues to use the shared responsive `DataTable` component.

## Data integrity

No seed records or demo assets were added. All asset detail values are retrieved from the active repository adapter. Supabase Production remains the default data mode.

## Required database foundation

The Supabase project contains migration `010_enterprise_foundation`, which defines:

- `asset_documents`
- `cost_entries`
- `asset_financial_summary`
- `asset_costs_30d`
- `project_costs_30d`

Migration `009_fix_audit_change_trigger` fixes the audit trigger for tables that do not contain a `payload` column.
