# KEMEX Frontend Architecture — Phase 1

**Repository:** KEMEX Web v0.46.0  
**Phase:** 1 — Architecture  
**Date:** 2026-09-23  
**Architecture owner:** MASTER / ARCH-01  
**Status:** DEFINED — implementation migration intentionally not started

---

## 1. Purpose

This document defines the canonical frontend architecture for KEMEX without a full rewrite.

The Phase 1 rule is:

> Stabilize boundaries first; move code only when a boundary can be introduced without changing business behavior.

The existing React/Vite/TypeScript application, Supabase repository contract, LocalStorage adapter, React Query cache, authentication flow, and current operational pages remain the working baseline.

No feature is to be deleted merely because its current implementation is architecturally imperfect.

---

## 2. Confirmed Current Stack

- React 19
- Vite 8
- TypeScript 7, strict mode
- React Router 6
- TanStack React Query 5
- Supabase JS
- Lucide React
- Tailwind configuration exists, while current application styling is primarily CSS-based
- Supabase repository adapter + LocalStorage repository adapter
- HashRouter currently owns browser navigation

The existing root provider chain is:

```text
QueryClientProvider
└── ThemeProvider
    └── AuthProvider
        └── ToastProvider
            └── App
```

This provider hierarchy is retained for Phase 1.

---

## 3. Current Architecture Assessment

### 3.1 What is already structurally sound

1. A repository interface exists in `src/core/repository/types.ts`.
2. Supabase and local adapters are separated.
3. React Query already provides a server-state cache.
4. Authentication and theme are already isolated as providers.
5. Several features already have colocated hooks/services/types, especially assets, breakdowns, settings, and trips.
6. Specialized operational pages already exist for assets, maintenance/breakdowns, trips, inventory, reports, and workspaces.

### 3.2 Current architecture hotspots

1. `src/App.tsx` is a coordination hotspot. It currently owns routing, bootstrap consumption, permission guarding, many save/delete handlers, workflow transitions, navigation callbacks, and feature data plumbing.
2. `useKemexBootstrap.ts` loads most application datasets into one authenticated query.
3. Navigation is represented in more than one configuration source (`NAVIGATION_GROUPS`, `MODULES`, role/module maps, report items, route declarations).
4. Shared UI is split between `src/components/ui` and `src/shared/ui`, although `shared/ui` currently re-exports several implementations.
5. Generic modules are configured in `src/config/modules.ts` and rendered through `ModuleRecordsPage`.
6. Domain pages still import repository/service concerns directly in several places.
7. CSS is currently spread across multiple global layers.

These findings come directly from the Phase 0 repository audit and are treated as architectural constraints for the next phases.

---

## 4. Canonical Target Architecture

The target architecture is layered and feature-oriented:

```text
src/
├── app/
│   ├── providers/
│   ├── router/
│   │   ├── routes.tsx
│   │   ├── routeMeta.ts
│   │   └── guards.tsx
│   ├── shell/
│   └── App.tsx
│
├── core/
│   ├── repository/
│   │   ├── types.ts
│   │   └── contracts.ts        (only if needed later)
│   ├── errors/
│   ├── permissions/
│   └── query/
│
├── features/
│   ├── dashboard/
│   ├── assets/
│   ├── maintenance/
│   ├── operations/
│   ├── trips/
│   ├── inventory/
│   ├── finance/
│   ├── reports/
│   ├── administration/
│   └── settings/
│
├── shared/
│   ├── ui/
│   ├── forms/
│   ├── tables/
│   ├── feedback/
│   └── utils/
│
├── services/
│   └── adapters only
│
├── config/
│   ├── app.ts
│   └── modules.ts     (temporary until configuration is consolidated)
│
├── styles/
│   └── canonical styles only
│
└── types/
    └── cross-feature/domain types only
```

### Important constraint

This is a target boundary map, not a permission to physically move every file now.

Migration is incremental and feature-by-feature.

---

## 5. Layer Responsibilities

### 5.1 `app`

Owns application composition:

- providers
- router creation
- route definitions
- authentication/session gates
- application shell composition
- global error boundary
- global suspense/loading boundary

`app` may import feature route/page modules.

`app` must not contain business rules for assets, maintenance, trips, inventory, finance, or other domains.

### 5.2 `core`

Owns stable cross-application contracts:

- repository interfaces
- error taxonomy
- permission primitives
- query conventions
- cross-cutting infrastructure contracts

`core` must not import page components.

### 5.3 `features`

Each business domain owns its behavior.

A feature may contain:

```text
feature/
├── pages/
├── components/
├── hooks/
├── services/
├── types.ts
├── config.ts
└── index.ts
```

A feature owns:

- domain workflows
- feature queries and mutations
- domain validation
- feature-specific forms
- feature-specific tables/views
- route-level pages
- feature-specific calculations

A feature should not edit another feature's internal state directly.

### 5.4 `shared`

Owns reusable presentation and cross-feature interaction primitives:

- Button
- Card
- DataTable
- PageHeader
- Modal/Dialog
- Form primitives
- EmptyState
- Skeleton
- StatusBadge
- Toast/feedback

Shared code must remain domain-neutral.

### 5.5 `services`

At the end of migration, this layer should primarily contain infrastructure adapters and cross-cutting services.

Feature business logic should not accumulate here merely because a file is called a service.

The existing repository implementation remains here during migration because changing it immediately would increase regression risk.

---

## 6. Canonical Feature Boundaries

| Domain | Current screens/data | Target owner |
|---|---|---|
| Dashboard | `DashboardPage`, dashboard metrics/activity | `features/dashboard` |
| Assets & fleet | assets, asset detail, drivers, contracts | `features/assets` / fleet subdomain |
| Maintenance | work orders, breakdowns, plans, oils, tires | `features/maintenance` |
| Operations | operations, requests, assignments, fuel, projects | `features/operations` |
| Transportation | trips, dispatch, trip detail, trip costs/permits | `features/trips` |
| Inventory | inventory, movements, purchases, warehouses | `features/inventory` |
| Finance | costs, charging, invoices, customers | `features/finance` |
| Reports | reports, true-cost | `features/reports` |
| Administration | users, audit | `features/administration` |
| Settings | settings, currency, system configuration | `features/settings` |
| Authentication | login, password change, session | `features/auth` |

### Ownership rule

A module belongs to the domain that owns its operational workflow, not to the generic CRUD renderer that currently displays it.

---

## 7. Route Architecture

### 7.1 Current route source

React Router declarations currently live in `src/App.tsx`.

The application has these route families:

```text
/
/dashboard
/alerts
/assets
/assets/edit/:id
/asset/:id
/drivers
/maintenance
/breakdowns
/breakdowns/new
/breakdowns/:id
/plans
/oils
/tires
/true-cost
/reports
/reports/:key
/inventory
/movements
/purchases
/fuel
/projects
/project/:id
/costs
/charging
/invoices
/customers
/users
/audit
/settings
/trips
/trips/dispatch
/trips/:id
/assignments/new/:requestId
/:moduleKey
```

### 7.2 Canonical route registry target

The route table must become a single typed registry.

Conceptually:

```ts
export type AppRoute = {
  path: string
  module: string
  label: string
  requiresAuth: boolean
  permission?: string
  lazy?: boolean
}
```

The registry becomes the source for:

- router declarations
- route metadata
- active navigation state
- page titles
- permission lookup
- breadcrumb metadata
- lazy-loading decisions

Navigation should not independently redefine application routes.

### 7.3 Route migration rule

First extract the existing declarations without changing paths.

Do not rename routes as part of architecture extraction.

Aliases/redirects such as `/movements → /inventory` and `/reports/true-cost → /true-cost` remain until there is a deliberate product decision to retire them.

---

## 8. Navigation and Permission Architecture

### Current issue

Navigation and permissions are currently distributed across:

- `NAVIGATION_GROUPS`
- `REPORT_NAV_ITEMS`
- `MODULES`
- `ROLE_MODULES`
- `MODULE_ROLES`
- route declarations

