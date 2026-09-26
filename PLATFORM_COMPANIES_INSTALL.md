# KEMEX — Platform Company Management

This patch adds a platform-level company management page.

## What it adds
- Platform-only page: `#/platform`
- Create a company/tenant with plan: `trial`, `standard`, or `enterprise`
- Create the first company administrator in the same operation
- Company list with search, plan filter, active state, user count, and first admin
- Separate platform-operator authorization; tenant-local `admin` is not enough

## Required Supabase step
Apply the migration in this order after the existing tenant migrations:

```text
supabase/migrations/034_platform_company_management.sql
```

The migration bootstraps the first active `admin` belonging to the existing `default` tenant as a platform operator. This keeps the feature usable on the current KEMEX installation without changing the meaning of tenant-local roles.

## Required Edge Function deployment
Deploy the new function:

```text
supabase/functions/platform-admin/index.ts
```

For Supabase CLI:

```bash
supabase functions deploy platform-admin
```

The function uses the authenticated caller's session for authorization and the Supabase secret/service key only inside the Edge Function runtime. It never sends a service key to the browser.

## Security model
- `platform_operators` is separate from `profiles.role`.
- Regular company admins cannot list other tenants or create tenants.
- The browser can only read the current user's active platform-operator row.
- Tenant creation and first-admin creation run server-side.
- The first admin is created as a tenant-local `admin` and `must_change_password = true`.
- New company settings default to EGP and existing KEMEX alert/geofence defaults.

Zip-to-Git updates the repository, but it does not by itself execute a Supabase database migration or deploy an Edge Function unless the repository already has a CI/CD workflow that does that.
