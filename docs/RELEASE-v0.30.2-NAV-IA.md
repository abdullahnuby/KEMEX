# KEMEX v0.30.2 — Navigation information architecture

## Changes
- Reorganized the main navigation into focused work areas: Home, Operations & Transport, Master Data, Maintenance, Inventory & Purchasing, Finance, Reports & Administration.
- Moved fuel into Operations & Transport because it is an operational workflow.
- Grouped breakdowns, work orders, preventive plans, oils/filters and tires under Maintenance.
- Grouped inventory, stock movements and purchasing under Inventory & Purchasing.
- Updated user-facing labels to distinguish the reports center and stock master data from stock transactions.
- Bumped application/package version to 0.30.2.

## Scope and safety
- Navigation only: no database schema, Supabase policies, data records, business workflows, or role membership changed.
- Existing module keys and route targets are preserved.
- This is a structural navigation pass, not a claim that every module is fully implemented or end-to-end tested.

## Verification
- Static source syntax should be checked after this change.
- Production build and live role-by-role navigation remain to be verified.
