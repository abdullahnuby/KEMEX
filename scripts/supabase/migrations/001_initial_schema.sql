create schema if not exists private;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null default '',
  role text not null default 'eng' check (role in ('admin','mgmt','fleet','pm','eng','maint','acct')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_settings (
  id boolean primary key default true check (id),
  company_name text not null default 'شركة المجموعة للنقل والمعدات',
  group_name text not null default 'المجموعة القابضة',
  vat numeric(8,2) not null default 14,
  diesel numeric(12,3) not null default 12.5,
  petrol numeric(12,3) not null default 15.25,
  alert_days integer not null default 30,
  alert_km integer not null default 1500,
  alert_hours integer not null default 80,
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id text primary key,
  code text not null unique,
  name text not null,
  client text not null default '',
  project_manager text not null default '',
  site text not null default '',
  cost_center text not null default '',
  status text not null default 'نشط',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.drivers (
  id text primary key,
  code text not null unique,
  name text not null,
  phone text,
  kind text,
  license_no text,
  license_expiry date,
  current_assignment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contracts (
  id text primary key,
  number text not null unique,
  lessor text not null,
  phone text,
  assets jsonb not null default '[]'::jsonb,
  start_date date,
  end_date date,
  rate numeric(14,2),
  unit text,
  minimum numeric(14,2),
  fuel_terms text,
  operation_terms text,
  maintenance_terms text,
  status text not null default 'ساري',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assets (
  id text primary key,
  code text not null unique,
  name text not null,
  category text not null,
  asset_type text not null,
  ownership text not null default 'مملوك',
  status text not null default 'متاح',
  technical_condition text not null default 'سليم',
  manufacturer text,
  model text,
  manufacture_year integer,
  fuel_type text,
  meter_type text not null default 'كم',
  meter numeric(14,2) not null default 0,
  standard_consumption numeric(10,3),
  acquisition_cost numeric(14,2),
  useful_life_years numeric(6,2),
  residual_value numeric(14,2),
  project_id text references public.projects(id) on delete set null,
  driver_id text references public.drivers(id) on delete set null,
  customer text,
  plate_number text,
  purchase_date date,
  license_expiry date,
  insurance_expiry date,
  contract_id text references public.contracts(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assignments (
  id text primary key,
  number text not null unique,
  asset_id text references public.assets(id) on delete set null,
  project_id text references public.projects(id) on delete set null,
  start_date date,
  planned_end_date date,
  actual_end_date date,
  customer text,
  meter_start numeric(14,2),
  rate numeric(14,2),
  status text not null default 'ساري',
  request_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.operations (
  id text primary key,
  asset_id text not null references public.assets(id) on delete cascade,
  project_id text references public.projects(id) on delete set null,
  operation_date date not null,
  hours numeric(12,2) not null default 0,
  meter numeric(14,2) not null default 0,
  shifts numeric(8,2),
  driver_id text references public.drivers(id) on delete set null,
  downtime_hours numeric(10,2),
  downtime_reason text,
  notes text,
  status text not null default 'مقدمة',
  approval_status text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.work_orders (
  id text primary key,
  asset_id text not null references public.assets(id) on delete cascade,
  project_id text references public.projects(id) on delete set null,
  work_type text not null,
  description text not null,
  opened date not null,
  priority text not null default 'عادية',
  status text not null default 'مفتوح',
  technicians text,
  labor_cost numeric(14,2) not null default 0,
  parts_cost numeric(14,2) not null default 0,
  vendor_cost numeric(14,2) not null default 0,
  vendor text,
  downtime_hours numeric(10,2),
  completed date,
  plan_id text,
  results text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fuel_operations (
  id text primary key,
  operation_type text not null,
  tank_id text,
  station text,
  asset_id text references public.assets(id) on delete set null,
  project_id text references public.projects(id) on delete set null,
  operation_date date not null,
  qty numeric(14,3) not null default 0,
  price numeric(14,3) not null default 0,
  total numeric(14,2) not null default 0,
  status text not null default 'مسجلة',
  meter numeric(14,2),
  notes text,
  supplier text,
  invoice_no text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id text primary key,
  occurred_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  username text,
  action text not null,
  entity text,
  reference text,
  details text,
  source text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.tfms_module_records (
  id bigserial primary key,
  module_name text not null,
  record_id text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(module_name, record_id)
);

create index if not exists assets_project_idx on public.assets(project_id);
create index if not exists assets_status_idx on public.assets(status);
create index if not exists operations_date_idx on public.operations(operation_date desc);
create index if not exists operations_asset_idx on public.operations(asset_id);
create index if not exists work_orders_opened_idx on public.work_orders(opened desc);
create index if not exists work_orders_asset_idx on public.work_orders(asset_id);
create index if not exists fuel_operation_date_idx on public.fuel_operations(operation_date desc);
create index if not exists fuel_operation_asset_idx on public.fuel_operations(asset_id);
create index if not exists audit_log_time_idx on public.audit_log(occurred_at desc);
create index if not exists module_records_module_idx on public.tfms_module_records(module_name, updated_at desc);

create or replace function private.current_role()
returns text
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.active = true limit 1
$$;

create or replace function private.has_role(roles text[])
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select coalesce(private.current_role() = any(roles), false)
$$;

grant usage on schema private to authenticated;
grant execute on function private.current_role() to authenticated;
grant execute on function private.has_role(text[]) to authenticated;

create or replace function private.can_module(module_name text, operation_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  r text := private.current_role();
  allowed text[];
begin
  if r is null then return false; end if;
  allowed := case module_name
    when 'requests' then array['admin','fleet','pm','eng']
    when 'assignments' then array['admin','fleet','pm']
    when 'operations' then array['admin','fleet','pm','eng']
    when 'trips' then array['admin','fleet','pm','eng']
    when 'drivers' then array['admin','fleet','maint','pm','eng']
    when 'contracts' then array['admin','fleet','acct','mgmt']
    when 'plans' then array['admin','fleet','maint','eng']
    when 'oils' then array['admin','fleet','maint']
    when 'tires' then array['admin','fleet','maint']
    when 'inventory' then array['admin','fleet','maint']
    when 'movements' then array['admin','fleet','maint']
    when 'purchases' then array['admin','fleet','acct']
    when 'costs' then array['admin','acct','mgmt','fleet']
    when 'charging' then array['admin','acct','mgmt','fleet']
    when 'invoices' then array['admin','acct','mgmt']
    when 'customers' then array['admin','acct','mgmt']
    when 'audit' then array['admin','mgmt','fleet','maint','acct']
    else array['admin']
  end;
  return r = any(allowed);
end;
$$;

revoke execute on function private.current_role() from public;
revoke execute on function private.has_role(text[]) from public;
revoke execute on function private.can_module(text,text) from public;
grant execute on function private.can_module(text,text) to authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  insert into public.profiles(id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name',''), 'eng')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure private.handle_new_user();

alter table public.profiles enable row level security;
alter table public.organization_settings enable row level security;
alter table public.projects enable row level security;
alter table public.drivers enable row level security;
alter table public.contracts enable row level security;
alter table public.assets enable row level security;
alter table public.assignments enable row level security;
alter table public.operations enable row level security;
alter table public.work_orders enable row level security;
alter table public.fuel_operations enable row level security;
alter table public.audit_log enable row level security;
alter table public.tfms_module_records enable row level security;

-- Profiles: a user can read their own profile; administrators can manage all profiles.
drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles for select to authenticated
using (id = auth.uid() or private.has_role(array['admin','mgmt']));

drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles for all to authenticated
using (private.has_role(array['admin'])) with check (private.has_role(array['admin']));

-- Reference and operational data.
drop policy if exists projects_read on public.projects;
create policy projects_read on public.projects for select to authenticated using (true);
drop policy if exists projects_write on public.projects;
create policy projects_write on public.projects for insert to authenticated with check (private.has_role(array['admin','mgmt','fleet','pm','acct']));
create policy projects_update on public.projects for update to authenticated using (private.has_role(array['admin','mgmt','fleet','pm','acct'])) with check (private.has_role(array['admin','mgmt','fleet','pm','acct']));
create policy projects_delete on public.projects for delete to authenticated using (private.has_role(array['admin']));

drop policy if exists drivers_read on public.drivers;
create policy drivers_read on public.drivers for select to authenticated using (true);
create policy drivers_write on public.drivers for insert to authenticated with check (private.has_role(array['admin','fleet','maint','pm','eng']));
create policy drivers_update on public.drivers for update to authenticated using (private.has_role(array['admin','fleet','maint','pm','eng'])) with check (private.has_role(array['admin','fleet','maint','pm','eng']));
create policy drivers_delete on public.drivers for delete to authenticated using (private.has_role(array['admin','fleet']));

drop policy if exists contracts_read on public.contracts;
create policy contracts_read on public.contracts for select to authenticated using (true);
create policy contracts_write on public.contracts for insert to authenticated with check (private.has_role(array['admin','fleet','acct','mgmt']));
create policy contracts_update on public.contracts for update to authenticated using (private.has_role(array['admin','fleet','acct','mgmt'])) with check (private.has_role(array['admin','fleet','acct','mgmt']));
create policy contracts_delete on public.contracts for delete to authenticated using (private.has_role(array['admin']));

drop policy if exists assets_read on public.assets;
create policy assets_read on public.assets for select to authenticated using (true);
create policy assets_write on public.assets for insert to authenticated with check (private.has_role(array['admin','fleet','pm','eng','maint']));
create policy assets_update on public.assets for update to authenticated using (private.has_role(array['admin','fleet','pm','eng','maint'])) with check (private.has_role(array['admin','fleet','pm','eng','maint']));
create policy assets_delete on public.assets for delete to authenticated using (private.has_role(array['admin','fleet']));

drop policy if exists assignments_read on public.assignments;
create policy assignments_read on public.assignments for select to authenticated using (true);
create policy assignments_write on public.assignments for insert to authenticated with check (private.has_role(array['admin','fleet','pm']));
create policy assignments_update on public.assignments for update to authenticated using (private.has_role(array['admin','fleet','pm'])) with check (private.has_role(array['admin','fleet','pm']));
create policy assignments_delete on public.assignments for delete to authenticated using (private.has_role(array['admin','fleet']));

drop policy if exists operations_read on public.operations;
create policy operations_read on public.operations for select to authenticated using (true);
create policy operations_write on public.operations for insert to authenticated with check (private.has_role(array['admin','fleet','pm','eng']));
create policy operations_update on public.operations for update to authenticated using (private.has_role(array['admin','fleet','pm','eng'])) with check (private.has_role(array['admin','fleet','pm','eng']));
create policy operations_delete on public.operations for delete to authenticated using (private.has_role(array['admin','fleet','pm']));

drop policy if exists work_orders_read on public.work_orders;
create policy work_orders_read on public.work_orders for select to authenticated using (true);
create policy work_orders_write on public.work_orders for insert to authenticated with check (private.has_role(array['admin','fleet','maint','eng']));
create policy work_orders_update on public.work_orders for update to authenticated using (private.has_role(array['admin','fleet','maint','eng'])) with check (private.has_role(array['admin','fleet','maint','eng']));
create policy work_orders_delete on public.work_orders for delete to authenticated using (private.has_role(array['admin','maint']));

drop policy if exists fuel_read on public.fuel_operations;
create policy fuel_read on public.fuel_operations for select to authenticated using (true);
create policy fuel_write on public.fuel_operations for insert to authenticated with check (private.has_role(array['admin','fleet','acct']));
create policy fuel_update on public.fuel_operations for update to authenticated using (private.has_role(array['admin','fleet','acct'])) with check (private.has_role(array['admin','fleet','acct']));
create policy fuel_delete on public.fuel_operations for delete to authenticated using (private.has_role(array['admin','fleet']));

drop policy if exists settings_read on public.organization_settings;
create policy settings_read on public.organization_settings for select to authenticated using (true);
create policy settings_write on public.organization_settings for all to authenticated using (private.has_role(array['admin'])) with check (private.has_role(array['admin']));

drop policy if exists audit_read on public.audit_log;
create policy audit_read on public.audit_log for select to authenticated using (private.has_role(array['admin','mgmt','fleet','maint','acct']));
create policy audit_insert on public.audit_log for insert to authenticated with check (true);

drop policy if exists module_records_read on public.tfms_module_records;
create policy module_records_read on public.tfms_module_records for select to authenticated using (private.can_module(module_name,'read'));
drop policy if exists module_records_insert on public.tfms_module_records;
create policy module_records_insert on public.tfms_module_records for insert to authenticated with check (private.can_module(module_name,'write'));
drop policy if exists module_records_update on public.tfms_module_records;
create policy module_records_update on public.tfms_module_records for update to authenticated using (private.can_module(module_name,'write')) with check (private.can_module(module_name,'write'));
drop policy if exists module_records_delete on public.tfms_module_records;
create policy module_records_delete on public.tfms_module_records for delete to authenticated using (private.can_module(module_name,'write'));


-- Explicit Data API grants. RLS remains the row-level security boundary.
grant select on public.projects, public.drivers, public.contracts, public.assets, public.assignments,
  public.operations, public.work_orders, public.fuel_operations, public.audit_log,
  public.organization_settings, public.tfms_module_records, public.profiles to authenticated;
grant insert, update on public.projects, public.drivers, public.contracts, public.assets, public.assignments,
  public.operations, public.work_orders, public.fuel_operations, public.audit_log,
  public.organization_settings, public.tfms_module_records to authenticated;
grant delete on public.projects, public.drivers, public.contracts, public.assets, public.assignments,
  public.operations, public.work_orders, public.fuel_operations, public.tfms_module_records to authenticated;
grant usage, select on sequence public.tfms_module_records_id_seq to authenticated;

insert into public.organization_settings(id) values(true)
on conflict (id) do nothing;
