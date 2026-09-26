-- KEMEX v0.54 — Platform company management foundation.
-- Keeps platform ownership separate from tenant-local admin roles.
-- A platform operator can manage the tenant registry only through the
-- platform-admin edge function; ordinary authenticated users can only read
-- their own operator flag.

create table if not exists public.platform_operators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists platform_operators_active_idx
  on public.platform_operators(active)
  where active = true;

alter table public.platform_operators enable row level security;

grant select on public.platform_operators to authenticated;
revoke insert, update, delete on public.platform_operators from authenticated;

drop policy if exists platform_operators_self_select on public.platform_operators;
create policy platform_operators_self_select
  on public.platform_operators
  for select
  to authenticated
  using (user_id = auth.uid() and active = true);

create or replace function private.is_platform_operator()
returns boolean
language sql
security definer
stable
set search_path = public, private
as $$
  select exists (
    select 1
    from public.platform_operators
    where user_id = auth.uid()
      and active = true
  )
$$;

grant execute on function private.is_platform_operator() to authenticated;
revoke execute on function private.is_platform_operator() from public;

-- Bootstrap the existing primary administrator as the platform operator.
-- This is intentionally limited to the first active admin attached to the
-- pre-existing default tenant. Additional operators can be added later by a
-- privileged database operation without changing tenant-local roles.
insert into public.platform_operators(user_id)
select p.id
from public.profiles p
join public.tenants t on t.id = p.tenant_id
where p.role = 'admin'
  and p.active = true
  and t.slug = 'default'
order by p.created_at asc
limit 1
on conflict (user_id) do nothing;
