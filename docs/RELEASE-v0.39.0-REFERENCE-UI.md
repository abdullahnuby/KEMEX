# KEMEX v0.39.0 — Reference UI Overhaul

## Visual target
The frontend was reworked against the supplied reference screenshots: slate application background, white flat surfaces, 1px borders, restrained teal primary action, compact Arabic typography, structured detail boxes, and top navigation without a desktop sidebar.

## Implemented
- Reworked global shell and top navbar.
- Reduced navigation clutter while keeping top navigation architecture.
- Rebuilt buttons, cards, metrics, tables, badges, forms, modals, empty states, and workspace tabs.
- Rebuilt project registry cards into the two-column reference layout with an inner dashed detail surface.
- Rebuilt asset detail overview into the reference detail surface with structured fields and compact financial summary.
- Added final CSS layer after legacy styles so old CSS does not visually override the new system.
- No data contracts, repositories, routes, or business calculations were intentionally changed.

## Verification
- Source integrity: run after implementation.
- Full TypeScript/build verification depends on complete local dependency installation; the current archive environment contains incomplete @types/react and @types/react-dom packages.
