# KEMEX v0.24.1 — Responsive navigation fix

## Changes
- Reworked responsive navbar breakpoints: collapse desktop navigation to the menu button before the header runs out of horizontal room.
- Prevented the brand/navigation/actions flex row from forcing overlap by allowing the brand to shrink and keeping action controls grouped.
- Added a dedicated mobile account section inside the navigation drawer with the signed-in user's name and role.
- Added a clearly visible **تسجيل الخروج** button to the mobile drawer; invoking it closes the drawer and calls the existing logout handler.
- Kept the notification bell as a separate header action.

## Validation
- `node scripts/verify-source.mjs`: passed.
- Full TypeScript check, production build, and browser/device QA: not run in this environment (Node 22 is installed; project engine requires Node >=24, and dependencies are not installed here).
