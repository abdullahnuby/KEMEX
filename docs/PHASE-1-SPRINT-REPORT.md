# KEMEX — Phase 1 Architecture Sprint Report

**Sprint date:** 2026-09-23
**Version baseline:** 0.46.0
**Scope:** Complete the executable portion of Phase 1 in one controlled sprint.

## Sprint objective

Move the frontend toward the documented feature-oriented layered architecture without a full rewrite, preserving existing route URLs and business workflows.

## Delivered

| Area | Result |
|---|---|
| Route registry | ✅ Canonical registry + route parity check |
| Route rendering | ✅ Extracted from `App.tsx` into `AppRoutes.tsx` |
| Permission boundary | ✅ Central `RouteGuard` + canonical permission source |
| Navigation permission aliases | ✅ Explicit `permissionModule` metadata |
| Query keys | ✅ Domain-oriented key factory |
| Data loading | ✅ Domain query boundaries + partial failure preservation |
| Bootstrap | ✅ Compatibility composition facade |
| Mutations | ✅ Extracted into `useKemexMutations` |
| Query invalidation | ✅ Centralized |
| Session cache clearing | ✅ Centralized |
| Source verification | ✅ Rewritten for current architecture |
| App composition | ✅ Reduced to orchestration |

## Changed files

```text
src/App.tsx
src/app/query/queryKeys.ts
src/app/routing/AppRoutes.tsx
src/app/routing/RouteGuard.tsx
src/app/routing/routeRegistry.ts
src/components/Layout.tsx
src/config/app.ts
src/config/modules.ts
src/features/app/hooks/useKemexBootstrap.ts
src/features/app/hooks/useKemexDomainQueries.ts
src/features/app/hooks/useKemexMutations.ts
scripts/verify-source.mjs
docs/frontend-architecture.md
docs/PHASE-1-SPRINT-REPORT.md
```

## Static verification

```text
KEMEX architecture integrity: OK
Version: 0.46.0
Route parity: 38/38
SYNTAX_CHECK=PASS (9 affected TS/TSX files)
Duplicate routes: none
Missing registered routes: none
Unregistered rendered routes: none
```

## Quality gate status

### Passed

- Architecture extraction is non-breaking at the routing contract level.
- Current route set remains 1:1 with the canonical registry.
- Business mutation logic is outside `App.tsx`.
- Data access continues to flow through repository/services rather than direct page-level Supabase access.
- Partial data-load behavior is preserved using `Promise.allSettled` inside grouped domain queries and isolated queries for independent domains.

### Blocked by environment

- Full production build.
- Full TypeScript typecheck.
- Runtime browser regression suite.
- Lint command because no project lint script is present.

The provided environment uses Node 22.16.0, while the project declares Node >=24, and dependency installation did not complete successfully.

## Architecture decision

Phase 1 implementation is **code-complete for the planned one-sprint extraction**, with the runtime build/typecheck gate awaiting a Node 24 + complete dependency environment. Phase 2 should not be used to hide or bypass that gate; it should begin from this architecture baseline while the runtime gate is re-verified in CI/local Node 24.
