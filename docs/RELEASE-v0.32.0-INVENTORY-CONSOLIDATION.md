# KEMEX v0.32.0 — Inventory workspace consolidation

## Changes
- Removed the separate “حركات المخزون” entry from primary navigation because stock movements are already available from the inventory workspace.
- Redirected the legacy `#/movements` route to `#/inventory` while rendering the inventory workspace, preserving old bookmarks.
- Kept stock movement creation and listing capabilities wired through the existing inventory props and repository operations; no database schema or RLS changes were made.
- Updated package version to 0.32.0.

## Validation
- Source-level route and navigation inspection only. A full dependency install, typecheck, production build, and browser workflow test are still required before release.
