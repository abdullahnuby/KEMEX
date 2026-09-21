# TFMS v0.15.0

Sprint 08-02: Enterprise visual polish and reference integrity.

- UI typography moved to IBM Plex Sans Arabic with Cairo fallback.
- Navbar, dropdowns, buttons, tables, forms, cards and modals visually refined.
- Report workspace styling refined without changing report scope.
- Reference resolver hardened for legacy/ambiguous reference fields.
- Audit and invoice relation columns now resolve known asset/project/etc. IDs to human-readable labels.

Validation performed:
- Source integrity check.
- Archive integrity check.

Deferred by project workflow:
- Full browser QA.
- Full typecheck/build.
- Supabase/RLS runtime QA.