This creates multiple sources of truth.

### Target

Introduce one canonical module/route metadata model with separate permission capabilities:

```text
Route metadata
    ↓
Module identity
    ↓
Visibility capability
    ↓
Write capability
    ↓
Workflow capability (where required)
```

Permission decisions must remain separate from visual navigation decisions.

Frontend permissions control visibility and UX. Supabase RLS remains the authoritative data-access boundary.

### Migration sequence

1. Preserve all current permission behavior.
2. Define canonical permission keys.
3. Make navigation consume the same keys.
4. Remove duplicate role maps only after behavioral equivalence is verified.

---

## 9. State Architecture

KEMEX will use three explicit state categories.

### 9.1 Server/domain state

Owned by TanStack React Query.

Examples:

- assets
- projects
- work orders
- trips
- inventory
- reports data
- module records

Queries must be scoped to their owning feature.

### 9.2 Session/application state

Owned by existing providers where appropriate:

- authenticated user/session → AuthProvider
- theme/direction → ThemeProvider
- currency preference → CurrencyProvider

Do not duplicate these values into unrelated page state.

### 9.3 Local UI state

Owned by the closest component that needs it.

Examples:

- active tab
- open modal
- filter text
- selected row
- drawer visibility
- local draft field values

Do not lift local UI state into `App.tsx` unless multiple routes genuinely need it.

---

## 10. Query Architecture

### Current

The bootstrap query key is:

```text
['kemex', 'bootstrap', userId]
```

It currently loads most application data.

### Target

Retain the bootstrap query temporarily, then progressively shrink it.

Recommended query-key families:

```text
['kemex', 'assets', 'list', filters]
['kemex', 'assets', 'detail', assetId]
['kemex', 'maintenance', 'work-orders', filters]
['kemex', 'breakdowns', 'detail', breakdownId]
['kemex', 'trips', 'list', filters]
['kemex', 'trips', 'detail', tripId]
['kemex', 'inventory', 'items', filters]
['kemex', 'inventory', 'movements', filters]
['kemex', 'reports', reportKey, params]
```

### Feature hook rule

Pages should consume feature hooks such as:

```ts
const assetsQuery = useAssetsQuery(filters)
const createAsset = useCreateAssetMutation()
```

rather than receiving the entire application dataset and all write callbacks from `App.tsx`.

### Migration rule

Do not migrate every query in one step.

Recommended order:

1. asset detail queries — already partially colocated
2. breakdown queries — already established
3. trips
4. inventory
5. maintenance
6. operations
7. finance
8. dashboard/reports
9. remaining generic modules

---

## 11. Mutation and Invalidation Architecture

### Current problem

Many writes in `App.tsx` directly invalidate the global bootstrap query.

### Target

Each feature owns its mutation and invalidation policy.

Example:

```text
createAsset mutation
    ├── invalidate assets list
    ├── invalidate relevant asset detail
    └── invalidate dashboard summaries when required
```

Avoid global invalidation when a narrower key is sufficient.

### Business rule

A mutation must not silently update a separate feature's cache unless the relationship is explicit and documented.

---

## 12. API / Repository Boundary

The repository interface remains the stable infrastructure boundary.

```text
UI component
   ↓
feature hook
   ↓
feature service/use-case (when business logic warrants it)
   ↓
Repository interface
   ↓
Supabase adapter OR Local adapter
```

### Rules

- Components do not call Supabase directly.
- Components should progressively stop calling the repository directly.
- Feature hooks own async state.
- Repository implementations remain responsible for persistence details.
- RLS remains authoritative for authorization.
- Cross-feature calculations should live in a domain/use-case layer when they become non-trivial.

### Current exceptions to migrate later

Examples include direct service/repository use in trip, settings, admin, asset detail, and other legacy pages.

These are migration work items, not reasons to rewrite the current repository.

---

## 13. Error Architecture

KEMEX requires four levels of failure handling.

### Level 1 — Route/application failure

Use a route/application Error Boundary for unexpected render failures.

Required output:

