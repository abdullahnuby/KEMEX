# KEMEX Frontend Deep Audit & Overhaul — v0.38.0

## 1. Executive diagnosis

The existing frontend already had strong functional foundations, but the visual system had drifted through multiple iterative UI passes. The main problem was not missing components; it was **competing UI systems** being applied at the same time.

### Primary root causes

1. `src/components/ui` is the canonical shared layer, while `src/shared/ui` still contains legacy wrappers/styles. Some screens consume one layer and some consume the other.
2. `src/styles/global.css` is a long cumulative override file containing several historical “polish” passes. The same selectors (`.panel`, `.page-head`, `.metric-card`, `.table-wrap`, `.modal-card`, etc.) are restyled multiple times.
3. `src/shared/ui/design-system.css` contained a second Tailwind `@layer components` block with `@apply` rules that duplicated patterns already present elsewhere. This was also the direct location of the reported CSS build failure around line 70.
4. Typography was technically Arabic-first, but many navigation/meta labels were too small to feel like a premium enterprise application. Several previous passes reduced sizes to 8–11px ranges.
5. Shared components were visually generic even where the data and workflows were specialized. The same white/gray card language was repeated without strong information hierarchy.
6. Modals/forms had the correct building blocks but inconsistent implementation: some use `FormModal`, while others directly create `.modal-backdrop` + `.modal-card` structures.
7. DataTable behavior was good (search, sort, filter, pagination, mobile cards), but its visual hierarchy was too flat and its actions did not feel like a cohesive enterprise data surface.
8. Workspace tabs were useful, but looked detached from the main navigation language.
9. The top navigation architecture was already correct (navbar + dropdown groups), but its typography, spacing and density made it feel crowded. The redesign therefore keeps a top navbar and **does not introduce a sidebar**.
10. Several complex screens such as Transport, Breakdown Detail, New Breakdown Wizard and Inventory combine shared primitives with raw Tailwind utility styling; the refresh therefore uses a global semantic visual layer plus component hooks rather than rewriting business logic.

## 2. Screen-by-screen visual audit matrix

| Surface | Current issue pattern | Overhaul direction | Status |
|---|---|---|---|
| Login | Small text, generic centered card | Premium branded auth surface, stronger hierarchy | Implemented |
| Change Password | Same legacy auth surface | Same visual family + clear security hierarchy | Implemented |
| Dashboard | Dense KPI row, mixed card styles | Strong KPI rhythm, clearer panels, less visual noise | Implemented |
| Assets | Good data model, modal-heavy form | More readable tables/cards/forms, stronger reference hierarchy | Implemented |
| Asset Detail | Detail-rich but visually fragmented | Unified detail tabs/panels, stronger section rhythm | Implemented |
| Projects | Card surface feels generic | Premium project cards, clearer metadata and actions | Implemented |
| Project Detail | Mixed legacy/shared styles | Unified details/tables/workspace language | Implemented |
| Maintenance | Many controls, high information density | Stronger hierarchy for status, cost and workflow | Implemented |
| Breakdowns | Workflow is powerful but visually dense | Better workflow surfaces and action hierarchy | Implemented |
| Breakdown Detail | Very large screen with mixed Tailwind/custom CSS | Global semantic layer + consistent modal/form styles | Implemented |
| New Breakdown Wizard | Long form, stepper + raw Tailwind | Consistent stepper/form surfaces and spacing | Implemented |
| Fuel | Dense operations table | Improved search/table/filter surfaces | Implemented |
| Inventory | Large and form-heavy | Unified tables, filters and forms | Implemented |
| Purchases | Workflow controls mixed with data | Consistent workflow buttons and document surfaces | Implemented |
| Invoices | Financial data needs stronger hierarchy | Unified tables/forms/statuses | Implemented |
| Customers | CRUD card/form surface | Consistent enterprise card/form language | Implemented |
| Drivers | CRUD + references | Consistent table/modal language | Implemented |
| Plans | Maintenance planning table/form | Shared table/forms/status system | Implemented |
| Oils | Specialized maintenance data | Shared data density + form hierarchy | Implemented |
| Tires | Specialized asset data | Shared data density + action hierarchy | Implemented |
| Trips | Complex custom page and board | Shared header/card/button/table language retained with custom board | Implemented |
| Trip Detail | Complex detail + forms | Shared detail/modal language | Implemented |
| Costs | Financial records | Stronger table/card rhythm | Implemented |
| Charging | Financial allocation surface | Stronger filter/table visual structure | Implemented |
| Reports | Custom report center | Preserve workflow while reducing tiny typography | Implemented |
| True Cost | Analytical table | Shared analytical/report surfaces | Implemented |
| Alerts | Notification list | Clear alert hierarchy and status semantics | Implemented |
| Users | Administrative CRUD | Stronger security/admin hierarchy | Implemented |
| Audit | Dense read-only log | Cleaner enterprise log surface | Implemented |
| Settings | Long admin form | Clear grouped form sections | Implemented |
| Assignment Create | Workflow form | Unified form/modal treatment | Implemented |
| Module Records | Generic CRUD engine | Shared data/form/status treatment | Implemented |
| Workspaces | Tabs looked disconnected | Integrated contextual workspace tabs | Implemented |
| Module Placeholder | Functional but basic | Uses refreshed card/header language | Implemented |

## 3. Implemented architecture changes

### Shared visual layer

- Added `src/styles/frontend-overhaul.css` as the final visual layer loaded after the existing CSS.
- Added CSS design tokens for background, surfaces, text, borders, brand, semantic states, radius and shadows.
- Added semantic hooks for shared components:
  - `ui-button`
  - `ui-card`
  - `ui-metric-card`
  - `ui-page-header`
  - `ui-data-table`
  - `ui-filter-bar`
  - `ui-status-badge`
  - `ui-empty-state`
  - `ui-modal`
- Preserved all existing component APIs and business behavior.

### Navigation

- Kept the top navbar architecture.
- Did not introduce a sidebar.
- Increased readability of nav labels and user identity.
- Improved grouped dropdowns and active-state treatment.
- Improved mobile navigation without changing route semantics.

### Forms & modals

- Increased control height and label contrast.
- Added consistent focus treatment.
- Standardized modal header/content/footer surfaces.
- Preserved direct-modal screens for compatibility while improving their visual result globally.

### Data surfaces

- Increased data-table hierarchy and row readability.
- Preserved client-side search, sort, filters and pagination.
- Improved mobile card presentation.
- Improved action-button consistency.

### Build hygiene

- Removed the duplicate Tailwind `@layer components` block from `src/shared/ui/design-system.css` so it is now a pure CSS compatibility layer.
- This directly removes the duplicate `@apply` section that was reported around `design-system.css:70`.
- Kept Tailwind `@apply` only in `src/index.css`, where Tailwind base/components/utilities are intentionally defined.

### Release identity

- Version synchronized to `0.38.0` in `package.json`, `package-lock.json`, and `src/config/app.ts`.

## 4. Verification performed

### Confirmed

- 92 TS/TSX files parsed with the installed TypeScript compiler parser: **0 syntax errors**.
- CSS parsing for `global.css`, `design-system.css`, `frontend-overhaul.css`, and `index.css`: **0 parser errors**.
- `design-system.css` no longer contains `@layer`/`@apply` rules.

### Environment limitation

A full `npm run build` could not be completed because the provided archive has no `node_modules`, and the execution environment cannot resolve `registry.npmjs.org`. The build command therefore stops during TypeScript type resolution before Vite can produce the production bundle.

The source-level validation above is therefore intentionally reported separately from production-build verification.
