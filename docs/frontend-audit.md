# KEMEX Frontend Audit — Phase 0

**Project:** KEMEX Web  
**Version:** 0.46.0  
**Audit phase:** Repository Discovery / Phase 0  
**Audit date:** 2026-09-23  
**Scope:** Static repository discovery and build/test verification. No application source code was intentionally modified during this phase.

---

## 1. Executive Summary

KEMEX is a React/TypeScript/Vite enterprise-style web application for transportation, fleet, equipment, maintenance, inventory, operations, finance and reporting.

The repository already contains substantial work from multiple previous UI/navigation/enterprise sprints. The current architecture is not a clean starting point; it is a partially consolidated product with competing historical UI layers still present.

### Current assessment

| Area | Status | Priority | Main finding |
|---|---|---:|---|
| Framework / build | Present | P1 | React 19 + Vite 8 + TS 7; runtime target is Node 24 |
| Routing | Present | P1 | React Router with 38 route declarations; route architecture is now explicit + generic fallback |
| Application shell | Present | P1 | Top navbar architecture exists and desktop sidebar is not mounted |
| Design system | Partial | P1 | Shared UI exists, but legacy/global CSS layers overlap heavily |
| UX architecture | Partial | P1 | Major workflows exist, but several modules still use a generic CRUD screen |
| Data layer | Present / high coupling | P1 | Repository abstraction exists, but bootstrap fetches almost the whole product in one query |
| Authentication | Present | P1 | Supabase Auth boundary exists; browser session cache is also maintained in localStorage |
| Authorization | Present | P1 | Client role matrix + Supabase RLS/policies exist; two authorization representations must remain synchronized |
| Responsive | Partial | P2 | Mobile table card fallback exists, but each complex screen is not yet consistently mobile-specific |
| RTL / Arabic | Strong foundation | P2 | Arabic-first RTL is established at document level and in major components |
| Accessibility | Partial | P2 | Basic semantics/aria exist, but modal focus/keyboard management is not centralized |
| Performance | Partial | P1 | Some route code-splitting exists, but the bootstrap and monolithic pages remain expensive |
| Tests | Weak | P1 | Only one DB test file exists; no browser/component test suite was found |
| CI / release verification | Missing in archive | P0/P1 | README claims GitHub Actions, but `.github` is absent from the supplied archive |
| Reference integrity | Broken | P1 | `legacy/TFMS_Fixed.html` is referenced throughout the repo but is absent |

### Overall conclusion

The product has a credible enterprise foundation, but it is currently in a **consolidation / stabilization stage**, not a clean production-readiness stage.

The next work should not begin with another visual overhaul. The correct sequence is:

1. Stabilize the build/test/reference baseline.
2. Establish one canonical UI/design-system layer.
3. Decouple feature data loading from the global bootstrap.
4. Finish specialized operational workflows instead of expanding generic CRUD.
5. Then perform shell/UX/responsive/accessibility/performance passes under controlled ownership.

---

## 2. Technology Stack

### Confirmed

- React `19.3.0`
- React DOM `19.3.0`
- React Router DOM `6.30.6` range
- TypeScript `7.0.2`
- Vite `8.3.0`
- TanStack React Query `5.103.2`
- Supabase JS `2.116.0`
- Lucide React `1.47.0`
- Tailwind CSS `3.4.19`
- PGlite `0.5.8` for DB tests
- Node requirement: `>=24`
- `.nvmrc`: `24`
- Production data mode defaults to Supabase
- Development/local adapter exists through `VITE_DATA_MODE=local`

### Build configuration

- Vite + React plugin.
- TypeScript is strict.
- JSX runtime is `react-jsx`.
- Module resolution is `Bundler`.
- Vercel rewrite sends all requests to `/index.html`.

---

## 3. Repository Inventory

### Source organization

- `src/App.tsx` — application orchestration and routing
- `src/components/` — legacy/current shared component area
- `src/shared/ui/` — newer shared UI boundary
- `src/pages/` — feature screens
- `src/features/` — auth/settings/bootstrap/trips feature boundaries
- `src/services/` — repositories and domain services
- `src/core/repository/` — repository contract
- `src/config/` — navigation/modules/permission definitions
- `src/types/` — TypeScript domain models
- `src/styles/` — multiple global styling layers
- `supabase/migrations/` — 17 ordered migrations
- `supabase/functions/admin-create-user/` — admin user creation function
- `tests/db/` — database/RLS tests
- `scripts/verify-source.mjs` — source integrity verifier

