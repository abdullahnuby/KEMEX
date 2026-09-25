# KEMEX — Printing rollout status

## Done in this rollout
- Shared print engine remains the single place that calls `window.print()`.
- `DataTable` now has a shared `طباعة` action by default and prints the full filtered/sorted dataset without pagination.
- Print orientation switches automatically to landscape for wide tables, with an explicit override available.
- Print output contains a reusable KEMEX document header, metadata, signatures, footer and page numbering.
- Action/selection columns are excluded automatically from table printouts.
- Existing Reports and True Cost Report use the shared print engine.
- Added one-click record documents for contracts, invoices, purchase requests/orders, maintenance work orders and transport-trip detail.
- Added operational summary print documents for Operations Center and Alerts.
- Removed legacy duplicate `pages/SettingsPage.tsx` and legacy `src/app/routes.tsx` from the project.
- No direct `window.print()` remains in page components; only the shared print engine calls it.

## Needs review/test after deployment
- Confirm Chrome Android print preview shows the report/document only, not the application shell.
- Confirm A4 portrait/landscape selection behaves correctly on desktop and mobile.
- Confirm long tables repeat the header row across pages in the target browser.
- Verify company logo and organization branding in the target production domain.
- Verify printing with empty/filtered datasets and very wide tables.
- Run the project's normal `npm ci` + `npm run build` in the deployment environment.

## Not done yet
- Native/generated PDF file export independent of the browser print dialog.
- Dedicated invoice PDF template with tax/legal footer and payment details beyond the current reusable invoice document.
- Dedicated signed receipt/delivery-note print template including the actual stored signature image.
- Dedicated assignment handover document.
- Dedicated GPS tracking map/report print layout.
- Full print templates for every detail/form workflow; the shared DataTable print is in place, while record-specific documents will continue to be added where the business document matters.
- Full validation-system unification across all forms.
- Final GENERIC_MODULES decision for every generic module.

## Verification limitation in this environment
The source was inspected and direct print call usage was checked. A full TypeScript/Vite production build was not completed here because dependency installation (`npm ci`) exceeded the execution transport timeout, so production build verification must still be performed in the deployment environment.
