# KEMEX v0.39.0 — Master Engineering Prompt

## Mission
Transform the existing KEMEX frontend into a materially different, production-grade Arabic enterprise application. The supplied project-management and asset-detail screenshots are the visual reference baseline. The target is not a generic SaaS theme and not a decorative redesign.

## Non-negotiables
- Preserve the top Navbar architecture. Never introduce a permanent desktop Sidebar.
- Preserve routing, Supabase contracts, RLS expectations, permissions, business calculations, CRUD flows, and existing production data.
- Do not fake data or remove modules to make screens look cleaner.
- Use Arabic RTL as the primary design language.

## Reference visual language
- App background: approximately `#eef2f6`.
- Surfaces: white.
- Borders: `#e2e8f0` family.
- Main text: `#0f172a`; secondary text: `#334155`; muted text: `#64748b`.
- Primary action: `#0e7490` with restrained hover state.
- Status colors follow semantic green / amber / red / blue / neutral mappings.
- Shadows are minimal: mostly `0 1px 2px rgba(...)`; hierarchy comes from spacing, borders and typography.
- Radius around 8–14px; avoid oversized pills and excessive rounding.
- Typography should be compact, readable Arabic using Cairo/Tajawal.

## Navbar
Use a 60px-class top navbar. The right side communicates KEMEX and the current screen context. The center carries business-domain navigation through compact dropdowns. The left side holds notifications, user identity, and logout. On mobile, collapse to a menu panel; do not create a desktop sidebar.

## Global page shell
Every screen follows: Navbar → page title/description → contextual actions → primary surfaces. Use full-width desktop utilization with 20–26px page padding. Avoid ornamental title underlines and oversized hero blocks.

## Cards
Cards are flat white surfaces with 1px slate borders. Card headers use a consistent divider. Content uses structured rows and whitespace rather than decorative icons everywhere.

## Project registry reference
Project cards must resemble the supplied reference: two-column desktop grid, project name in the header, compact secondary code, action/status controls at the header edge, then an inner light-gray dashed detail surface. Detail rows use a label/value structure. Mobile becomes one column.

## Asset detail reference
Asset detail must resemble the supplied reference: page title first, status/meta line, compact actions, then a white tab strip with a solid teal active tab. The active overview contains a white panel with a header, optional compact financial summary, and a large light-gray dashed detail surface containing label/value rows. Do not use oversized decorative hero cards.

## Shared primitives
Normalize Button, IconButton, PageHeader, Card, MetricCard, DataTable, FilterBar, StatusBadge, EmptyState, DetailTabs, forms, modals, and workspace tabs. One component should have one visual language everywhere.

## DataTable
Keep search, filters, sorting, pagination and mobile cards. Use a light header row, clean separators, readable cell density, and subtle hover. Numeric values should use tabular numerals.

## Forms
Use clear section headers, aligned labels, consistent 40px controls, semantic error states, and a stable action footer. No business rules are changed.

## Responsive
Desktop is the primary operations workspace; tablet reflows grids; mobile becomes a distinct compact layout. Prevent horizontal overflow except intentionally scrollable tab/table surfaces.

## CSS engineering
The project already contains several historical style layers. Do not add another uncontrolled collection of overrides. Consolidate the final visual behavior in one final reference layer loaded last. Remove duplicate Tailwind directives or duplicated visual definitions when touching the owning file.

## Verification
Run source-integrity validation, TypeScript parsing/type verification where dependencies permit, CSS parsing, and the production Vite build. Never claim the production build passed unless it was actually executed successfully.

## Completion standard
The user should be able to compare KEMEX side-by-side with the supplied screenshots and see a clear visual-system change across the whole product: cleaner shell, calmer surfaces, stronger hierarchy, structured cards/details, better density, and consistent interactions — while still retaining the top Navbar and all existing functionality.
