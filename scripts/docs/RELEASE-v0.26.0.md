# KEMEX v0.26.0 — Architecture Foundation

## Implemented

- Added a typed repository contract shared by production and local adapters.
- Added a clean LocalStorage adapter with an empty initial dataset; no mock/seed records.
- Added adapter selection through `VITE_DATA_MODE`, defaulting to Supabase.
- Added TanStack React Query 5.103.2 for server-state caching and refetching.
- Added central AuthProvider and ThemeProvider boundaries.
- Moved the application bootstrap load into a cached React Query hook.
- Write operations invalidate the active bootstrap query rather than keeping duplicated remote copies in App state.
- Preserved the existing page APIs so the feature migration can continue incrementally without a large breaking rewrite.

## Validation

- TypeScript/TSX parser check: 0 syntax errors.
- Relative import resolution check: 0 missing imports.
- Full production build was not executed in this environment because package installation is unavailable here; Vercel should perform the authoritative `npm install` and `npm run build`.
