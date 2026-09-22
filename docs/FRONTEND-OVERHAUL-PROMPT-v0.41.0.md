# KEMEX v0.41.0 — Master Frontend Architecture Prompt

## Objective
Transform KEMEX into a clean Arabic enterprise operations product with a single global top header/navigation system, compact workspace selectors, and decision-oriented analytics.

## Reference Findings
The reference screenshots establish the following information architecture:
- One persistent top header containing product identity, one horizontal global navbar, notifications, user identity and logout.
- No persistent desktop sidebar.
- Workspace/module navigation is contextual and must not become a second horizontal navigation bar.
- Contextual choices are exposed through a compact dropdown selector.
- Cards are dense, aligned, restrained and information-first.
- The dashboard is a command center, not a collection of decorative KPI boxes.
- Reports are a workbench: choose one report, filter it, see KPIs/visual analysis and the detailed result on the same screen.

## Navigation Architecture
1. Global Top Header: persistent.
2. Global Top Navbar: one only.
3. Module/workspace selector: compact dropdown inside page content; never render tab strips as a second nav bar.
4. Mobile: top navbar with menu overlay is acceptable; no persistent sidebar.

## Workspace Selector Requirements
Replace `workspace-tabs` with:
- current workspace label
- concise description
- `select` control for the workspace's child modules
- active selection preserved when route changes
- keyboard accessible
- no duplicate visual header

## Reports Requirements
Remove the grid of all report cards.
Use one compact report selector with the selected report title/description and report ID/count.
Filters remain visible directly below it.
Changing the report or filter updates the result immediately.
Do not require a Run button.
Keep print and CSV export.
Keep detailed DataTable.

## Dashboard Requirements
Use an executive rhythm:
- KPI layer
- cost/fuel trend
- fleet status distribution
- project allocation
- utilization versus downtime
- alerts/actions
- latest work orders

KPI cards must have:
- clear label
- compact icon
- large value
- meaningful supporting metric
- no text collision
- no excessive empty space

Charts must be data-backed. When data is absent or all zero, render an intentional empty state rather than a flat, misleading chart.

## Visual Language
- Arabic-first typography using Cairo/Tajawal fallbacks.
- neutral slate page background
- white surfaces
- restrained teal primary
- semantic status colors
- subtle borders
- almost-flat shadows
- 8–14px control/card radii
- strong hierarchy and high data density
- no decorative gradients unless materially useful

## Regression Rules
Do not change:
- Supabase contracts
- RLS
- authentication semantics
- permissions
- route names
- business calculations
- database schema
- production data
- existing CRUD/workflow behavior

## Implementation Order
1. Inspect Layout and all workspace wrappers.
2. Remove duplicate workspace nav strips.
3. Introduce compact workspace dropdowns.
4. Redesign MetricCard.
5. Improve chart empty states.
6. Convert report picker to single selector.
7. Consolidate CSS precedence in the final override layer.
8. Validate all route transitions, especially routes that reuse the same workspace component with a different `initialTab`.
9. Run TypeScript and Vite production build in Node 24 environment.
10. Perform browser QA at desktop/tablet/mobile widths.

## Acceptance Criteria
- One top header/navigation only.
- No desktop sidebar.
- No second workspace tab bar.
- Reports do not show all report cards simultaneously.
- Report choice is one dropdown.
- Dashboard KPI cards have no clipping/overlap.
- Zero-data charts have intentional empty states.
- Workspace selectors update correctly when navigating between routes.
- Existing data and workflow behavior remains intact.
