# Sprint 08-09 — Navigation & Form System Upgrade

## Scope
- Remove duplicate alerts navigation item; notifications are accessed from the bell beside the user.
- Upgrade the shared form system and enrich creation/edit forms across generic modules.
- Expand specialized forms for assets, projects, maintenance, fuel, oil/filter changes, tires, inventory, purchases, invoices, customers, settings and users.
- Preserve business workflows and existing data model semantics; new fields use existing generic record metadata where the remote schema is generic.

## Completed
- [x] Alerts tab removed from desktop/mobile navigation while bell remains the single entry point.
- [x] Generic module forms expanded with sections, help text, placeholders and business fields.
- [x] Asset form expanded into identity, specification, ownership/status, cost, links, documents and notes.
- [x] Project form expanded into identity, management/location, contract, budget/progress and notes.
- [x] Maintenance / work-order form expanded with plan, diagnosis, materials, warranty and approval notes.
- [x] Fuel form expanded with movement type, asset/project/tank, meter, station, supplier, invoice and notes.
- [x] Oil/filter change form grouped into plan, execution, meter, cost and notes.
- [x] Tire form expanded with serial, supplier, warranty and notes; action form uses premium modal styling.
- [x] Inventory item form expanded with storage, barcode, min/max/reorder, lead time, costs, opening balance and notes.
- [x] Purchase request and PO forms expanded with category, need date, warehouse, reason, budget, quotations, payment terms, delivery and supplier data.
- [x] Invoice form expanded with due date, description, account, discount, paid, payment method and remaining amount calculation.
- [x] Customer form expanded with code, contact, email, address, tax, payment terms, credit limit, account owner and status.
- [x] Settings form reorganized into company identity, prices/tax and alert rules.
- [x] User edit form upgraded with username, display name, role and account status.
- [x] Source integrity check passes.

## Deferred by user request
- TypeScript full build.
- Production build.
- Browser visual QA.
- Supabase/RLS integration testing.