- clear Arabic message
- retry/reload action
- route context
- no raw stack trace in the primary UI

### Level 2 — Query failure

Each feature query renders a feature-specific error state.

The UI must distinguish:

- no data
- loading
- partial data
- failed request

Do not represent every failure as an empty table.

### Level 3 — Mutation failure

Mutation failures must:

- preserve the user's draft where possible
- show an actionable error
- avoid pretending the write succeeded
- prevent duplicate submits where appropriate

### Level 4 — Domain validation failure

Validation errors stay close to the relevant field or workflow step.

A global error banner may summarize them, but it does not replace field feedback.

---

## 14. Loading Architecture

The application must distinguish three loading scopes.

### App loading

Authentication/session bootstrap only.

### Route loading

Lazy-loaded route module/chunk.

### Feature loading

Data required by the active feature.

Feature loading must not block unrelated navigation when the shell and session are already ready.

### Existing behavior to preserve

The application already lazy-loads several routes through React `lazy()` and `Suspense`. This remains the baseline until the route registry extraction.

---

## 15. Forms and Workflow Boundary

Form rendering and domain workflow must be separate.

```text
Form UI
  ↓
validated input
  ↓
feature mutation/use-case
  ↓
repository
```

Generic `ModuleRecordsPage` remains a reusable fallback for smaller modules, but major operational workflows must own specialized UI.

The generic module configuration may continue to define metadata, fields, and workflow transitions, but it must not become the permanent home of complex domain behavior.

---

## 16. Generic Module Strategy

### Keep generic for

- low-complexity reference/master records
- administrative records
- modules whose workflow is genuinely form/table oriented

### Specialize for

- assets
- breakdowns
- maintenance work orders
- trips/dispatch
- assignments
- inventory and stock movement
- operational requests
- cost workflows where calculation/audit is significant

The distinction is based on business workflow complexity, not visual preference.

---

## 17. Shared UI Canonical Location

### Current

The implementation is primarily in `src/components/ui`, while `src/shared/ui` partially re-exports the same components and also contains shared utilities.

### Target

`src/shared/ui` becomes the canonical public location.

Consumers should eventually import from:

```text
shared/ui
```

rather than choosing between two locations.

### Migration rule

1. Keep current implementations working.
2. Establish canonical exports.
3. Update consumers incrementally.
4. Remove duplicate wrappers only after import migration and build verification.

Do not copy components into a third location.

---

## 18. Styling Boundary

Phase 1 establishes the architectural rule, while Phase 2 performs the actual visual consolidation.

Target ownership:

```text
Design tokens / primitives
    → shared UI styles

Feature-specific styling
    → feature namespace / feature stylesheet

Application shell styling
    → app/shell stylesheet
```

There must be one canonical global design layer.

Do not add another `*-overhaul.css` file.

---

## 19. Dependency Rules

Allowed direction:

```text
app → features → shared/core
app → shared/core
features → shared/core
services/adapters → core/types
```

Discouraged or forbidden direction:

```text
shared → feature
core → feature
feature A → feature B internals
page → Supabase SDK directly
page → another page's implementation details
```

Cross-feature collaboration should happen through stable contracts, query data, domain services, or route navigation.

---

## 20. App.tsx Reduction Plan

`App.tsx` must eventually become an application composition file, not a business controller.

### Target responsibilities

```text
App.tsx
├── providers
├── router
├── global error boundary
└── global loading boundary
```

### Responsibilities to extract progressively

- route registry
- route metadata
- permission guard
- feature queries
- mutations
- module workflow handlers
- page data assembly
- title lookup
- navigation metadata

### Safe migration order

1. Extract route registry/metadata with identical paths.
2. Extract auth/permission guard.
3. Extract feature-specific mutation hooks.
4. Extract feature-specific query hooks.
5. Shrink bootstrap.
6. Remove obsolete prop plumbing.

No step is complete until existing routes and workflows behave equivalently.

---

## 21. Proposed Route Ownership Map

