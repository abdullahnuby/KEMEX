KEMEX build fix

Fixes TS2322 in src/pages/DashboardPage.tsx by replacing invalid StatusBadge tone "green" with the supported tone "emerald".

Apply this one-line patch to the current main branch. No Supabase, routing, or data logic changes.
