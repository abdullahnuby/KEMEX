# Phase 3 — Application Shell One Sprint

Status: **Implemented**

## Scope

Application shell only: navbar, domain navigation, breadcrumbs, notifications, user menu, global search, and responsive navigation.

## Changes

- Reworked `src/components/Layout.tsx` into a shell composition boundary.
- Added reusable shell popovers.
- Added route-aware breadcrumbs.
- Added route-pattern matching to `routeRegistry.ts`.
- Added role-aware global search over canonical navigation metadata.
- Added `Ctrl/Cmd + K` search shortcut and `Escape` dismissal.
- Added notification popover backed only by the existing alert count.
- Added user menu with existing password-change and logout flows.
- Added independent mobile navigation presentation.
- Added canonical Phase 3 shell styles to `src/shared/ui/design-system.css`.
- Extended `scripts/verify-source.mjs` with Phase 3 shell integrity checks.

## Non-goals

- No business module rewrite.
- No route URL changes.
- No new state-management library.
- No backend/API changes.
- No sidebar reintroduction.
- No fake notification/search data.

## Verification

Static source verification: **PASS**.

Route parity: **38/38**.

Runtime build/typecheck: **environment-blocked** because the available runtime is Node 22 while the project contract requires Node 24+, and dependency installation timed out.
