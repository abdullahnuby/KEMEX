# KEMEX Phase 18 — Form & Mobile Repair

## Scope

Repair the mobile form experience after the visual-stability work:

- restore a guaranteed scroll body inside form modals;
- keep modal header and actions outside the scrolling content;
- make mobile controls readable and touch-friendly;
- force form grids to one column on narrow screens;
- keep RTL structure unchanged;
- repair the signature modal so its fields, canvas, attachment, errors, and actions remain reachable.

## Changes

- `src/styles/phase17-visual-stability.css`: final authoritative modal/form layout and mobile control sizing.
- `src/shared/ui/FormModal.tsx`: explicit `modal-scroll-body` wrapper class.
- `src/pages/TripDetailPage.tsx`: signature modal content moved into the same scroll body.
- `scripts/verify-source.mjs`: verification markers for the mobile form repair.

## Mobile contract

- Modal width: viewport-safe with fixed maximum height.
- Modal height: up to 92dvh so content has real space to scroll.
- Form content: vertical scrolling with `min-height: 0` and `flex: 1 1 auto`.
- Inputs/selects: 16px font and 48px minimum height on mobile.
- Labels: 13.5px on mobile.
- Form grids: single column on mobile.
- Actions: full-width two-column layout, falling back to one column below 420px.

## Verification

- `node scripts/verify-source.mjs` — PASS
- `node --test tests/frontend/source-integrity.test.mjs` — PASS
- CSS brace/parenthesis balance — PASS

Runtime build/typecheck still requires the repository's Node 24+ dependency environment.
