# KEMEX v0.46.0 — Actual Trip Modal Portal Fix

## Problem
The modal visible from `#/trips` was not `TransportFormModal.tsx`; it was the local `TransportForm` component inside `TripsPage.tsx`. The previous modal CSS work therefore did not affect the actual dialog shown to the user.

## Required architecture
- Mount the trip-create modal through `createPortal(..., document.body)`.
- Make the portal layer viewport-level and independent from page/layout stacking contexts.
- Ensure the backdrop covers the navbar and all page content.
- Keep the dialog scrollable internally while header and footer remain visible.
- Lock body scrolling while the modal is open.
- Preserve all existing trip creation fields, payload mapping, and Supabase/service behavior.
- Do not alter routes or business rules.

## Acceptance criteria
1. Clicking “نقل جديد” dims the complete viewport, including the top navbar.
2. The dialog is centered relative to the viewport, not the page content.
3. No ancestor stacking context can trap the backdrop.
4. Header, body, and footer behave as one modal surface.
5. Dialog body scrolls internally on small screens.
6. Closing by backdrop or close button preserves the existing save/cancel semantics.
