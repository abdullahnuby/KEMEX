-- KEMEX — Schema Recovery: Breakdown, Downtime, Transportation & Trips
-- Phase: P0 Database Source-of-Truth Recovery
--
-- Purpose:
--   Reconstruct the schema required by the KEMEX Breakdown/True-Cost and
--   Transportation modules that was missing from migrations 001-017.
--
-- Important:
--   This migration is intentionally additive. It never drops or rewrites
--   existing production objects. On a database where these objects already
--   exist, CREATE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS are no-ops.
--
-- Validation requirement:
--   The production schema must still be compared against information_schema
--   / pg_catalog before this migration is considered a byte-for-byte snapshot
--   of production. Existing objects are not altered by this migration.

-- ============================================================================
-- 1. BREAKDOWN EVENTS
-- ============================================================================
create table if not exists public.breakdown_events (
  id uuid primary key default gen_random_uuid(),
  asset_id text not null references public.assets(id) on delete cascade,
  project_id text references public.projects(id) on delete set null,
  driver_id text references public.drivers(id) on delete set null,
  work_order_id text references public.work_orders(id) on delete set null,
  reported_at timestamptz not null default now(),
  breakdown_datetime timestamptz not null,
  location text,
  description text not null,
  severity text not null default 'minor',
  status text not null default 'reported',
  recovery_datetime timestamptz,
  downtime_hours numeric,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint breakdown_events_severity_ck
    check (severity in ('minor','major','critical')),
  constraint breakdown_events_status_ck
    check (status in (
      'reported','inspecting','awaiting_transport',
      'in_transit_to_workshop','under_repair','awaiting_return',
      'in_transit_to_site','delivered','closed'
    )),
  constraint breakdown_events_downtime_nonnegative_ck
    check (downtime_hours is null or downtime_hours >= 0),
  constraint breakdown_events_recovery_after_breakdown_ck
    check (recovery_datetime is null or recovery_datetime >= breakdown_datetime)
);

-- ============================================================================
-- 2. DOWNTIME TRACKING
-- ============================================================================
create table if not exists public.downtime_tracking (
  id uuid primary key default gen_random_uuid(),
  breakdown_event_id uuid references public.breakdown_events(id) on delete cascade,
  asset_id text not null references public.assets(id) on delete cascade,
  driver_id text references public.drivers(id) on delete set null,
  start_datetime timestamptz not null,
  end_datetime timestamptz,
  duration_hours numeric,
  driver_daily_rate numeric not null default 0,
  driver_downtime_cost numeric not null default 0,
  lost_revenue_per_day numeric not null default 0,
  lost_revenue_total numeric not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  constraint downtime_duration_nonnegative_ck
    check (duration_hours is null or duration_hours >= 0),
  constraint downtime_driver_rate_nonnegative_ck
    check (driver_daily_rate >= 0),
  constraint downtime_driver_cost_nonnegative_ck
    check (driver_downtime_cost >= 0),
  constraint downtime_lost_revenue_day_nonnegative_ck
    check (lost_revenue_per_day >= 0),
  constraint downtime_lost_revenue_total_nonnegative_ck
    check (lost_revenue_total >= 0),
  constraint downtime_end_after_start_ck
    check (end_datetime is null or end_datetime >= start_datetime)
);

-- ============================================================================
-- 3. MAINTENANCE COST ITEMS
-- ============================================================================
create table if not exists public.maintenance_cost_items (
  id uuid primary key default gen_random_uuid(),
  breakdown_event_id uuid references public.breakdown_events(id) on delete cascade,
  work_order_id text references public.work_orders(id) on delete set null,
  cost_category text not null,
  description text not null,
  amount numeric not null,
  currency text not null default 'EGP',
  vendor_name text,
  invoice_number text,
  cost_date date not null default current_date,
  is_billable boolean not null default false,
  billed_to_client_id text references public.clients(id) on delete set null,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint maintenance_cost_items_amount_nonnegative_ck
    check (amount >= 0),
  constraint maintenance_cost_items_category_ck
    check (cost_category in (
      'diagnosis','outbound_transport','spare_parts','labor',
      'external_workshop','return_transport','driver_downtime',
      'lost_revenue','penalty','per_diem','other'
    ))
);

-- ============================================================================
-- 4. MAINTENANCE TRANSPORTS / RECOVERY MOVEMENTS
-- ============================================================================
create table if not exists public.maintenance_transports (
  id uuid primary key default gen_random_uuid(),
  breakdown_event_id uuid references public.breakdown_events(id) on delete cascade,
  work_order_id text references public.work_orders(id) on delete set null,
  direction text not null,
  transport_type text not null,
  from_location text,
  to_location text,
  transport_date timestamptz not null,
  transport_cost numeric not null default 0,
  vendor_name text,
  driver_name text,
  plate_number text,
  notes text,
  created_at timestamptz not null default now(),
  constraint maintenance_transports_direction_ck
    check (direction in ('to_workshop','to_site','internal')),
  constraint maintenance_transports_type_ck
    check (transport_type in ('tow_truck','trailer','crane','flatbed','other')),
  constraint maintenance_transports_cost_nonnegative_ck
    check (transport_cost >= 0)
);

