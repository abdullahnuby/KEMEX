# KEMEX — Operations Center & Smart Notifications

## Added
- User-scoped notification inbox backed by existing `notification_outbox`.
- Read/unread state with mark-one-read and mark-all-read.
- Global navbar bell connected to actual persisted user notifications.
- Alerts page upgraded to combine persisted notifications with existing derived operational alerts.
- New `operations-center` route under التشغيل.
- Operations center summarizes active/overdue trips, trip exceptions, open work orders, unavailable assets, pending approvals, and latest notifications.
- Polling refresh every 20 seconds with refresh on tab visibility.
- No second Supabase client.
- No new database migration: existing enterprise notification table/policies are reused.

## Validation performed in the packaging environment
- TypeScript project check: passed with global TypeScript 5.8.3.
- Notification/map/driver/GPS static contract tests: 20/20 passed.

## User-side validation
Run the full project suite with `npm.cmd` in PowerShell before pushing the release.