| Route family | Owner |
|---|---|
| `/dashboard` | dashboard |
| `/alerts` | app/alerts or dashboard cross-cutting alerts |
| `/assets`, `/asset/:id`, `/assets/edit/:id` | assets |
| `/drivers`, `/contracts` | assets/fleet |
| `/maintenance`, `/breakdowns`, `/plans`, `/oils`, `/tires` | maintenance |
| `/breakdowns/new`, `/breakdowns/:id` | maintenance/breakdowns |
| `/operations`, `/requests`, `/assignments`, `/fuel`, `/projects`, `/project/:id` | operations |
| `/trips`, `/trips/dispatch`, `/trips/:id` | trips |
| `/inventory`, `/movements`, `/purchases` | inventory |
| `/costs`, `/charging`, `/invoices`, `/customers` | finance |
| `/reports`, `/reports/:key`, `/true-cost` | reports |
| `/users`, `/audit` | administration |
| `/settings` | settings |
| `/login`, `/change-password` | auth |

---

## 22. Migration Backlog — Phase 1 Implementation

| ID | Action | Priority | Status |
|---|---|---:|---|
| A1 | Extract typed route metadata from `App.tsx` without changing route paths | P1 | ⬜ |
| A2 | Define one canonical module identity model | P1 | ⬜ |
| A3 | Unify navigation and route metadata consumption | P1 | ⬜ |
| A4 | Define canonical permission capability keys | P1 | ⬜ |
| A5 | Extract permission guard from `App.tsx` | P1 | ⬜ |
| A6 | Define feature query-key conventions | P1 | ✅ defined in this document |
| A7 | Define feature mutation ownership conventions | P1 | ✅ defined in this document |
| A8 | Define global/route/feature loading boundaries | P1 | ✅ defined in this document |
| A9 | Define application/query/feature error contract | P1 | ✅ defined in this document |
| A10 | Establish `src/shared/ui` as canonical UI boundary | P1 | ⬜ |
| A11 | Define App.tsx reduction plan | P1 | ✅ defined in this document |
| A12 | Shrink bootstrap incrementally after feature hooks exist | P1 | ⬜ |

Implementation of A1–A5/A10 should begin only after this architecture is accepted as the working baseline.

---

## 23. Change-Control Rules

Before changing a shared component or infrastructure boundary, answer:

1. Which features consume it?
2. Does the change alter routing, authorization, persistence, or workflow behavior?
3. Is there a compatibility requirement?
4. Can the change be introduced behind the existing API?
5. What exact verification will prove no regression?

Do not combine architecture extraction with redesign in the same change when the separation can be preserved.

---

## 24. Phase 1 Quality Gate

Phase 1 architecture is considered defined when:

- [x] Target folder architecture is documented.
- [x] Feature boundaries are documented.
- [x] Route ownership is documented.
- [x] Canonical route registry design is documented.
- [x] State/query boundaries are documented.
- [x] API/repository boundaries are documented.
- [x] Loading architecture is documented.
- [x] Error architecture is documented.
- [x] Shared UI ownership is documented.
- [x] `App.tsx` reduction path is documented.
- [x] Migration avoids a full rewrite.
- [ ] Source migration implemented and verified.
- [ ] Build passes.
- [ ] Typecheck passes.
- [ ] Lint passes, if introduced/available.
- [ ] Existing routes verified.
- [ ] Existing operational workflows verified.

The unchecked items belong to the implementation gate, not the architecture-definition gate.

---

## 25. Decision Summary

KEMEX will evolve toward a **feature-oriented layered frontend** with:

- one typed route/metadata registry
- one permission capability model
- feature-owned React Query data hooks
- repository-based persistence adapters
- `shared/ui` as the canonical UI boundary
- explicit global/route/feature loading states
- explicit application/query/mutation/domain error boundaries
- progressively smaller `App.tsx`
- specialized operational workflows for high-value domains
- generic CRUD retained only where it remains appropriate

The architecture intentionally preserves the existing business implementation while creating safe seams for later migration.

**Next phase:** Phase 2 — Design System, after the Phase 1 implementation gate is verified.
