# KEMEX Application Shell — Phase 3

## Sprint outcome

Phase 3 establishes one operational application shell around the existing route architecture. URLs, route ownership, permission rules, business pages, repository contracts, and role visibility remain unchanged.

## Shell ownership

`src/components/Layout.tsx` remains the composition boundary, while reusable shell surfaces are separated under `src/components/shell/`:

- `Breadcrumbs.tsx` — route-aware context trail.
- `ShellPopovers.tsx` — global search, notifications, and user menu surfaces.
- `index.ts` — shell barrel export.

## Navigation

Desktop navigation is domain-based and consumes the existing `NAVIGATION_GROUPS` and `REPORT_NAV_ITEMS` configuration. No second navigation data source was introduced.

The mobile experience is independently structured as grouped navigation rather than a visually shrunken desktop navbar. It includes account actions and a dedicated module search field.

## Global search

Global search searches only modules already visible to the authenticated role. Results are sourced from the canonical navigation configuration and route to the existing application paths. `Ctrl/Cmd + K` opens the search surface and `Escape` closes it.

No fake records or backend search responses were introduced.

## Notifications

The header notification control uses the existing `alertCount` supplied by the application. When alerts exist, the shell provides a direct path to the existing alerts center. When the count is zero, the shell shows an explicit empty state rather than fabricated notifications.

## User menu

The user menu exposes the current authenticated identity, role label, password-change route, and the existing logout handler.

## Breadcrumbs

Breadcrumbs use route metadata from `routeRegistry.ts` and a route-pattern matcher for dynamic pages. They do not invent page titles from component-local strings.

## Responsive behavior

- Desktop: domain dropdown navigation remains available.
- Tablet: navigation collapses before horizontal crowding becomes a usability problem.
- Mobile: a dedicated menu panel, grouped navigation, account actions, and module search are used.
- The shell uses logical properties for RTL-first layout behavior.

## Design-system integration

Canonical shell selectors are implemented in `src/shared/ui/design-system.css`, which is loaded after legacy style layers. This prevents feature-level CSS from becoming a second source of truth for the application shell.

## Verification

The source verifier confirms:

- route parity remains 39/39;
- no duplicate route declarations exist;
- Phase 1 architecture boundaries remain present;
- Phase 3 shell files exist;
- required shell selectors exist in the canonical design system.

Runtime build/typecheck still requires the repository's Node 24+ dependency environment.
