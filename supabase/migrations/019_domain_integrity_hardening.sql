-- KEMEX — Domain integrity hardening
-- Adds forward-looking constraints without renaming the existing short TypeScript fields.
-- Existing rows are intentionally not rewritten. NOT VALID allows production adoption
-- while enforcing the approved vocabulary for new/updated rows.

alter table public.assets
  add constraint assets_status_domain_ck check (
    status in ('متاح','محجوز','مخصص لمشروع','يعمل','تحت الصيانة','خارج الخدمة','متوقف مؤقتًا','موقوف','غير نشط','مستبعد')
  ) not valid;

alter table public.assets
  add constraint assets_condition_domain_ck check (
    technical_condition in ('سليم','جيد','يحتاج فحص','يحتاج صيانة','يحتاج إصلاح','تالف','حرج')
  ) not valid;

alter table public.work_orders
  add constraint work_orders_costs_nonnegative_ck check (
    labor_cost >= 0 and parts_cost >= 0 and vendor_cost >= 0 and
    (downtime_hours is null or downtime_hours >= 0)
  ) not valid;

alter table public.fuel_operations
  add constraint fuel_operations_amount_integrity_ck check (
    qty >= 0 and price >= 0 and total >= 0
  ) not valid;

create index if not exists assets_status_condition_idx
  on public.assets(status, technical_condition);

create index if not exists work_orders_plan_status_idx
  on public.work_orders(plan_id, status, completed);

create index if not exists fuel_operations_asset_date_idx
  on public.fuel_operations(asset_id, operation_date desc, meter);
