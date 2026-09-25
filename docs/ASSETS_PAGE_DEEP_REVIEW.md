# KEMEX Assets Page — Deep Research Sprint 01

## UX decisions

- Keep the page task-oriented: identify an asset, understand current state, open its detail record, or edit it.
- Keep the table as the authoritative desktop view, while switching to compact cards on narrow screens to reduce horizontal scrolling and preserve touch usability.
- Keep summary KPIs limited to fleet-level operational signals that help the fleet manager decide where to look next.
- Add filters for lifecycle status, technical condition, ownership, and project because enterprise asset-management tools emphasize filtering long lists and tailoring visible columns/views.
- Keep asset name and code together as the primary identifier; do not lead with internal database IDs.

## Research references

Microsoft Dynamics 365 documents assets and work orders as central objects in Asset Management and supports structured asset data with related maintenance planning.
SAP Service and Asset Manager documents filtering object lists and configurable columns as a core workflow for long equipment/work-order lists.
Samsara's 2026 dashboard documentation separates Overview, Maintenance, Dispatch, Fuel & Energy, and Reports so the overview remains high level while specialized pages handle operational depth.
Fleetio emphasizes a single asset record for assignment history, meter readings, important dates, and total-cost data.

## KEMEX scope for this sprint

- No business schema changes.
- No fake/demo values added.
- No permission model changes.
- No global shell changes.
- Page-specific responsive styles only.
- Existing DataTable, repository, and asset detail route remain the source of truth.
