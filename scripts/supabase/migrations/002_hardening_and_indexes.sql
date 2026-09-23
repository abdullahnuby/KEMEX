-- TFMS Web v0.3 production hardening
-- Keeps updated_at consistent for tables written by the web application.

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public, private
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function private.set_updated_at() from public;

do $$
declare
  t text;
begin
  foreach t in array array['profiles','organization_settings','projects','drivers','contracts','assets','assignments','operations','work_orders','fuel_operations','tfms_module_records'] loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I', t, t);
    execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute function private.set_updated_at()', t, t);
  end loop;
end $$;

create index if not exists assets_license_expiry_idx on public.assets(license_expiry);
create index if not exists assets_insurance_expiry_idx on public.assets(insurance_expiry);
create index if not exists drivers_license_expiry_idx on public.drivers(license_expiry);
create index if not exists contracts_end_date_idx on public.contracts(end_date);
create index if not exists work_orders_status_idx on public.work_orders(status);
create index if not exists work_orders_priority_idx on public.work_orders(priority);
create index if not exists fuel_operations_status_idx on public.fuel_operations(status);
create index if not exists audit_log_entity_idx on public.audit_log(entity, occurred_at desc);
create index if not exists module_records_record_idx on public.tfms_module_records(module_name, record_id);

-- Prevent an authenticated client from attributing an audit row to another user.
drop policy if exists audit_insert on public.audit_log;
create policy audit_insert on public.audit_log
for insert to authenticated
with check ((select auth.uid()) = user_id);
