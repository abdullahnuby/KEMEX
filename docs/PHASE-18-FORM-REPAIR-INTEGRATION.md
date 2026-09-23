# KEMEX Form Visibility Repair — Applied to Uploaded Repository

## Confirmed repository issue
The uploaded repository contained the earlier Phase 18 artifacts under `changed/`, but they were not active in the application source:
- `src/main.tsx` did not import `phase18-form-visibility.css`.
- `src/shared/ui/FormSection.tsx` still emitted only `ds-form-*` classes, while the existing modal stylesheet uses legacy `.form-section`, `.form-grid`, and `.field` selectors.

This meant the proposed repair was present as staged files but had not actually been integrated into the runtime source.

## Changes applied
1. Updated `src/shared/ui/FormSection.tsx` to emit compatible legacy + design-system classes for sections, headers, grids, and fields.
2. Added `src/styles/phase18-form-visibility.css` as the authoritative form layout/visibility layer.
3. Imported that stylesheet last in `src/main.tsx`, after Phase 17, so its rules participate in the cascade.

## Verification performed
- `node scripts/verify-source.mjs` — PASS (route parity 39/39).
- `node --test tests/frontend/source-integrity.test.mjs` — PASS (1/1).

## Not verified
No browser automation or actual iPhone Safari visual test was available in this run. No `npm run build`/TypeScript build was run because `node_modules` is absent in the uploaded project. Thus this repair is integrated and source-verified, but the final visual result still needs a deployed browser check.
