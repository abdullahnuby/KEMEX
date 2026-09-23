# KEMEX v0.30.3 — UX route cleanup

## Changes
- Removed the obsolete `asset` placeholder switch case. Asset details are handled by the explicit `asset/:id` route and should not be represented by a separate placeholder page.
- No data model, Supabase schema, RLS, or workflow changes.

## Follow-up UX consolidation
- Asset and project detail pages are currently separate purposeful detail experiences. Continue assessing consistency (header/actions/tabs) without collapsing their distinct domain data.
- Inventory and stock movements currently share the Inventory page workflow while also exposing a navigation entry for movements; inspect the destination/permission mapping before removing or redirecting it.
- Maintenance pages remain individually addressable. Consolidation should happen through contextual links and a shared maintenance workspace, not by combining unrelated forms into one mega-form.
- Dispatch is an alias for trips, not a dedicated dispatch board; do not label it as a distinct feature until implemented.

## Verification
- Source change is a dead-route cleanup only.
- Full TypeScript/build and browser-level navigation still require verification in an environment with dependencies installed.
