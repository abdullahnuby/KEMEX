# KEMEX Production Readiness Gate

## Automated gates

- Node.js 24+ runtime
- `npm ci`
- `npm run verify:source`
- `npm run typecheck`
- `npm run build`
- `npm run test:source`

## Functional smoke checks

- Login / session restoration / logout
- Dashboard navigation and period switching
- Navbar dropdowns, global search, notifications, user menu
- CRUD create / edit / delete flows for primary entities
- Maintenance workflow transitions
- Transportation request → assignment → trip flow
- Inventory receipt / movement / purchase flow
- Reports navigation and exports
- Settings and permission boundaries

## Responsive / RTL

- 1440px desktop
- 1024px tablet/laptop
- 768px tablet
- 390px mobile
- RTL Arabic text, numeric fields, dates, IDs and mixed Arabic/English strings

## Accessibility

- Keyboard-only navigation
- Visible focus
- Escape / tab behavior in dialogs
- Screen-reader labels for controls and tables
- Error and success status announcements
- Contrast and forced-colors check

## Release evidence

The local sprint environment did not complete `npm ci` within the available transport timeout, so a local build/typecheck PASS is intentionally not claimed. GitHub Actions is configured to run the full gate on Node 24 before merge to `main`.
