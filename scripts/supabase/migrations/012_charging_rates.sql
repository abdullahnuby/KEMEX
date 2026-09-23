-- 012 — Real internal charging rates. No seeded/mock tariff data.
alter table public.asset_types
  add column if not exists billing_unit text,
  add column if not exists billing_rate numeric(14,3) check (billing_rate is null or billing_rate >= 0),
  add column if not exists billing_minimum numeric(14,3) check (billing_minimum is null or billing_minimum >= 0);

create table if not exists public.charging_rates (
  id text primary key,
  asset_type_id text references public.asset_types(id) on delete cascade,
  asset_id text references public.assets(id) on delete cascade,
  project_id text references public.projects(id) on delete cascade,
  unit text not null check (unit in ('ساعة','يوم','كم','رحلة','نقلة')),
  rate numeric(14,3) not null check (rate >= 0),
  minimum numeric(14,3) check (minimum is null or minimum >= 0),
  active boolean not null default true,
  valid_from date, valid_to date,
  notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (num_nonnulls(asset_type_id,asset_id,project_id) <= 1)
);
create index if not exists charging_rates_type_idx on public.charging_rates(asset_type_id) where asset_type_id is not null;
create index if not exists charging_rates_asset_idx on public.charging_rates(asset_id) where asset_id is not null;
create index if not exists charging_rates_project_idx on public.charging_rates(project_id) where project_id is not null;
alter table public.charging_rates enable row level security;
drop policy if exists charging_rates_read on public.charging_rates;
drop policy if exists charging_rates_write on public.charging_rates;
create policy charging_rates_read on public.charging_rates for select to authenticated using (true);
create policy charging_rates_write on public.charging_rates for all to authenticated using (private.has_role(array['admin','fleet'])) with check (private.has_role(array['admin','fleet']));
grant select,insert,update,delete on public.charging_rates to authenticated;
drop trigger if exists trg_charging_rates_updated_at on public.charging_rates;
create trigger trg_charging_rates_updated_at before update on public.charging_rates for each row execute function private.set_updated_at();
drop trigger if exists trg_charging_rates_audit on public.charging_rates;
create trigger trg_charging_rates_audit after insert or update or delete on public.charging_rates for each row execute function private.audit_change();
notify pgrst,'reload schema';
