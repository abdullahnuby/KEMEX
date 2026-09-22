# KEMEX v0.45.0 — Modal System Overhaul

## Implemented

- Unified modal overlay now uses viewport-level stacking above the sticky navbar.
- Header/body/footer layout is enforced globally.
- Long form content scrolls within the modal body.
- Footer actions remain fixed within the modal surface.
- Desktop dialogs use a centered enterprise layout.
- Mobile dialogs adapt to a bottom-sheet style surface.
- Transport, Cost and Downtime forms were reorganized into meaningful sections.
- Modal titles were simplified to avoid repeated page context.
- Modal action buttons are constrained to single-line layouts.
- Accessibility dialog semantics were added to the three maintenance forms touched in this release.
- Package/config versions were aligned to 0.45.0 so source verification remains consistent.

## Explicitly preserved

- Database schema
- Supabase contracts
- Business logic
- Routes
- Permissions / RLS
- Save and validation behavior
