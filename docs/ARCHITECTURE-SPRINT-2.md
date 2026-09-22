# KEMEX Sprint 2 — Architecture Foundation

## Data adapters

`src/core/repository/types.ts` defines the stable repository contract.

`src/services/repository.ts` remains the Supabase implementation.

`src/services/localRepository.ts` provides a clean LocalStorage adapter with an **empty initial dataset**. No mock records are inserted.

`VITE_DATA_MODE=supabase` is the production default. `VITE_DATA_MODE=local` selects LocalStorage for development-only work.

Local mode accepts `VITE_LOCAL_ADMIN_EMAIL` as its only login identity; the password parameter is intentionally ignored because this adapter is not an authentication system.

## Server state

TanStack React Query owns the application bootstrap cache using:

`['kemex', 'bootstrap', userId]`

Default policy: 30s stale time, 5m garbage collection, one retry, and window-focus refetch.

All write handlers invalidate the active user's bootstrap query instead of maintaining duplicated page-level copies of remote state.

## Authentication and theme

`AuthProvider` owns the session lifecycle and `ThemeProvider` owns the UI theme/direction boundary.

The current feature pages can continue to consume their existing props while later sprints migrate each feature to colocated query/mutation hooks.
