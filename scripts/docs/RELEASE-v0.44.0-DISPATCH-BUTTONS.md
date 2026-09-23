# KEMEX v0.44.0 — Dispatch Route & Button Layout Fix

## Fixed
- `trips/dispatch` no longer matches the trip-detail route (`trips/:id`).
- Dispatch now resolves to the trips board.
- Action buttons are forced into a single horizontal visual row so icons such as `+` never stack above/below the label.
- Shared button and page-action surfaces use `nowrap`, `flex-wrap: nowrap`, and centered alignment.

## Verification
- Source route matcher inspected.
- Shared button CSS inspected.
- Existing routes and business logic preserved.
