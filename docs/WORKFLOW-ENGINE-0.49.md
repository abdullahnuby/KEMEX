# KEMEX 0.49.0 — Workflow Engine

## Scope
This release centralizes critical lifecycle rules for Transportation, Maintenance, Purchases and Invoices.

## Enforced domains
- Transportation: draft → assigned → dispatched → in_transit → delivered → received → invoiced → paid; cancellation only before receipt.
- Maintenance: prevents arbitrary status jumps for existing work orders.
- Purchases: request → approval → purchase order → partial/full receipt.
- Supplier invoices: registered → review → approved → posted → paid.
- Customer invoices: registered → review → approved → collected.

## Defense in depth
- UI/action logic remains responsible for user experience and role permissions.
- Application workflow engine rejects invalid transitions.
- PostgreSQL trigger independently protects the Trips lifecycle.

## Important
Generic module records are JSONB, so purchase/invoice transition rules are application-enforced in this release. A future normalized workflow table can make them database-enforced after schema migration.
