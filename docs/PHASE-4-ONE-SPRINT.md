# Phase 4 — UX Architecture — One Sprint

## Objective

Convert the product navigation and detail screens from screen-oriented CRUD presentation into operational workflows. The sprint focuses on the three workflows specified by the master architecture: vehicle lifecycle, maintenance, and transportation.

## Implemented

- Shared operational workflow timeline primitive.
- Shared next-action card primitive.
- Vehicle lifecycle timeline on asset details.
- Maintenance lifecycle timeline replacing the old generic status presentation on breakdown details.
- Maintenance next-action guidance tied to work-order linkage, downtime and closure.
- Transportation lifecycle timeline on trip details.
- Transportation next-action guidance tied to dispatch, receipt, billing and completion.
- Generic workflow-enabled modules now expose an operational queue summary: total records, pending records and records with an available action for the current role.
- Responsive workflow timelines become horizontally scrollable on smaller screens instead of compressing unreadable labels.
- No backend, schema or URL changes.

## Workflow mapping

### Vehicle lifecycle

Registration → Assignment → Operation → Inspection → Maintenance → Cost → History

### Maintenance

Issue → Diagnosis → Transport → Repair → Return → Completion

The existing breakdown domain keeps its granular statuses; the UI maps them to these operational stages.

### Transportation

Request → Assignment → Driver → Vehicle → Trip → Completion → Cost → History

The existing trip state machine remains authoritative; the UI maps the stored status to the workflow stage.

## Regression safeguards

- Existing route registry remains authoritative.
- Existing business mutations and status transitions are reused.
- No seeded/fake workflow data introduced.
- Existing RTL direction is preserved.
- Existing detail tabs remain available underneath the workflow layer.