### Size / concentration findings

The source tree contains approximately 93 TypeScript/TSX files and 6 CSS files.

The largest code units include:

- `src/pages/NewBreakdownWizard.tsx` — 772 lines
- `src/pages/BreakdownDetailPage.tsx` — 740 lines
- `src/services/repository.ts` — 531 lines
- `src/App.tsx` — 446 lines
- `src/pages/ReportsPage.tsx` — ~294 lines
- `src/pages/InventoryPage.tsx` — ~383 lines
- `src/styles/global.css` — 642 lines
- `src/styles/frontend-overhaul.css` — 457 lines
- `src/styles/reference-overhaul.css` — 440 lines
- `src/styles/modal-overhaul.css` — 476 lines

This indicates a strong accumulation pattern around operational detail screens and global CSS rather than small independently owned feature modules.

---

## 4. Routing Audit

The application currently has 38 `<Route>` declarations, including detail routes, redirects, a generic module route and a wildcard route.

### Explicit application routes

- `/`
- `/dashboard`
- `/alerts`
- `/operations`
- `/assets`
- `/assets/edit/:id`
- `/asset/:id`
- `/drivers`
- `/maintenance`
- `/breakdowns`
- `/breakdowns/new`
- `/breakdowns/:id`
- `/plans`
- `/oils`
- `/tires`
- `/true-cost`
- `/reports/true-cost`
- `/inventory`
- `/movements`
- `/purchases`
- `/fuel`
- `/projects`
- `/project/:id`
- `/costs`
- `/charging`
- `/invoices`
- `/customers`
- `/reports`
- `/reports/:key`
- `/users`
- `/audit`
- `/settings`
- `/trips`
- `/trips/dispatch`
- `/trips/:id`
- `/assignments/new/:requestId`
- `/:moduleKey`
- `*`

### Findings

**Positive:** Asset, project, breakdown, trip and assignment detail screens have dedicated route wrappers rather than being embedded only in a giant switch.

**Risk:** The final `/:moduleKey` generic route is intentionally broad. Its behavior is safe only while all specialized routes remain defined before it and all module keys remain synchronized with `GENERIC_MODULES`.

**Risk:** The route configuration and the module configuration are two related sources of truth. This increases the chance of route/permission/module drift.

**Finding:** `reports/true-cost` redirects to `true-cost`, which is reasonable backward compatibility, but route semantics should eventually be centralized instead of duplicated between legacy compatibility and current navigation.

---

## 5. Navigation / Application Shell Audit

### Current architecture

The current shell uses a top navbar with business-domain dropdowns:

- الأسطول
- الصيانة
- التشغيل
- النقل
- المخازن
- المالية
- التقارير
- الإدارة

Notifications are a bell icon beside the user, and logout is in the top shell. Mobile navigation uses an overlay panel.

### Findings

**Positive:** The current shell is aligned with the newer navigation architecture. A persistent desktop sidebar is not mounted.

**Positive:** Navigation groups are role-filtered through `canViewModule`.

**Risk:** `src/config/app.ts` contains both `NAVIGATION_GROUPS` and a separate `MODULES` array that represent overlapping navigation concepts. This duplication should be removed after migration to a canonical route registry.

**Risk:** Permissions are duplicated in both frontend configuration and Supabase policies. This is necessary for defense-in-depth, but the frontend should eventually derive its available actions from the same typed capability model used to validate backend authorization.

---

## 6. Design System Audit

### Existing shared UI

The repository contains reusable primitives for:

- Buttons
- Cards
- Stat cards
- Data tables
- Page headers
- Status badges
- Detail tabs
- Empty states
- Skeletons
- Confirmation modals
- Generic form modal
- Toast provider
- Modal portal

`src/shared/ui` partially re-exports components from `src/components/ui`, which indicates an ongoing migration rather than two intentional design systems.

### Major issue: competing CSS systems

Six CSS files are loaded globally from `src/main.tsx`:

1. `src/index.css`
2. `src/styles/global.css`
3. `src/shared/ui/design-system.css`
4. `src/styles/frontend-overhaul.css`
5. `src/styles/reference-overhaul.css`
6. `src/styles/modal-overhaul.css`

Static selector analysis shows extensive overlap. Core selectors such as `body`, `#root`, `.site-navbar`, `.desktop-nav`, `.nav-direct`, `.nav-group-trigger`, `.page-head`, `.metric-card`, `.table-wrap`, `.modal-card`, `.modal-backdrop`, `.field input`, `.field select`, `.secondary-button`, and `.primary-button` are defined across multiple files.

This is a direct architectural risk because the final appearance depends on import order and cascade rather than on one canonical token/component contract.

### Recommendation

Create one canonical CSS token and component layer and move page-specific styling behind feature namespaces. Do not continue adding another global `*-overhaul.css` file.

---

## 7. Component Architecture Audit

### Duplicate / migration indicators

- `src/components/ui/Card.tsx` contains the main implementation.
- `src/shared/ui/Card.tsx` re-exports the implementation.
- `DataTable`, `PageHeader` and other UI primitives have related parallel locations.
- Some pages import from `../components/ui` while other pages import from `../shared/ui`.

This is not yet a hard functional defect, but it signals incomplete consolidation.

### Large component risk

`NewBreakdownWizard` and `BreakdownDetailPage` contain large amounts of domain-specific state and rendering in single files.

These should eventually be split into feature-owned subcomponents without changing business behavior.

### State boundary finding

The application is still heavily driven by top-level state/handlers inside `App.tsx`. Save/update operations for projects, assets, work orders, fuel, inventory, module records and workflow transitions are orchestrated there.

This makes `App.tsx` a coordination hotspot and makes future feature isolation harder.

---

## 8. Data Layer Audit

### Architecture

The project has a repository contract and two adapters:

- `TfmsRepository` for Supabase
- `LocalStorageRepository` for local development

A factory selects the adapter based on `VITE_DATA_MODE`.

This is a strong architectural foundation.

### Major issue: global bootstrap coupling

`useKemexBootstrap.ts` executes a single large `Promise.allSettled()` containing:

- assets
- projects
- work orders
- fuel
- clients
- cost centers
- asset types
- charging rates
- warehouses
- inventory
- stock movements
- technicians
- maintenance parts
- trips
- trip costs
- every generic module
- oil changes
- tire operations
- settings

The code intentionally tolerates individual failures, which is good for resilience, but the architecture still means the authenticated application initializes a broad dataset before the majority of individual pages are needed.

### Consequences

- Higher initial network/data cost.
- Larger in-memory state.
- More invalidation work after writes.
- Tighter coupling between unrelated features.
- Harder feature-level caching and loading UX.

### Target direction

Keep the bootstrap small: user/session/org context plus the minimum shell data. Move module queries into feature hooks with independent query keys and loading/error boundaries.

---

## 9. Authentication / Authorization Audit

### Authentication

Supabase Auth is the production identity boundary. The app also caches the resolved user object in `localStorage` under `tfms-web-user`.

### Positive controls found

- Current user is revalidated against Supabase on remote mode startup.
- Inactive/invalid roles are rejected.
- First-login password change is represented in the user profile.
- Admin user creation is handled by a Supabase edge function.
- Database RLS is present.

### Risk

The browser stores a copy of user profile state in localStorage. This is acceptable as a UI/session cache only if treated as non-authoritative. The code generally rechecks the remote session, which is good; the design should explicitly document that all sensitive authorization decisions remain server-side.

### Authorization model

There are two policy layers:

1. Frontend role/module visibility and write matrix in `src/config/app.ts`.
2. Supabase RLS/private permission functions in SQL migrations.

The test suite includes role-sensitive scenarios, which is a strong sign that backend authorization is intended to be authoritative.

---

## 10. Database / Supabase Audit

The archive contains 17 ordered migrations covering:

- Core tables
- RLS policies
- workflow and approval events
- documents and notifications
- audit triggers
- enterprise foundation
- charging rates
- maintenance/inventory
- atomic stock posting
- password first-login controls
- function search_path hardening

### Positive findings

- RLS is materially implemented rather than being only a frontend concept.
- Inventory posting has server-side functions and atomic balance handling.
- Audit logging is implemented at database level.
- Workflow transitions have DB guards/triggers.
- Maintenance-related trigger functions received `search_path` hardening.

