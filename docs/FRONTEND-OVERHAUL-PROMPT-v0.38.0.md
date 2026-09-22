# KEMEX — Master Engineering Prompt: Radical Frontend Overhaul (Navbar, never Sidebar)

You are the lead frontend architect responsible for transforming the existing KEMEX React + TypeScript + Vite application into a premium Arabic-first enterprise operations platform.

## Mission

Perform a radical visual and UX overhaul across the entire frontend so the result looks like a materially different, more mature enterprise product — not a recolored version of the current interface.

The target experience should feel coherent across Dashboard, Fleet, Maintenance, Operations, Inventory, Finance, Reports and Administration.

**Absolute navigation rule:** keep the global navigation as a **top navbar** with grouped dropdown/mega-menu navigation. Do not introduce a left sidebar, right sidebar or persistent vertical navigation rail.

## Non-negotiable safety rules

1. Do not change database schema, SQL, RLS, repository contracts, Supabase behavior, authentication semantics or business calculations.
2. Do not remove routes.
3. Do not rename module keys.
4. Do not fabricate business records or demo transactions.
5. Do not replace working data flows with mock content.
6. Preserve role-based visibility and write permissions.
7. Preserve all existing workflows and route semantics.
8. Preserve Arabic RTL behavior on every screen.
9. Make the UI responsive for desktop, tablet and mobile.
10. Keep the existing data contracts unless a purely visual hook/class is required.

## Existing architecture to respect

- React 19 + TypeScript + Vite.
- Arabic-first RTL.
- Tailwind is already present, but the codebase also contains a semantic shared UI layer and historical CSS layers.
- `src/components/ui` is the preferred canonical component location.
- `src/shared/ui` may remain as compatibility wrappers when required.
- Data remains Supabase-backed through the existing repository/services.

## First step: forensic audit

Before changing code, inspect:

- `src/App.tsx`
- `src/components/Layout.tsx`
- `src/config/app.ts`
- `src/config/modules.ts`
- `src/components/ui/*`
- `src/shared/ui/*`
- `src/styles/global.css`
- `src/shared/ui/design-system.css`
- `src/index.css`
- every file under `src/pages`

Create a mental model of:

- information hierarchy
- navigation hierarchy
- repeated visual patterns
- component ownership
- CSS precedence
- responsive behavior
- modal/form patterns
- table patterns

Identify duplicated or conflicting styles before adding new ones.

## New visual language

Use a restrained premium enterprise direction:

- warm-cool neutral application background
- clean white surfaces
- dark teal/green brand accent
- semantic success/info/warning/danger tones
- medium radius, not childish rounded cards
- subtle shadows instead of heavy floating shadows
- clear borders and separators
- strong Arabic typography hierarchy
- tabular numerals for financial/counting data
- icons as supportive hierarchy, never decoration overload

Recommended token concepts:

- `--ui-bg`
- `--ui-surface`
- `--ui-surface-2`
- `--ui-ink`
- `--ui-muted`
- `--ui-line`
- `--ui-brand`
- `--ui-brand-dark`
- `--ui-brand-soft`
- `--ui-success`
- `--ui-warning`
- `--ui-danger`
- `--ui-info`
- radius scale
- shadow scale

Do not create a rainbow UI. Color should encode meaning, not category noise.

## Typography rules

Typography is one of the main quality upgrades.

- Use `Tajawal` as primary Arabic UI font with `Cairo` fallback.
- Page titles should feel authoritative and readable.
- Body text should not be miniature.
- Navigation text must remain readable at normal laptop widths.
- Secondary metadata can be smaller, but do not push important text into 8–9px ranges.
- Status badges may remain compact, but their labels must remain legible.
- Use consistent weight hierarchy: 500/600 body, 700 labels, 800/900 emphasis.

## Navbar redesign

Keep the navbar at the top.

Desktop requirements:

- brand block at the start
- primary direct navigation where useful
- grouped business-domain dropdowns for larger module collections
- active route indicator
- clear iconography
- user identity + role
- notification bell with count
- logout action
- no sidebar
- dropdowns should look like intentional mega-menu surfaces, not primitive browser menus
- menus must support Arabic RTL and avoid horizontal overflow

Mobile requirements:

- compact top navbar
- menu button opens a full-width/near-full-width mobile navigation surface
- searchable module navigation
- grouped sections
- user identity and logout inside the mobile surface
- no sidebar

## Page shell

Introduce a consistent shell:

1. sticky global navbar
2. centered content container with controlled max width
3. page header
4. contextual actions
5. primary content surface
6. consistent vertical rhythm

Do not let every page invent its own container width, heading spacing or card shadow.

## Page headers

Standardize page headers using one shared component.

It must support:

- title
- optional description
- optional meta/status
- action area
- responsive wrapping

The header should visually separate the page identity from the operational surface below it.

## Cards

Create one card language:

- consistent border
- consistent radius
- subtle shadow
- predictable header/body treatment
- optional semantic accent
- controlled internal padding

Avoid giant empty card padding.

## KPI / metric cards

Metrics should look like decision-support surfaces, not decoration.

Use:

- label
- large number
- optional secondary detail
- clear icon container
- restrained accent
- tabular numerals

