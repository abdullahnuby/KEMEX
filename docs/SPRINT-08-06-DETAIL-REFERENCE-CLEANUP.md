# Sprint 08-06 — Detail hierarchy + reference leak cleanup

This pass continues Sprint 08 without changing business scope. Detail headers now prefer human-readable fields (name/title/description/item/number/code) over raw record IDs. Work-order editing headers similarly emphasize the human description and keep the ID secondary.

Deferred: full browser QA, typecheck/build, and live Supabase/RLS verification.
