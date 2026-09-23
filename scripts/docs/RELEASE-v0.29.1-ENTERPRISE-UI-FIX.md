# KEMEX v0.29.1 — Enterprise UI Build Fix

## Purpose
This patch fixes the TypeScript/JSX compilation errors exposed by the Enterprise UI refactor build log.

## Fixed
- Merged duplicate JSX `className` attributes in breakdown flow/forms/details/wizard.
- Exported `CardGrid` from `src/components/ui` with support for both:
  - data-driven item cards (`items`, `getKey`, `renderCard`)
  - slot/grid cards (`cols`, `children`)
- Exported `useToast` and `ToastProvider` from the central UI barrel.
- Added the missing `StatusBadge` import in `AssetsPage`.
- Fixed `MetricCard` usage in `AuditPage` to pass Lucide icon components rather than rendered elements.
- Normalized `ModuleRecordsPage` delete handling with `Promise.resolve(...)` so both sync and async delete handlers are supported.
- Made `ReportsPage`'s `DataTable` generic explicit (`ReportCell[]`) to eliminate `unknown` row typing.
- Removed an accidental duplicate action-error banner in `ModuleRecordsPage`.

## Verification completed in the working tree
- `node scripts/verify-source.mjs` — PASS
- No raw `<table>` remains outside `src/components/ui/DataTable.tsx`.
- No duplicate JSX `className` attributes remain in `src/components` or `src/pages`.

## Environment limitation
A full `npm run build` could not be executed in the container because the dependency tree/toolchain was incomplete and `npm ci` timed out. Run the build in the normal project environment after a clean dependency install.
