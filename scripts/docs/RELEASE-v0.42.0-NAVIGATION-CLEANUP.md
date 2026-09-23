# KEMEX v0.42.0
## Navigation Cleanup & Report Routing

### Changed

- removed workspace context header from WorkspacesPage
- removed workspace tabs from WorkspacesPage
- workspace content now follows the route directly
- navbar brand no longer repeats current page title
- added report mega dropdown to the global navbar
- added child routes for every report
- routed `reports/*` to ReportsPage while preserving report permissions
- removed report catalog grid from ReportsPage
- removed duplicate report selector from page body
- kept live filters, KPIs, charts, and detailed table
- preserved top navbar architecture and explicitly avoided desktop sidebar
- removed accidental duplicate project/fuel rendering from Operations workspace

### Validation

Static checks were run against the modified source tree.

Full TypeScript/build validation remains environment-blocked by missing npm dependencies in the prepared runtime and its Node 22 runtime versus the project's Node >=24 requirement.
