# KEMEX Frontend Design System — Phase 2

## Sprint outcome

Phase 2 establishes one canonical visual contract for the existing application without rewriting feature modules. The canonical stylesheet is `src/shared/ui/design-system.css`.

## Tokens

The system defines semantic color, typography, spacing, radius, elevation, focus-ring, and legacy compatibility aliases. Existing `--tfms-*`, `--ui-*`, `--ref-*`, and `--modal-*` names are mapped to the canonical token set so existing features do not need a breaking rename.

## Shared surfaces

Canonical styling covers page headers, buttons, icon buttons, form fields, cards, panels, metrics, tables, filters, status badges, tabs, empty states, skeletons, modals, toasts, and density helpers.

## Responsive behavior

Desktop, tablet, and mobile layouts use the same information architecture while changing density and presentation. Complex tables switch to mobile presentation instead of simply shrinking the desktop table.

## RTL

Shared positioning uses logical CSS properties (`margin-inline`, `padding-inline`, `inset-inline`, etc.) and includes explicit LTR support for global toast placement.

## Compatibility strategy

The legacy style files remain temporarily because they contain feature-specific selectors. Their token declarations were removed, and the canonical design system is loaded last from `src/main.tsx` so shared primitives have one visual source of truth. Feature-specific styling can be retired progressively in later migrations.

## Quality gate

Static source checks and route parity must remain green. Runtime build/typecheck still depends on the repository's required Node 24+ environment and a complete dependency installation.
