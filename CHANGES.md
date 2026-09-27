# KEMEX Mobile V6

Phone UX is now a dedicated mobile information architecture rather than a compressed desktop layout.

Changed files:
- `src/pages/DashboardPage.tsx` — adds a mobile-only dashboard composition with its own hierarchy: status, 4 primary KPIs, secondary stats, quick actions, decision queue, fleet readiness, tracking, recent operations, projects, and compact costs.
- `src/styles/dashboard-home.css` — mobile dashboard layout and component styling; desktop dashboard is hidden on phones and mobile dashboard is shown instead.
- `src/styles/mobile-app-shell.css` — phone-first shell refinements for the top bar, bottom tab navigation, touch targets, drawer, and dashboard page spacing.
- `src/main.tsx` — imports the new global mobile shell stylesheet.

No database, repository, routing, permissions, or Supabase behavior was changed.