### Remaining risk

The migration history is now substantial and business rules are spread across many migrations. Future work should avoid ad-hoc SQL patches and should document each schema/domain boundary.

---

## 11. Generic CRUD vs Operational UX

The project contains 17 `MODULE_CONFIG` generic modules:

- requests
- assignments
- operations
- trips
- drivers
- contracts
- plans
- oils
- tires
- inventory
- movements
- purchases
- costs
- charging
- invoices
- customers
- audit

A reusable `ModuleRecordsPage` provides search, status filtering, table display, view, edit, delete, CSV export and workflow actions.

### Critical product finding

The generic screen is structurally useful but should not be the final UX for major operational entities.

Examples:

- trips need dispatch/list/detail/cost workflow;
- maintenance needs issue → work order → diagnosis → parts/labor → completion;
- assets need lifecycle-oriented overview/operations/history/documents/costs;
- assignments need operational handover context;
- inventory needs stock and receipt workflows rather than a generic record editor.

The current code already contains specialized pages for some of these. The remaining generic modules should be treated as workflow candidates, not as finished enterprise screens.

---

## 12. Forms / Workflow Audit

### Positive findings

The forms generally contain:

- grouped data
- required-field validation
- numeric validation
- contextual help in generic module configuration
- workflow actions
- unsaved-state patterns in some specialized screens

### Issues

- Form behavior is split between specialized pages and generic `ModuleRecordsPage`.
- Native `window.confirm()` and `window.alert()` are still used in places.
- There is no single application-level form/error interaction contract covering every feature.
- The generic form model is still fundamentally string/number based and cannot express richer domain controls without feature-specific exceptions.

### Target

Use shared primitives for modal, confirmation, validation summaries and field layout, while letting feature modules own domain behavior.

---

## 13. Responsive Audit

### Positive findings

The current DataTable has a desktop table and a mobile card fallback. There are responsive breakpoints in the global CSS layers and mobile navigation exists.

### Risks

- The responsive contract is spread across multiple global stylesheets.
- Complex pages do not share one predictable mobile interaction model.
- Many tables rely on hiding the desktop table and replacing it with cards; this is useful but should be evaluated per workflow instead of applied universally.

### Required next pass

Test at minimum:

- 1440px desktop
- 1280px laptop
- 1024px tablet landscape
- 768px tablet
- 390px mobile
- 360px mobile

For every dense operational table decide explicitly between horizontal scroll, cards, detail drawer, stacked list and mobile-specific actions.

---

## 14. RTL / Arabic Audit

### Positive findings

`ThemeProvider` establishes:

- `document.documentElement.dir = 'rtl'`
- `document.documentElement.lang = 'ar'`

The product copy is Arabic-first, and the Tailwind font stack includes Cairo/Tajawal.

### Remaining issues to verify visually

- mixed Arabic/English codes
- date and number alignment
- icon direction semantics
- dropdown placement at viewport edges
- mobile drawer direction
- table action alignment
- form control labels and error placement

RTL should remain a structural concern rather than another visual patch.

---

## 15. Accessibility Audit

### Positive findings

- Buttons are generally real `<button>` elements.
- Some icon-only controls use `aria-label`.
- Navigation dropdowns use `aria-expanded`.
- Tables provide semantic table structures.
- Dialogs commonly use `role="dialog"` and `aria-modal`.

### Gaps

- Modal focus management is not centralized.
- No consistent focus trap or return-focus contract was identified.
- Escape-key closing is not a unified modal behavior.
- Native confirm/alert bypass the product interaction layer.
- The navbar brand uses a `div` with `role="button"`; it should eventually be a semantic button/link.

Accessibility is functional enough for a foundation but not yet a final enterprise gate.

---

## 16. Performance Audit

### Positive

Route-level lazy loading exists for several large pages/workspaces.

### Risks

- The bootstrap loads a broad cross-module dataset after authentication.
- `WorkspacesPage.tsx` imports many large feature pages into one workspace module, which limits fine-grained feature splitting.
- Large files contain dense JSX/state logic.
- Global CSS payload is large and duplicated.

### Recommendation

Measure before optimizing. The first measurable target should be route-by-route JS size and bootstrap payload/latency, not arbitrary micro-optimizations.

