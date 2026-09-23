# KEMEX v0.36.0 — Operational Workspace Consolidation

## Delivered
- Unified direct legacy routes into their owning workspaces so users no longer encounter duplicate standalone screens for the same domain.
- Expanded asset detail into a single operational context that includes transport history alongside operations, fuel, maintenance, tires, costs, documents and audit.
- Expanded project detail into a cross-functional context for assets, operations, maintenance, transport and finance.
- Added driver/operator performance report to the centralized report center.
- Linked purchase receiving to the existing atomic inventory posting flow: receiving a PO now creates a stock receipt movement and updates received quantity/status on the purchase record.
- Preserved EGP as the default organization currency and left currency changes under Settings.
- Preserved the first-login password-change gate and the Admin Users workspace.

## Verification
- Source syntax was checked with the TypeScript compiler parser.
- Full `npm ci` / production build could not be completed in the execution environment because dependency installation timed out.
- Supabase database changes from the earlier authentication milestone remain applied; no destructive schema changes were introduced in this UI consolidation batch.