-- ============================================================================
-- 5. TRIPS / TRANSPORTATION
-- ============================================================================
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  trip_number text,
  trip_type text not null,
  truck_asset_id text not null references public.assets(id) on delete restrict,
  trailer_asset_id text references public.assets(id) on delete set null,
  driver_id text not null references public.drivers(id) on delete restrict,
  contract_id text references public.contracts(id) on delete set null,
  from_project_id text references public.projects(id) on delete set null,
  to_project_id text references public.projects(id) on delete set null,
  from_location text,
  to_location text,
  cargo_description text not null,
  cargo_quantity numeric,
  cargo_unit text,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  actual_start timestamptz,
  actual_end timestamptz,
  status text not null default 'draft',
  distance_km numeric,
  fuel_consumed_liters numeric,
  rate_type text,
  rate_amount numeric,
  total_charge numeric not null default 0,
  is_billable boolean not null default true,
  billed_to_client_id text references public.clients(id) on delete set null,
  invoice_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trips_type_ck
    check (trip_type in ('cargo','equipment','internal','return')),
  constraint trips_status_ck
    check (status in (
      'draft','assigned','dispatched','in_transit','delivered',
      'received','invoiced','paid','cancelled'
    )),
  constraint trips_rate_type_ck
    check (rate_type is null or rate_type in (
      'per_trip','per_ton','per_km','per_m3','fixed_monthly'
    )),
  constraint trips_quantity_nonnegative_ck
    check (cargo_quantity is null or cargo_quantity >= 0),
  constraint trips_distance_nonnegative_ck
    check (distance_km is null or distance_km >= 0),
  constraint trips_fuel_nonnegative_ck
    check (fuel_consumed_liters is null or fuel_consumed_liters >= 0),
  constraint trips_rate_nonnegative_ck
    check (rate_amount is null or rate_amount >= 0),
  constraint trips_charge_nonnegative_ck
    check (total_charge >= 0),
  constraint trips_schedule_order_ck
    check (scheduled_end is null or scheduled_start is null or scheduled_end >= scheduled_start),
  constraint trips_actual_order_ck
    check (actual_end is null or actual_start is null or actual_end >= actual_start)
);

-- ============================================================================
-- 6. TRIP COSTS
-- ============================================================================
create table if not exists public.trip_costs (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  cost_category text not null,
  description text,
  amount numeric not null,
  currency text not null default 'EGP',
  vendor_name text,
  receipt_url text,
  cost_date date not null default current_date,
  created_at timestamptz not null default now(),
  constraint trip_costs_amount_nonnegative_ck
    check (amount >= 0),
  constraint trip_costs_category_ck
    check (cost_category in (
      'fuel','driver_allowance','tolls','loading','unloading',
      'maintenance','permit_fees','overnight','other'
    ))
);

-- ============================================================================
-- 7. TRIP PERMITS / DELIVERY & RECEIPT DOCUMENTS
-- ============================================================================
create table if not exists public.trip_permits (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  permit_type text not null,
  permit_number text,
  issued_at timestamptz not null default now(),
  issued_by_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  signed_at timestamptz,
  signed_by_name text,
  signed_by_role text,
  signature_url text,
  attachment_urls jsonb not null default '[]'::jsonb,
  receipt_condition text,
  received_quantity numeric,
  discrepancy_notes text,
  notes text,
  created_at timestamptz not null default now(),
  constraint trip_permits_type_ck
    check (permit_type in ('delivery','receipt')),
  constraint trip_permits_condition_ck
    check (receipt_condition is null or receipt_condition in ('سليم','تالف','ناقص')),
  constraint trip_permits_quantity_nonnegative_ck
    check (received_quantity is null or received_quantity >= 0),
  constraint trip_permits_signed_consistency_ck
    check (signed_at is null or signed_by_name is not null)
);

-- ============================================================================
-- 8. INDEXES
-- ============================================================================
create index if not exists breakdown_events_asset_idx
  on public.breakdown_events(asset_id, breakdown_datetime desc);
create index if not exists breakdown_events_status_idx
  on public.breakdown_events(status, breakdown_datetime desc);
create index if not exists breakdown_events_project_idx
  on public.breakdown_events(project_id, breakdown_datetime desc);
