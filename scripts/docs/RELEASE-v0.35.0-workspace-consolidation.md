# KEMEX v0.35.0 — Workspace Consolidation

## What changed

- Top navigation now exposes business workspaces instead of individual CRUD pages.
- Fleet is separated from Maintenance.
- Operations is separated from Transport. Transport remains under `trips` and is labelled **النقل**.
- Inventory is separated from Finance. Inventory and Purchasing share the Inventory workspace.
- Finance contains costs, internal charging, invoices and customers.
- Administration contains Users, Audit and Settings.
- User administration keeps the temporary-password / forced-first-change flow already present in the project.
- Legacy routes remain supported so saved links can still resolve.

## Verification

- Parsed TS/TSX source files with TypeScript compiler API: no syntax diagnostics.
- Full `npm run build` was not confirmed because the runtime dependency tree in the working environment is incomplete.
- Supabase schema changes are preserved in `supabase/migrations/016_user_password_first_login.sql`.
- The Auth admin Edge Function source is preserved at `supabase/functions/admin-create-user/index.ts`; deployment to Supabase still requires the project's Edge Functions deployment step.
