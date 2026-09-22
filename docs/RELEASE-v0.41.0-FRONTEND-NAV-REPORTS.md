# KEMEX v0.41.0 — Frontend Navigation & Reports Release

## Scope
This release specifically fixes three high-impact UX issues identified from live browser screenshots:
1. duplicate workspace navigation
2. report-page overload
3. weak KPI presentation on the dashboard

## Result
- Global top navbar remains the only persistent navigation.
- Workspace tabs are replaced by a contextual dropdown.
- Reports use a single compact report selector.
- KPI cards have stronger hierarchy and dashboard-specific sizing.
- Empty charts are intentional rather than misleading.
- Existing data/business logic is preserved.

## Build status
Not claimed as production-built in this environment. Node 24 and dependency installation are required for final CI verification.