---

## 17. Testing / Verification Audit

### Tests found

Only one automated test file was found:

`tests/db/rls.test.mjs`

It includes meaningful scenarios for:

- role read/write permissions
- workflow transitions
- document numbering
- financial-role restrictions
- audit protection
- admin protection
- migration idempotency

### Missing

No browser/E2E test suite was found in the supplied archive.

No component/unit test suite was found for:

- navigation
- forms
- DataTable
- workflow buttons
- responsive behavior
- modal interactions
- reports
- asset detail behavior

### Verification result in the supplied archive

`npm run typecheck` — **blocked**.

Reason: the supplied archive did not contain a usable dependency tree. The repository's declared package versions are present in the lockfile, but the mounted `node_modules` tree is incomplete.

`npm run build` — **blocked** by the same dependency issue before Vite build verification could complete.

`npm run test:db` — **blocked** because the PGlite package installation was incomplete.

`scripts/verify-source.mjs` — **fails immediately** because it expects `legacy/TFMS_Fixed.html`, which is absent from the supplied archive.

The verification result must therefore be treated as **environment/reference-integrity failure**, not as evidence that all application code is broken.

---

## 18. Reference / Documentation Integrity

This is one of the clearest repository problems.

The documentation and verifier repeatedly refer to:

`legacy/TFMS_Fixed.html`

but the supplied archive contains no `legacy/` directory and no `TFMS_Fixed.html`.

Consequences:

- source verifier cannot run
- reference-based visual/functional comparison is not reproducible from the archive
- older audit documents cannot be independently validated
- historical scripts contain assumptions that no longer match current routing

The repository must either restore the canonical reference file or formally retire/update every script/document that depends on it.

---

## 19. Verification Script Drift

`scripts/verify-source.mjs` is itself behind the current architecture.

It expects old switch-case strings such as:

- `case 'plans'`
- `case 'inventory'`
- `case 'maintenance'`
- `case 'oils'`
- `case 'tires'`
- `case 'purchases'`
- `case 'costs'`
- `case 'charging'`
- `case 'invoices'`
- `case 'customers'`
- `case 'audit'`

The current `App.tsx` uses React Router `<Route>` declarations instead.

Therefore even after restoring the legacy reference file, this verifier requires redesign around the current route/config architecture.

**Priority: P1.**

---

## 20. CI / Release Audit

The README states that GitHub Actions exist for Node 24 CI/build verification, but no `.github` directory is present in the supplied archive.

This means the archive does not contain the claimed CI workflow.

**Priority: P0 for release verification.**

Before production-readiness approval, the repository must contain a reproducible pipeline that at minimum executes:

1. install from lockfile
2. typecheck
3. DB/RLS tests
4. production build
5. optional source integrity checks

---

## 21. Environment / Configuration Audit

### Positive

- `.nvmrc` and `package.json` agree on Node 24.
- Vercel rewrite is present.
- Environment variables are documented.

### Finding

The Supabase URL and publishable key are duplicated as defaults in both `.env.example` and `src/services/supabase.ts`.

The publishable key is designed for client use, but operationally the application should prefer explicit environment configuration in deployment rather than carrying environment-specific connection values in source defaults.

**Priority: P2.**

---

## 22. P0 / P1 / P2 / P3 Findings

### P0

1. **Release verification is not reproducible from the supplied archive.** No `.github` CI workflow is present despite README claims.
2. **The supplied archive cannot run the current verification toolchain because dependencies are incomplete.** The issue is environmental/archive-level, but release acceptance cannot be completed until corrected.

### P1

1. `legacy/TFMS_Fixed.html` is missing while many docs/scripts depend on it.
2. `scripts/verify-source.mjs` is architecturally stale and expects old switch-case routing.
3. Six global CSS layers overlap heavily and redefine common selectors.
4. Bootstrap loads nearly the entire application dataset in one query lifecycle.
5. `App.tsx` is a central orchestration hotspot for feature saves/workflows.
6. Major business modules still rely on `ModuleRecordsPage` instead of fully specialized operational workflows.
7. Shared UI migration is incomplete between `components/ui` and `shared/ui`.
8. The application lacks browser/E2E coverage for key operational workflows.

### P2