The Dashboard must feel balanced at wide desktop sizes and collapse cleanly on smaller widths.

## Data tables

The shared `DataTable` is a core enterprise primitive.

Preserve its current functionality:

- search
- sorting
- filters
- pagination
- mobile representation
- empty state

Upgrade visual quality:

- cleaner toolbar
- stronger column hierarchy
- clear row separation
- readable references
- restrained hover state
- compact but comfortable action buttons
- sticky/scroll behavior where useful

Do not remove data columns merely to make the UI prettier.

## Forms

Make every form visually deliberate.

Use sectioned form groups with:

- strong section title
- short helper copy
- aligned labels
- consistent control heights
- visible focus states
- meaningful empty/default states
- readable errors
- sticky or clear footer actions in long forms

Do not redesign business meaning; redesign hierarchy and usability.

## Modals

Unify all modals around one visual shell even when some screens still instantiate them directly.

Modal requirements:

- strong header
- clear close control
- scrollable content area for long forms
- sticky action footer when appropriate
- comfortable mobile bottom-sheet behavior
- accessible focus states
- never obscure the primary action hierarchy

## Status system

Create one semantic badge system:

- success
- info
- warning
- danger
- neutral

Keep Arabic status mapping already in the application.

## Workspaces

Workspace tabs are contextual navigation, not global navigation.

They should feel integrated with the main product shell:

- subtle container
- clear active state
- horizontal overflow on mobile
- consistent icon sizing
- concise copy

## Reports

Preserve the report-selection / filter / result workflow.

Improve:

- report choice cards
- KPI hierarchy
- active-filter visibility
- result table density
- print friendliness
- visual distinction between draft/ready states

Do not remove report types or filters.

## Screen coverage requirement

Audit and visually normalize all current frontend surfaces, including at minimum:

- Dashboard
- Assets
- Asset Detail
- Projects
- Project Detail
- Maintenance
- Breakdown List
- Breakdown Detail
- New Breakdown Wizard
- Fuel
- Inventory
- Purchases
- Invoices
- Customers
- Drivers
- Plans
- Oils
- Tires
- Trips
- Trip Detail
- Costs
- Charging
- Reports
- True Cost Report
- Alerts
- Users
- Audit
- Settings
- Assignment Create
- Module Records
- Workspaces
- Login
- Change Password
- Module Placeholder / permission states

## CSS architecture requirement

Do not keep piling overrides onto an already conflicting global stylesheet.

Preferred approach:

1. identify duplicate historical styles
2. establish a single semantic visual layer
3. add component hooks
4. use the final layer as a controlled compatibility bridge
5. remove duplicate Tailwind `@layer/@apply` sections from legacy CSS files where they conflict with the canonical Tailwind entrypoint

Avoid brittle selector hacks wherever a component-level class can solve the same problem.

## Responsive strategy

Desktop is the primary operational target, but mobile must remain usable.

Use breakpoints based on layout pressure, not arbitrary device names.

Rules:

- tables can become cards or horizontal scroll surfaces
- forms can collapse from 2-column to 1-column
- page actions can wrap
- workspace tabs may scroll horizontally
- navbar becomes compact + menu surface
- no horizontal document overflow

## Accessibility

Maintain:

- keyboard-visible focus
- semantic buttons
- labels for form controls
- dialog semantics
- sufficient contrast
- readable hit targets
- `aria-label` for icon-only controls

## Implementation strategy

Phase 1 — baseline:

- inspect files
- identify duplicate style systems
- preserve existing behavior
- establish design tokens

Phase 2 — shell:

- navbar
- app frame
- page container
- typography

Phase 3 — primitives:

- Button
- IconButton
- Card
- MetricCard
- PageHeader
- DataTable
- FilterBar
- StatusBadge
- EmptyState
- FormModal
- ConfirmModal
- DetailTabs

Phase 4 — high-value screens:

- Dashboard
- Assets / Asset Detail
- Maintenance / Breakdown flows
- Inventory
- Trips
- Finance
- Reports

Phase 5 — administrative and auth surfaces:

- Users
- Audit
- Settings
- Login
- Change Password
- permission/placeholder states

Phase 6 — responsive polish:

- mobile nav
- mobile cards
- form collapse
- modal bottom sheets
- workspace tab scrolling

Phase 7 — verification:

- source syntax scan
- typecheck
- production build
- browser visual QA
- route smoke test
- verify no sidebar was introduced
- verify no routes vanished
- verify no data contract changed

## Acceptance criteria

The overhaul is complete only when:

- the app visibly feels like a new premium enterprise product
- the global navigation is still a top navbar, never a sidebar
- visual hierarchy is consistent across all screens
- typography is readable and no important UI relies on tiny 8–9px text
- shared primitives look identical wherever reused
- long forms remain manageable
- tables look like enterprise data surfaces
- mobile navigation works without a sidebar
- current workflows and business logic still work
- source syntax is clean
- production build passes in a dependency-complete environment

## Final reporting format

Return:

1. a concise architecture audit
2. the list of changed files
3. the implemented visual-system changes
4. verification results
5. unresolved environment limitations
6. a full screen-by-screen To-Do showing completed / needs review / not implemented
