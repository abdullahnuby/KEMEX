# Sprint 05 follow-up — Remote session validation gate

## Change
- The app now waits for remote `getCurrentUser()` validation before rendering the login/application branch. This prevents a cached local identity from being displayed as authenticated while the remote profile check is still pending.
- Demo/local mode marks validation complete immediately and retains the existing local login flow.
- No database schema or RLS policy was changed.
- Version: 0.11.4.

## Verification
- Source integrity script: pending execution in this package.
- TypeScript/build: not verified; project dependencies are not installed in `node_modules`.
- Live Supabase authentication and RLS: not tested; no live environment credentials/configuration were used.
