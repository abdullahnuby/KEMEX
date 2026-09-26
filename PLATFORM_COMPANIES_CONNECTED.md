# KEMEX — Platform Company Management Connected

Frontend page is wired to Supabase Edge Function `platform-admin`.

Database status:
- migrations 032, 033, 034 applied to KEMEX Supabase project
- default tenant exists
- one active platform operator bootstrapped

Edge Function:
- `platform-admin` deployed and ACTIVE with JWT verification enabled

Frontend:
- `/platform` route
- Navbar visibility gated by `user.isPlatformOwner`
- repository loads `platform_operators` after authentication
- create/list operations call `platform-admin`
