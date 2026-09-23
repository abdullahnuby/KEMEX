# KEMEX v0.49.0 — Enterprise Workflow Hardening

## Implemented

### 1. Canonical Workflow Engine
Added `src/shared/workflows/workflowEngine.ts` as the single application-level transition authority for:
- Maintenance work orders
- Transportation trips
- Purchase requests
- Supplier invoices
- Customer invoices

The engine supports transition validation and rejects arbitrary status jumps.

### 2. Maintenance
Existing work-order transitions are now validated before persistence:
- بانتظار الاعتماد → مفتوح / ملغى
- مفتوح → قيد التنفيذ / ملغى
- قيد التنفيذ → بانتظار قطع غيار / مكتمل
- بانتظار قطع غيار → قيد التنفيذ / مكتمل

### 3. Transportation
The existing trip state machine is now enforced inside `tripsService` rather than being only a UI convention.
Additional rules:
- invoicing requires an invoice reference
- a trip must be billable
- a trip must reach `received` before invoicing

### 4. Database Defense in Depth
Added `supabase/migrations/021_workflow_integrity.sql` with a PostgreSQL trigger protecting trip lifecycle transitions independently of the frontend.

### 5. Purchases & Invoices
Generic JSONB module records now use the canonical workflow engine during `saveModule`, preventing unauthorized status jumps for purchase and invoice records.

## Validation
- `npm run verify:source` — PASS
- `npm run test:source` — PASS
- Full TypeScript/Vite build could not be executed in this environment because dependencies are not installed and the project requires Node >=24.

## Scope discipline
No new business module was introduced. No data deletion or destructive migration was performed.