create index if not exists breakdown_events_work_order_idx
  on public.breakdown_events(work_order_id);

create index if not exists downtime_tracking_breakdown_idx
  on public.downtime_tracking(breakdown_event_id);
create index if not exists downtime_tracking_asset_idx
  on public.downtime_tracking(asset_id, start_datetime desc);

create index if not exists maintenance_cost_items_breakdown_idx
  on public.maintenance_cost_items(breakdown_event_id, cost_date desc);
create index if not exists maintenance_cost_items_work_order_idx
  on public.maintenance_cost_items(work_order_id, cost_date desc);

create index if not exists maintenance_transports_breakdown_idx
  on public.maintenance_transports(breakdown_event_id, transport_date desc);

create index if not exists trips_number_idx
  on public.trips(trip_number);
create index if not exists trips_status_idx
  on public.trips(status, scheduled_start desc);
create index if not exists trips_truck_asset_idx
  on public.trips(truck_asset_id, scheduled_start desc);
create index if not exists trips_driver_idx
  on public.trips(driver_id, scheduled_start desc);
create index if not exists trips_project_idx
  on public.trips(from_project_id, to_project_id, scheduled_start desc);

create index if not exists trip_costs_trip_idx
  on public.trip_costs(trip_id, cost_date desc);
create index if not exists trip_permits_trip_idx
  on public.trip_permits(trip_id, issued_at desc);

-- ============================================================================
-- 9. UPDATED_AT TRIGGER FOR TRIPS
-- ============================================================================
-- private.set_updated_at() is introduced by migration 002 on a fresh DB.
-- Use a guarded DO block so this migration remains safe if applied against
-- an existing DB where the helper is unavailable for any reason.
do $$
begin
  if to_regprocedure('private.set_updated_at()') is not null then
    execute 'drop trigger if exists trg_trips_updated_at on public.trips';
    execute 'create trigger trg_trips_updated_at before update on public.trips for each row execute function private.set_updated_at()';
  end if;
end $$;