1. Responsive rules are distributed across global style layers.
2. Modal focus/keyboard behavior is not centralized.
3. Native browser confirm/alert interactions remain in feature code.
4. Navigation/module configuration has overlapping sources of truth.
5. Environment-specific Supabase defaults are duplicated.
6. Large feature components should be split after stabilization.

### P3

1. Final visual polish, animation restraint and typography consistency.
2. Small icon/spacing refinements.
3. Additional analytics presentation improvements.
4. Further bundle optimization after measurement.

---

## 23. Recommended Phase Sequence

### Phase 0 — Repository Discovery

**Status: COMPLETE (static audit).**

Do not redesign the application in this phase.

### Phase 1 — Architecture

Next actions:

- Define canonical route registry.
- Define feature boundaries.
- Define state/query boundaries.
- Define one shared UI location.
- Define error/loading conventions.
- Keep existing functionality intact.

### Phase 2 — Design System

- Replace competing global layers with one canonical token/component system.
- Establish typography/spacing/radius/shadow/color tokens.
- Keep feature-specific styles namespaced.
- Establish desktop/tablet/mobile/RTL contracts.

### Phase 3 — Application Shell

- Stabilize navbar/dropdowns/user menu/notifications/search/mobile navigation.
- Keep shell independent from page-level layout styles.

### Phase 4 — UX Architecture

Formalize workflows for:

- vehicle lifecycle
- maintenance lifecycle
- transportation lifecycle
- assignment lifecycle
- inventory lifecycle

### Phase 5 — Dashboard

Build management visibility around actual operational state rather than decorative KPI cards.

### Phase 6 — Data Experience

Evolve the DataTable into a predictable enterprise data contract and reduce page-specific table implementations.

### Phase 7–10 — Feature Specialization

Finish fleet, maintenance, assets/rentals and forms with operational workflows rather than generic CRUD.

### Phase 11–14 — Responsive / RTL / Accessibility / Performance

Perform dedicated verification passes only after architecture and design-system stabilization.

### Phase 15 — QA

Introduce route, workflow and regression automation.

### Phase 16 — Final Review

Approve only against measurable checks, not visual impression.

---

## 24. Change-Control Rules for the Next Phases

1. Do not add another global CSS overhaul file.
2. Do not duplicate a shared component when an existing component can be repaired.
3. Do not turn generic module pages into feature monsters; specialize by workflow.
4. Do not move business rules into page components if they belong in repository/domain services.
5. Do not change database behavior merely to simplify the UI.
6. Do not declare a phase complete without build/typecheck/test verification.
7. Do not delete legacy functionality merely to reduce screen complexity.

---

## 25. Agent Ownership Map

| Agent | Immediate assignment |
|---|---|
| ARCH-01 | Canonical route/module/query architecture |
| DESIGN-01 | CSS consolidation + token contract |
| UX-01 | Operational workflow maps + generic CRUD gap list |
| SHELL-01 | Navbar/mobile shell stabilization |
| DASH-01 | Dashboard data/operational visibility audit |
| FLEET-01 | Fleet/driver/contracts workflow audit |
| MAINT-01 | Maintenance/breakdown/plans/oils/tires workflow audit |
| ASSET-01 | Asset lifecycle/detail/rental audit |
| FORM-01 | Shared form/modal/validation contract |
| DATA-01 | Table/filter/export/mobile data contract |
| RESP-01 | Breakpoint-by-breakpoint responsive test matrix |
| RTL-01 | Arabic/RTL structural audit |
| A11Y-01 | Keyboard/focus/dialog/table accessibility audit |
| PERF-01 | Measured bundle/bootstrap/render audit |
| QA-01 | Route/workflow regression matrix |
| FINAL-01 | Production gate after all prior phases |

No agent should independently perform a full application redesign.

---

## 26. Phase 0 Acceptance

Phase 0 is complete because the repository has been inspected across:

- framework
- build system
- package manager
- routing
- state management
- API/repository layer
- authentication
- authorization
- components
- pages
- layouts/shell
- styles/design tokens
- charts/tables/forms
- utilities/hooks/services
- tests
- configuration/environment handling
- Supabase migrations/functions
- known technical debt and verification risks

Application source code was not changed as part of this Phase 0 audit.

**Next gate:** Phase 1 Architecture.
