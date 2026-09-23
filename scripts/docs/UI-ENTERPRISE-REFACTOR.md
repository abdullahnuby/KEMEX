# KEMEX Enterprise UI Refactor

## Scope
Unified the React + TypeScript + Tailwind UI around a single Arabic-first RTL enterprise design language.

## Global theme
- Cairo with Tajawal/system fallbacks.
- `slate-50` application background and white card surfaces.
- Dark Teal primary scale (`primary-50..950`).
- Semantic status tones: emerald, amber, red, blue, gray.
- Base body text uses `text-base`; compact metadata stays at `text-sm` minimum.
- Headings use `font-bold`, table headers use `font-semibold`, data uses `font-medium`.

## Shared UI primitives
Canonical implementation location: `src/components/ui`.

- `Button` / `IconButton`
- `Card` / `StatCard`
- `PageHeader`
- `DataTable`
- `StatusBadge`
- `FilterBar`
- `EmptyState`
- `MetricCard`

Legacy imports from `src/shared/ui` re-export the canonical components for backward compatibility.

## DataTable behavior
- Search.
- Client-side sorting.
- Optional filters.
- Pagination.
- Desktop table with comfortable `px-6 py-4` cells.
- Mobile card presentation below the medium breakpoint.
- Explicit empty state support.
- No mock rows are created by the component.

## Refactored surfaces
Dashboard, Assets, Projects, Drivers, Customers/Clients, Maintenance, Reports, Settings, Alerts, Fuel, Inventory, Invoices, Purchases, Plans, Oils, Tires, Audit, Breakdowns, Asset Detail and Project Detail now consume the shared primitives where the corresponding UI pattern exists.

## Verification
- Source integrity verifier: PASS.
- Static TypeScript/TSX syntax review: 84/84 files passed parsing.
- Raw HTML tables outside `DataTable`: none found.
- Production data remains Supabase-backed; no mock transaction records were introduced.

## Environment note
The execution environment did not contain a complete dependency installation. `npm ci` could not finish because external package retrieval timed out, so `npm run typecheck`/`npm run build` could not be completed here. GitHub/Vercel should run a clean install from `package-lock.json` before release.