-- ============================================================================
-- 10. ROW LEVEL SECURITY
-- ============================================================================
-- Existing production policies are preserved. On a fresh database these
-- policies establish the same broad module-RBAC boundary used elsewhere in
-- KEMEX. Fine-grained project-level security can be added later.
alter table public.breakdown_events enable row level security;
alter table public.downtime_tracking enable row level security;
alter table public.maintenance_cost_items enable row level security;
alter table public.maintenance_transports enable row level security;
alter table public.trips enable row level security;
alter table public.trip_costs enable row level security;
alter table public.trip_permits enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='breakdown_events' and policyname='breakdown_events_read') then
    create policy breakdown_events_read on public.breakdown_events for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='breakdown_events' and policyname='breakdown_events_write') then
    create policy breakdown_events_write on public.breakdown_events for insert to authenticated with check (private.has_role(array['admin','fleet','maint','eng']));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='breakdown_events' and policyname='breakdown_events_update') then
    create policy breakdown_events_update on public.breakdown_events for update to authenticated using (private.has_role(array['admin','fleet','maint','eng'])) with check (private.has_role(array['admin','fleet','maint','eng']));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='breakdown_events' and policyname='breakdown_events_delete') then
    create policy breakdown_events_delete on public.breakdown_events for delete to authenticated using (private.has_role(array['admin','fleet','maint']));
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='downtime_tracking' and policyname='downtime_tracking_read') then
    create policy downtime_tracking_read on public.downtime_tracking for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='downtime_tracking' and policyname='downtime_tracking_write') then
    create policy downtime_tracking_write on public.downtime_tracking for insert to authenticated with check (private.has_role(array['admin','fleet','maint','eng']));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='downtime_tracking' and policyname='downtime_tracking_update') then
    create policy downtime_tracking_update on public.downtime_tracking for update to authenticated using (private.has_role(array['admin','fleet','maint','eng'])) with check (private.has_role(array['admin','fleet','maint','eng']));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='downtime_tracking' and policyname='downtime_tracking_delete') then
    create policy downtime_tracking_delete on public.downtime_tracking for delete to authenticated using (private.has_role(array['admin','fleet','maint']));
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='maintenance_cost_items' and policyname='maintenance_cost_items_read') then
    create policy maintenance_cost_items_read on public.maintenance_cost_items for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='maintenance_cost_items' and policyname='maintenance_cost_items_write') then
    create policy maintenance_cost_items_write on public.maintenance_cost_items for insert to authenticated with check (private.has_role(array['admin','fleet','maint','eng','acct']));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='maintenance_cost_items' and policyname='maintenance_cost_items_update') then
    create policy maintenance_cost_items_update on public.maintenance_cost_items for update to authenticated using (private.has_role(array['admin','fleet','maint','eng','acct'])) with check (private.has_role(array['admin','fleet','maint','eng','acct']));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='maintenance_cost_items' and policyname='maintenance_cost_items_delete') then
    create policy maintenance_cost_items_delete on public.maintenance_cost_items for delete to authenticated using (private.has_role(array['admin','fleet','maint','acct']));
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='maintenance_transports' and policyname='maintenance_transports_read') then
    create policy maintenance_transports_read on public.maintenance_transports for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='maintenance_transports' and policyname='maintenance_transports_write') then
    create policy maintenance_transports_write on public.maintenance_transports for insert to authenticated with check (private.has_role(array['admin','fleet','maint','eng']));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='maintenance_transports' and policyname='maintenance_transports_update') then
    create policy maintenance_transports_update on public.maintenance_transports for update to authenticated using (private.has_role(array['admin','fleet','maint','eng'])) with check (private.has_role(array['admin','fleet','maint','eng']));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='maintenance_transports' and policyname='maintenance_transports_delete') then
    create policy maintenance_transports_delete on public.maintenance_transports for delete to authenticated using (private.has_role(array['admin','fleet','maint']));
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='trips' and policyname='trips_read') then
    create policy trips_read on public.trips for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='trips' and policyname='trips_write') then
    create policy trips_write on public.trips for insert to authenticated with check (private.has_role(array['admin','fleet','pm','eng']));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='trips' and policyname='trips_update') then
    create policy trips_update on public.trips for update to authenticated using (private.has_role(array['admin','fleet','pm','eng'])) with check (private.has_role(array['admin','fleet','pm','eng']));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='trips' and policyname='trips_delete') then
    create policy trips_delete on public.trips for delete to authenticated using (private.has_role(array['admin','fleet']));
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='trip_costs' and policyname='trip_costs_read') then
    create policy trip_costs_read on public.trip_costs for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='trip_costs' and policyname='trip_costs_write') then
    create policy trip_costs_write on public.trip_costs for insert to authenticated with check (private.has_role(array['admin','fleet','pm','acct']));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='trip_costs' and policyname='trip_costs_update') then
    create policy trip_costs_update on public.trip_costs for update to authenticated using (private.has_role(array['admin','fleet','pm','acct'])) with check (private.has_role(array['admin','fleet','pm','acct']));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='trip_costs' and policyname='trip_costs_delete') then
    create policy trip_costs_delete on public.trip_costs for delete to authenticated using (private.has_role(array['admin','fleet','acct']));
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='trip_permits' and policyname='trip_permits_read') then
    create policy trip_permits_read on public.trip_permits for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='trip_permits' and policyname='trip_permits_write') then
    create policy trip_permits_write on public.trip_permits for insert to authenticated with check (private.has_role(array['admin','fleet','pm','eng']));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='trip_permits' and policyname='trip_permits_update') then
    create policy trip_permits_update on public.trip_permits for update to authenticated using (private.has_role(array['admin','fleet','pm','eng'])) with check (private.has_role(array['admin','fleet','pm','eng']));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='trip_permits' and policyname='trip_permits_delete') then
    create policy trip_permits_delete on public.trip_permits for delete to authenticated using (private.has_role(array['admin','fleet','pm']));
  end if;
end $$;

-- ============================================================================
-- 11. DATA API GRANTS
-- ============================================================================
grant select on public.breakdown_events, public.downtime_tracking,
  public.maintenance_cost_items, public.maintenance_transports,
  public.trips, public.trip_costs, public.trip_permits to authenticated;

grant insert, update on public.breakdown_events, public.downtime_tracking,
  public.maintenance_cost_items, public.maintenance_transports,
  public.trips, public.trip_costs, public.trip_permits to authenticated;

grant delete on public.breakdown_events, public.downtime_tracking,
  public.maintenance_cost_items, public.maintenance_transports,
  public.trips, public.trip_costs, public.trip_permits to authenticated;

-- ============================================================================
-- 12. RECOVERY NOTE
-- ============================================================================
comment on table public.breakdown_events is
  'KEMEX recovered schema: corrective maintenance / breakdown lifecycle.';
comment on table public.downtime_tracking is
  'KEMEX recovered schema: downtime and indirect operating cost tracking.';
comment on table public.maintenance_cost_items is
  'KEMEX recovered schema: direct and indirect breakdown cost lines.';
comment on table public.maintenance_transports is
  'KEMEX recovered schema: breakdown recovery / workshop transportation.';
comment on table public.trips is
  'KEMEX recovered schema: transportation dispatch and trip lifecycle.';
comment on table public.trip_costs is
  'KEMEX recovered schema: trip-level operational cost lines.';
comment on table public.trip_permits is
  'KEMEX recovered schema: delivery/receipt permits and proof of handover.';
