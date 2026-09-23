# Phase 17 — Visual Stability / Navbar Repair

## Scope

This patch addresses the live visual regressions observed after Phases 11–16:

- Navbar clipping at the left edge.
- Desktop navigation overflow creating unstable layout behavior.
- Conflicting historical CSS layers overriding the canonical design system.
- Cairo/Tajawal overrides producing inconsistent Arabic typography.
- Oversaturated multi-color metric/chart accents.
- Small text across operational surfaces reducing readability.

## Changes

- Added `src/styles/phase17-visual-stability.css` as the final presentation layer.
- Loaded it after Phase 12 so it becomes the final cascade for shared shell visuals.
- Rebuilt the desktop navbar as a bounded flex shell with shrink-safe children.
- Kept desktop dropdowns outside overflow clipping contexts.
- Reduced desktop brand width and hid low-priority navbar actions below constrained widths.
- Standardized application typography on IBM Plex Sans Arabic with system fallbacks.
- Increased readable sizes for page titles, table cells, labels, metrics and chart labels.
- Simplified the visual palette to a restrained teal + neutral system with muted semantic accents.
- Adjusted dashboard chart palette directly in `AnalyticsCharts.tsx`.
- No route, permission, data, backend, or business workflow changes.
