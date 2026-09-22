# KEMEX v0.46.0 — Actual Trip Modal Fix

Fixed the root cause of the visible “نقل جديد” modal issue.

## Root cause
The visible modal came from `TransportForm` inside `TripsPage.tsx`, not from the reusable `TransportFormModal` component modified in v0.45. The prior change therefore could not affect the screenshot the user was seeing.

## Implementation
- Added `src/components/ui/ModalPortal.tsx` using React DOM `createPortal`.
- Updated `TripsPage.tsx` so `TransportForm` renders through the portal.
- Added viewport-level modal layer with maximum z-index.
- Added body scroll locking while open.
- Reworked the actual trip-create modal into the common modal surface with a fixed header, internal scrolling body, and fixed action footer.
- Preserved the existing trip creation payload and service call.

## Verification
- Source-level JSX/TypeScript syntax was parsed successfully after the edit.
- Full typecheck/build was not claimed because the working archive does not contain installed project dependencies.
