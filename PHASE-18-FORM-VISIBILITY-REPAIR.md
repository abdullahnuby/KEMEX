# Phase 18 — Form Visibility / Mobile Modal Repair

## Root cause
The shared `FormSection` component emitted only the new `ds-form-section*` class contract while a large portion of the existing modal/form CSS still relied on the legacy `form-section*` / `form-grid` contract. The mobile modal then had section headers with collapsed/unstable bodies on the deployed UI.

## Fix
- Bridge the class contracts in `FormSection.tsx` by emitting both canonical DS and legacy-compatible classes.
- Add an authoritative `phase18-form-visibility.css` layer loaded last.
- Force section bodies and their field controls to remain visible, sized by content, and scrollable within the modal body.
- Use a single-column form grid below 760px.
- Keep modal header and actions outside the scrolling body.
- Set mobile input controls to 48px minimum height and 15–16px readable text.
- Preserve RTL and existing route/business logic.

## Verification
- `npm run verify:source` — PASS
- CSS brace balance — PASS
- CSS parenthesis balance — PASS

## Runtime note
No browser runtime screenshot test was executed in this environment because the project dependencies/browser runtime were not installed. The fix is based on the supplied deployed screenshot and the current source DOM/CSS contracts.
