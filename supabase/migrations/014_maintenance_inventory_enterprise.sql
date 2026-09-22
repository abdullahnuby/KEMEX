-- KEMEX v0.29.0 — Maintenance & Inventory enterprise foundation
-- This migration is idempotent and contains no seed/business records.

create sequence if not exists private.stock_movement_no_seq;

create table if not exists public.warehouses (
  id text primary key, code text not null unique, name text not null, location text, manager_name text,
  active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.inventory_items (
  id text primary key, code text not null unique, name text not null,
  category text not null check (category in ('قطع غيار','زيوت','إطارات','مواد','أدوات','أخرى')),
  brand text, unit text not null, barcode text, warehouse_id text references public.warehouses(id) on delete set null, location text,
  minimum_qty numeric(14,3) not null default 0 check (minimum_qty >= 0),
  maximum_qty numeric(14,3) not null default 0 check (maximum_qty >= 0),
  reorder_point numeric(14,3) not null default 0 check (reorder_point >= 0),
  lead_time_days integer not null default 0 check (lead_time_days >= 0),
  average_cost numeric(14,3) not null default 0 check (average_cost >= 0),
  last_purchase_cost numeric(14,3) not null default 0 check (last_purchase_cost >= 0),
  current_qty numeric(14,3) not null default 0 check (current_qty >= 0),
  opening_qty numeric(14,3) not null default 0 check (opening_qty >= 0),
  active boolean not null default true, notes text, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (maximum_qty = 0 or maximum_qty >= minimum_qty), check (reorder_point = 0 or reorder_point >= minimum_qty)
);

create table if not exists public.stock_movements (
  id text primary key, movement_no text not null unique, item_id text not null references public.inventory_items(id) on delete restrict,
  movement_type text not null check (movement_type in ('استلام','صرف','مرتجع','تسوية زيادة','تسوية نقص')),
  quantity numeric(14,3) not null check (quantity > 0), movement_date date not null,
  unit_cost numeric(14,3) not null default 0 check (unit_cost >= 0), warehouse_id text references public.warehouses(id) on delete set null,
  asset_id text references public.assets(id) on delete set null, work_order_id text references public.work_orders(id) on delete set null,
  project_id text references public.projects(id) on delete set null, reference_type text, reference_id text, notes text,
  created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);

create table if not exists public.maintenance_technicians (
  id text primary key, code text not null unique, name text not null, specialty text, phone text, employment_type text,
  active boolean not null default true, notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.maintenance_parts (
  id text primary key, work_order_id text not null references public.work_orders(id) on delete cascade,
  item_id text not null references public.inventory_items(id) on delete restrict,
  planned_qty numeric(14,3) not null default 0 check (planned_qty >= 0),
  issued_qty numeric(14,3) not null default 0 check (issued_qty >= 0),
  returned_qty numeric(14,3) not null default 0 check (returned_qty >= 0),
  unit_cost numeric(14,3) not null default 0 check (unit_cost >= 0), notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (issued_qty <= planned_qty or planned_qty = 0)
);

create index if not exists inventory_items_warehouse_idx on public.inventory_items(warehouse_id) where warehouse_id is not null;
create index if not exists inventory_items_low_stock_idx on public.inventory_items(current_qty,reorder_point);
create index if not exists stock_movements_item_date_idx on public.stock_movements(item_id,movement_date desc);
create index if not exists stock_movements_work_order_idx on public.stock_movements(work_order_id) where work_order_id is not null;
create index if not exists maintenance_parts_work_order_idx on public.maintenance_parts(work_order_id);
create index if not exists maintenance_parts_item_idx on public.maintenance_parts(item_id);

/* Authorization + triggers. The main audit function is payload-safe and works for core tables. */
alter table public.warehouses enable row level security;
alter table public.inventory_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.maintenance_technicians enable row level security;
alter table public.maintenance_parts enable row level security;

drop policy if exists warehouses_read on public.warehouses;
drop policy if exists warehouses_write on public.warehouses;
create policy warehouses_read on public.warehouses for select to authenticated using (true);
create policy warehouses_write on public.warehouses for all to authenticated using (private.has_role(array['admin','fleet','maint'])) with check (private.has_role(array['admin','fleet','maint']));

drop policy if exists inventory_items_read on public.inventory_items;
drop policy if exists inventory_items_write on public.inventory_items;
create policy inventory_items_read on public.inventory_items for select to authenticated using (private.can_module('inventory','read'));
create policy inventory_items_write on public.inventory_items for all to authenticated using (private.can_module('inventory','write')) with check (private.can_module('inventory','write'));

drop policy if exists stock_movements_read on public.stock_movements;
drop policy if exists stock_movements_write on public.stock_movements;
create policy stock_movements_read on public.stock_movements for select to authenticated using (private.can_module('movements','read'));
create policy stock_movements_write on public.stock_movements for insert to authenticated with check (private.can_module('movements','write'));

drop policy if exists maintenance_technicians_read on public.maintenance_technicians;
drop policy if exists maintenance_technicians_write on public.maintenance_technicians;
create policy maintenance_technicians_read on public.maintenance_technicians for select to authenticated using (private.can_module('maintenance','read') or private.can_module('work_orders','read'));
create policy maintenance_technicians_write on public.maintenance_technicians for all to authenticated using (private.has_role(array['admin','fleet','maint'])) with check (private.has_role(array['admin','fleet','maint']));

drop policy if exists maintenance_parts_read on public.maintenance_parts;
drop policy if exists maintenance_parts_write on public.maintenance_parts;
create policy maintenance_parts_read on public.maintenance_parts for select to authenticated using (private.can_module('maintenance','read'));
create policy maintenance_parts_write on public.maintenance_parts for all to authenticated using (private.can_module('maintenance','write')) with check (private.can_module('maintenance','write'));

grant select,update,delete on public.warehouses to authenticated;
grant select on public.inventory_items to authenticated;
grant update (code,name,category,brand,unit,barcode,warehouse_id,location,minimum_qty,maximum_qty,reorder_point,lead_time_days,active,notes,metadata) on public.inventory_items to authenticated;
grant select on public.stock_movements to authenticated;
grant select,insert,update,delete on public.maintenance_technicians,public.maintenance_parts to authenticated;
revoke insert on public.inventory_items from authenticated;
revoke insert,update,delete on public.stock_movements from authenticated;

insert into private.module_permissions(module_name,role,can_read,can_write) values
 ('maintenance','admin',true,true),('maintenance','mgmt',true,false),('maintenance','fleet',true,true),
 ('maintenance','pm',true,false),('maintenance','eng',true,false),('maintenance','maint',true,true),('maintenance','acct',true,false)
on conflict (module_name,role) do update set can_read=excluded.can_read, can_write=excluded.can_write;



-- Keep timestamps and database audit consistent for all new master-data tables.
do $$
declare t text;
begin
  foreach t in array array['warehouses','inventory_items','maintenance_technicians','maintenance_parts'] loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I',t,t);
    execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute function private.set_updated_at()',t,t);
    execute format('drop trigger if exists trg_%I_audit on public.%I',t,t);
    execute format('create trigger trg_%I_audit after insert or update or delete on public.%I for each row execute function private.audit_change()',t,t);
  end loop;
end $$;

notify pgrst,'reload schema';
