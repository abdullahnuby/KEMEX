# KEMEX v0.38.0 — Radical Frontend Overhaul

## Summary

A frontend-only visual and UX overhaul was applied while preserving the existing routing, repository/data contracts, role checks and operational workflows.

## Highlights

- Premium Arabic-first visual language.
- Top navbar retained; no sidebar introduced.
- Shared semantic component hooks for buttons, cards, metrics, page headers, tables, filters, status badges, empty states and modals.
- Improved responsive navigation and mobile surfaces.
- Improved typography using Tajawal + Cairo fallback.
- Reduced duplicated styling pressure by removing the historical `@layer components` block from `design-system.css`.
- Version synchronized to `0.38.0`.

## Verification

- 92 TS/TSX files parsed with zero syntax errors.
- CSS parser checks: zero errors across the frontend CSS entrypoints.
- Full `npm run build` remains environment-blocked because dependencies are not installed and registry DNS is unavailable in the execution sandbox.
