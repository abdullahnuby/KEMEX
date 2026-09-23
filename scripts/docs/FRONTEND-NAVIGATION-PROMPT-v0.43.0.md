# KEMEX v0.43.0 — Navigation Engineering Prompt

You are a Senior Frontend Architect. Correct the navigation regression while preserving the visual overhaul.

## Non-negotiable information architecture
- Exactly one global Top Navbar.
- No desktop sidebar.
- No secondary workspace header.
- No workspace tabs/nav strip inside pages.
- Every business-domain item in the global navbar is a dropdown.
- The dropdown contains the child screens that previously existed under that domain.
- The page body contains only the current page content and one concise page header.
- Reports are selected from the Reports dropdown in the navbar; the Reports page must not show a second report-picker.

## Canonical navigation source
Do NOT infer child screens from a legacy top-level `MODULES` array.
Create a dedicated `NAVIGATION_GROUPS` configuration where each group explicitly declares its items and routes.

## Required groups
- الأسطول
- الصيانة
- التشغيل
- النقل
- المخازن
- المالية
- التقارير
- الإدارة

## Existing routes that must remain discoverable
assets, drivers, contracts, maintenance, breakdowns, plans, oils, tires, operations, requests, assignments, fuel, projects, trips, trips/dispatch, inventory, purchases, costs, charging, invoices, customers, reports/*, true-cost, users, audit, settings.

## Permissions
Use the real module permission key for each child item. Aliases are allowed where needed, e.g. `trips/dispatch` uses the `trips` permission.

## UX
Dropdowns should open from the tab name, use sections when helpful, show an icon + title + short hint, highlight the active child route, close after navigation, and close when clicking outside.

## Reporting
The reports dropdown contains the full report catalog. The Reports page begins with the selected report identity, then filters, KPIs, analytics, and detailed results. Do not repeat the same title in three stacked headers.

## Validation
Run TypeScript validation and ensure every navigation item maps to an existing App route. Do not remove or replace existing pages to simplify navigation.
