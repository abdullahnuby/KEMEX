# KEMEX v0.37.0 — Build Fix & Workflow Completion

## Build fixes
- Corrected inventory movement callback typing between `App.tsx`, `WorkspacesPage.tsx`, and `InventoryPage.tsx`.
- Added `canWriteModule` to the application navigation permissions helper.
- Corrected `Layout.tsx` optional section access for the discriminated `MODULES` union.
- Restored missing `TripFuelLog` / `TripFuelLogInsert` imports.
- Corrected `ProjectDetailPage.tsx` reference matching and trip fuel linkage.
- Added `Users` icon import to reports.
- Switched Users page dialogs to the shared `FormModal`.
- Added `tripId` to `FuelOperation` mapping so transport fuel remains linked.

## Workflow completion
- Breakdown detail can create and link a maintenance work order directly.
- The generated order starts in the existing approval workflow (`بانتظار الاعتماد`).
- User first-login password-change flow remains enforced through `profiles.must_change_password`.

## Verification
- Source parse: 92 TS/TSX files, zero syntax errors.
- `scripts/verify-source.mjs`: OK.
- Full `npm run build` could not be executed in the sandbox because npm dependencies are not available locally and registry access is unavailable.
