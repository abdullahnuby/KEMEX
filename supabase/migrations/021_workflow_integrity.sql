-- KEMEX 0.48.x - workflow integrity hardening
-- Enforces the most critical Transportation state transitions at database level.
-- Generic purchase/invoice workflows remain application-enforced because they are stored in JSONB module records.

create or replace function public.kemex_validate_trip_transition()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if not (
      (old.status = 'draft' and new.status in ('assigned','cancelled')) or
      (old.status = 'assigned' and new.status in ('dispatched','cancelled')) or
      (old.status = 'dispatched' and new.status in ('in_transit','cancelled')) or
      (old.status = 'in_transit' and new.status in ('delivered','cancelled')) or
      (old.status = 'delivered' and new.status = 'received') or
      (old.status = 'received' and new.status = 'invoiced') or
      (old.status = 'invoiced' and new.status = 'paid')
    ) then
      raise exception 'KEMEX: invalid trip status transition from % to %', old.status, new.status;
    end if;
  end if;

  if new.status = 'invoiced' and coalesce(nullif(trim(new.invoice_id::text), ''), '') = '' then
    raise exception 'KEMEX: invoiced trip requires invoice_id';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_kemex_validate_trip_transition on public.trips;
create trigger trg_kemex_validate_trip_transition
before update on public.trips
for each row execute function public.kemex_validate_trip_transition();

create index if not exists idx_trips_status_billable_invoice
  on public.trips(status, is_billable, invoice_id);

comment on function public.kemex_validate_trip_transition() is
  'KEMEX enterprise workflow guard for transportation lifecycle transitions.';
