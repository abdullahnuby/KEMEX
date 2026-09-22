# KEMEX v0.44.0 Engineering Prompt — Route Integrity + Action Button Layout

Act as a senior frontend engineer on the existing KEMEX codebase. Fix the two observed regressions without changing business logic, database contracts, permissions, or the single top-navbar architecture.

1. Route integrity: ensure `trips/dispatch` is handled by `TripsPage`/dispatch board and must never match `TripDetailPage` as if `dispatch` were a trip ID. Keep `trips/:id` working for real IDs. Add a regression-safe route matcher or explicit dispatch check.

2. Button layout integrity: every primary/secondary/workflow/UI button must render icon + label in one horizontal row. Prevent text/icon wrapping, vertical stacking, flex wrapping, and accidental narrow action containers. Preserve RTL visual order and responsive behavior. Prefer canonical Button `icon` props for new code, but do not break existing button children.

3. Page-header actions: action groups must remain compact and aligned on one row on desktop; mobile may wrap as a group but individual buttons must never wrap internally.

4. Verify all existing routes, especially `trips`, `trips/dispatch`, and `trips/<id>`.

5. Run static/TypeScript validation where dependencies permit, and report exact limitations rather than claiming a full production build without executing it.
