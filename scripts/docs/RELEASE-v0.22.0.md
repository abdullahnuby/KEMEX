# TFMS v0.22.0

## Sprint 08-09
Navigation cleanup and full form-system upgrade.

### Highlights
- Alerts are no longer duplicated as a navigation tab; the bell beside the user is the single alerts entry point.
- Generic forms are now sectioned and substantially richer.
- Specialized forms were expanded for core operating, maintenance, inventory, purchasing, financial and administration screens.
- Project/asset references remain human-readable first with codes/IDs secondary.
- Form modals use the shared premium form system.

### Verification
- `node scripts/verify-source.mjs`: PASS
- ZIP integrity: PASS
- Full typecheck/build/browser/Supabase QA: deferred and not represented as passed.
