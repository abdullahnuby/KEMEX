-- KEMEX Enterprise Foundation
-- Sprint 1: normalized reference data, documents, costs, project memberships,
-- and database views needed by the enterprise UI.

-- ============================ Reference data ================================
create table if not exists public.cost_centers (
  id text primary key,
  code text not null unique,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.asset_categories (
  id text primary key,
  code text not null unique,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.asset_types (
  id text primary key,
  code text not null unique,
  name text not null,
  category_id text references public.asset_categories(id) on delete set null,
  default_meter_type text not null default 'كم',
  standard_consumption numeric(10,3),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================== Clients ======================================
create table if not exists public.clients (
  id text primary key,
  code text not null unique,
  name text not null,
  classification text,
  contact_name text,
  phone text,
  email text,
  address text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects
  add column if not exists client_id text references public.clients(id) on delete set null;

create index if not exists projects_client_idx on public.projects(client_id);

-- ========================== Project membership ===============================
-- Foundation for row-scoped access. Enforcement is introduced after the UI
-- starts maintaining memberships; current module RBAC remains unchanged.
create table if not exists public.project_memberships (
  id text primary key,
  project_id text not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  membership_role text not null default 'member' check (
    membership_role in ('manager','engineer','operator','viewer','member')
  ),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, user_id)
);

create index if not exists project_memberships_user_idx
  on public.project_memberships(user_id, active);
create index if not exists project_memberships_project_idx
  on public.project_memberships(project_id, active);

-- =========================== Asset documents ================================
create table if not exists public.asset_documents (
  id text primary key,
  asset_id text not null references public.assets(id) on delete cascade,
  document_type text not null check (
    document_type in ('license','insurance','registration','inspection','contract','other')
  ),
  document_number text,
  issue_date date,
  expiry_date date,
  status text not null default 'سارية' check (
    status in ('سارية','منتهية','ملغاة','معلقة')
  ),
  file_name text,
  storage_path text,
  issuer text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists asset_documents_asset_idx
  on public.asset_documents(asset_id, document_type);
create index if not exists asset_documents_expiry_idx
  on public.asset_documents(expiry_date)
  where expiry_date is not null;

-- ============================== Cost ledger =================================
create table if not exists public.cost_entries (
  id text primary key,
  cost_date date not null,
  category text not null check (
    category in ('fuel','maintenance','tires','purchase','depreciation','other')
  ),
  asset_id text references public.assets(id) on delete set null,
  project_id text references public.projects(id) on delete set null,
  amount numeric(14,2) not null check (amount >= 0),
  quantity numeric(14,3) check (quantity is null or quantity >= 0),
  unit_cost numeric(14,3) check (unit_cost is null or unit_cost >= 0),
  description text,
  vendor text,
  reference_type text,
  reference_id text,
  status text not null default 'مسجلة' check (
    status in ('مسودة','مسجلة','معتمدة','ملغاة')
  ),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cost_entries_date_idx
  on public.cost_entries(cost_date desc);
create index if not exists cost_entries_asset_date_idx
  on public.cost_entries(asset_id, cost_date desc)
  where asset_id is not null;
create index if not exists cost_entries_project_date_idx
  on public.cost_entries(project_id, cost_date desc)
  where project_id is not null;
create index if not exists cost_entries_category_date_idx
  on public.cost_entries(category, cost_date desc);

-- ============================ Organization ==================================
alter table public.organization_settings
  add column if not exists currency_code text not null default 'SAR';
alter table public.organization_settings
  add column if not exists locale text not null default 'ar-SA';
alter table public.organization_settings
  add column if not exists fiscal_year_start_month smallint not null default 1
  check (fiscal_year_start_month between 1 and 12);

-- ========================== Asset relationships =============================
alter table public.assets
  add column if not exists asset_type_id text references public.asset_types(id) on delete set null;

create index if not exists assets_asset_type_idx on public.assets(asset_type_id);

-- =========================== Updated-at triggers ============================
-- Reuse the hardened helper from migration 002.
do $$
declare t text;
begin
  foreach t in array array['cost_centers','asset_categories','asset_types','clients',
                            'project_memberships','asset_documents','cost_entries'] loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I', t, t);
    execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute function private.set_updated_at()', t, t);
  end loop;
end $$;

-- =============================== RLS ========================================
alter table public.cost_centers enable row level security;
alter table public.asset_categories enable row level security;
alter table public.asset_types enable row level security;
alter table public.clients enable row level security;
alter table public.project_memberships enable row level security;
alter table public.asset_documents enable row level security;
alter table public.cost_entries enable row level security;

-- Reference data: readable to all authenticated users; editable by admin only.
drop policy if exists cost_centers_read on public.cost_centers;
drop policy if exists cost_centers_write on public.cost_centers;
create policy cost_centers_read on public.cost_centers
  for select to authenticated using (true);
create policy cost_centers_write on public.cost_centers
  for all to authenticated using (private.has_role(array['admin']))
  with check (private.has_role(array['admin']));

drop policy if exists asset_categories_read on public.asset_categories;
drop policy if exists asset_categories_write on public.asset_categories;
create policy asset_categories_read on public.asset_categories
  for select to authenticated using (true);
create policy asset_categories_write on public.asset_categories
  for all to authenticated using (private.has_role(array['admin']))
  with check (private.has_role(array['admin']));

drop policy if exists asset_types_read on public.asset_types;
drop policy if exists asset_types_write on public.asset_types;
create policy asset_types_read on public.asset_types
  for select to authenticated using (true);
create policy asset_types_write on public.asset_types
  for all to authenticated using (private.has_role(array['admin']))
  with check (private.has_role(array['admin']));

-- Clients follow the customers module authorization matrix.
drop policy if exists clients_read on public.clients;
drop policy if exists clients_write on public.clients;
create policy clients_read on public.clients
  for select to authenticated using (private.can_module('customers','read'));
create policy clients_write on public.clients
  for all to authenticated
  using (private.can_module('customers','write'))
  with check (private.can_module('customers','write'));

-- Project membership is currently role-gated; row-scoped policies come in the
-- access-control sprint after the frontend begins maintaining memberships.
drop policy if exists project_memberships_read on public.project_memberships;
drop policy if exists project_memberships_write on public.project_memberships;
create policy project_memberships_read on public.project_memberships
  for select to authenticated using (private.can_module('projects','read'));
create policy project_memberships_write on public.project_memberships
  for all to authenticated using (private.has_role(array['admin','pm']))
  with check (private.has_role(array['admin','pm']));

-- Asset documents follow asset permissions.
drop policy if exists asset_documents_read on public.asset_documents;
drop policy if exists asset_documents_write on public.asset_documents;
create policy asset_documents_read on public.asset_documents
  for select to authenticated using (private.can_module('assets','read'));
create policy asset_documents_write on public.asset_documents
  for all to authenticated
  using (private.can_module('assets','write'))
  with check (private.can_module('assets','write'));

-- Cost ledger uses the existing finance module permissions.
drop policy if exists cost_entries_read on public.cost_entries;
drop policy if exists cost_entries_write on public.cost_entries;
create policy cost_entries_read on public.cost_entries
  for select to authenticated using (private.can_module('costs','read'));
create policy cost_entries_write on public.cost_entries
  for all to authenticated
  using (private.can_module('costs','write'))
  with check (private.can_module('costs','write'));

-- =========================== Data API grants ================================
grant select, insert, update, delete on public.cost_centers to authenticated;
grant select, insert, update, delete on public.asset_categories to authenticated;
grant select, insert, update, delete on public.asset_types to authenticated;
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.project_memberships to authenticated;
grant select, insert, update, delete on public.asset_documents to authenticated;
grant select, insert, update, delete on public.cost_entries to authenticated;

-- ================================ Audit =====================================
do $$
declare t text;
begin
  foreach t in array array['cost_centers','asset_categories','asset_types','clients',
                            'project_memberships','asset_documents','cost_entries'] loop
    execute format('drop trigger if exists trg_%I_audit on public.%I', t, t);
    execute format('create trigger trg_%I_audit after insert or update or delete on public.%I for each row execute function private.audit_change()', t, t);
  end loop;
end $$;

-- =============================== Views ======================================
create or replace view public.asset_financial_summary
with (security_invoker = true)
as
select
  a.id,
  a.code,
  a.name,
  a.acquisition_cost,
  a.residual_value,
  a.useful_life_years,
  a.purchase_date,
  case
    when coalesce(a.acquisition_cost,0) <= coalesce(a.residual_value,0)
      or coalesce(a.useful_life_years,0) <= 0
    then 0::numeric
    else round((a.acquisition_cost - coalesce(a.residual_value,0)) / a.useful_life_years, 2)
  end as annual_depreciation,
  case
    when coalesce(a.acquisition_cost,0) <= coalesce(a.residual_value,0)
      or coalesce(a.useful_life_years,0) <= 0
      or a.purchase_date is null
    then 0::numeric
    else least(
      greatest(
        (now()::date - a.purchase_date)::numeric / 365.25,
        0
      ) / a.useful_life_years,
      1
    ) * (a.acquisition_cost - coalesce(a.residual_value,0))
  end as accumulated_depreciation,
  case
    when coalesce(a.acquisition_cost,0) <= 0 then 0::numeric
    else greatest(
      coalesce(a.acquisition_cost,0) - case
        when coalesce(a.acquisition_cost,0) <= coalesce(a.residual_value,0)
          or coalesce(a.useful_life_years,0) <= 0
          or a.purchase_date is null
        then 0::numeric
        else least(
          greatest((now()::date - a.purchase_date)::numeric / 365.25, 0)
          / a.useful_life_years,
          1
        ) * (a.acquisition_cost - coalesce(a.residual_value,0))
      end,
      coalesce(a.residual_value,0)
    )
  end as net_book_value
from public.assets a;

create or replace view public.asset_costs_30d
with (security_invoker = true)
as
select
  a.id as asset_id,
  a.code as asset_code,
  a.name as asset_name,
  coalesce(sum(c.amount) filter (
    where c.category='fuel'
  ),0)::numeric(14,2) as fuel_cost_30d,
  coalesce(sum(c.amount) filter (
    where c.category='maintenance'
  ),0)::numeric(14,2) as maintenance_cost_30d,
  coalesce(sum(c.amount) filter (
    where c.category='tires'
  ),0)::numeric(14,2) as tire_cost_30d,
  coalesce(sum(c.amount),0)::numeric(14,2) as total_cost_30d
from public.assets a
left join public.cost_entries c
  on c.asset_id = a.id
 and c.cost_date >= current_date - 29
 and c.cost_date <= current_date
 and c.status <> 'ملغاة'
group by a.id, a.code, a.name;

create or replace view public.project_costs_30d
with (security_invoker = true)
as
select
  p.id as project_id,
  p.code as project_code,
  p.name as project_name,
  coalesce(sum(c.amount),0)::numeric(14,2) as total_cost_30d,
  coalesce(count(c.id),0)::bigint as cost_entries_30d
from public.projects p
left join public.cost_entries c
  on c.project_id = p.id
 and c.cost_date >= current_date - 29
 and c.cost_date <= current_date
 and c.status <> 'ملغاة'
group by p.id, p.code, p.name;

grant select on public.asset_financial_summary to authenticated;
grant select on public.asset_costs_30d to authenticated;
grant select on public.project_costs_30d to authenticated;

-- Refresh PostgREST schema cache after DDL changes.
notify pgrst, 'reload schema';
