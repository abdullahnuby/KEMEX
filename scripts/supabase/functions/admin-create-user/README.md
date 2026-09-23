# admin-create-user

Authenticated Edge Function used by KEMEX administrators to create Supabase Auth users and initialize their `profiles.must_change_password` flag.

Deploy with JWT verification enabled. The function performs its own `admin` profile authorization check before using the backend secret.
