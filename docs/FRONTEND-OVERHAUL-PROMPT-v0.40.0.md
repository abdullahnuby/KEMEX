# KEMEX v0.40.0 — Analytics-First Frontend Engineering Prompt

## Mission
Transform KEMEX Dashboard and Reports from presentation-only screens into an analytics-first fleet operations interface while preserving all existing business rules, routes, Supabase data flows, and top-navbar navigation.

## Non-negotiables
- Desktop navigation remains a top Navbar. Never introduce a persistent sidebar.
- Never replace real Supabase-derived data with mock values.
- Never delete existing reports, filters, routes, permissions, or business behavior.
- Charts must derive from the same data already used by the page/report.
- Report results must update immediately when a report or filter changes; no "select → scroll → run" workflow.

## Dashboard requirements
1. First viewport must communicate operational state immediately.
2. Show six meaningful KPIs.
3. Show at least two analytical visualizations in the primary viewport.
4. Include a 6-month cost/fuel trend.
5. Include fleet status distribution.
6. Include project asset distribution.
7. Include utilization vs downtime analysis when operation data exists.
8. Keep alerts and recent work orders below the analytical layer.
9. Every chart must have a useful title and a business interpretation, not decorative labels.

## Reports requirements
1. Build one Report Workbench containing report selection, filters, live KPIs, and analytical summary.
2. Report selection must not require a second distant action.
3. Remove the mandatory "Run Report" step.
4. Changing filters recomputes the result immediately.
5. Show at least one analytical visualization for every report type where numerical data is available.
6. Prefer cost/fuel/value/hours metrics over arbitrary numeric columns.
7. Use a status distribution visualization when the report exposes a meaningful status column.
8. Preserve detailed tabular results, search, sorting, pagination, printing, and CSV export.

## Visual direction
- Arabic-first enterprise UI.
- White surfaces over cool slate background.
- Restrained teal brand treatment.
- Flat panels, clear borders, very low shadow intensity.
- Compact but readable information density.
- Charts are integrated into the product language; no flashy gradients or decorative dashboards.
- Top Navbar only.

## Architecture
Create reusable analytics primitives instead of duplicating SVG/CSS per page:
- AnalyticsLineChart
- AnalyticsBarChart
- AnalyticsDualBars
- AnalyticsDonut
- ChartShell

Keep data calculation in page-level memoized selectors and keep the chart components presentation-only.

## Verification
Run, in a complete Node 24 environment:
```bash
npm ci
npm run typecheck
npm run build
node scripts/verify-source.mjs
```
Do not claim build success unless the build actually completes.
