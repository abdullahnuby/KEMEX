# Phase 19 — Typography Normalization

## Objective

Unify KEMEX typography so Arabic text remains readable and consistent across the shell, dashboard, tables, cards, forms, dialogs, and mobile layouts.

## Canonical scale

- 12px: metadata / compact secondary text
- 13.5px: secondary UI and navigation
- 14px: labels, controls, table content
- 15px: body and form values
- 17px: section/card titles
- 20–24px: prominent values/headings
- 24–30px: page titles

## Rules

- IBM Plex Sans Arabic remains the primary UI font.
- Historical 8–12px body-copy declarations no longer control primary application content.
- Mobile keeps the same hierarchy rather than shrinking all copy.
- Table values and form controls use readable minimum sizes.
- Numeric/reference fields keep the existing LTR/RTL rules.
- No business logic, routes, permissions, or data contracts are changed.
