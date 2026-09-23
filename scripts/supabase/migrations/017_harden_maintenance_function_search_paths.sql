-- Hardens trigger/helper functions by pinning search_path.
alter function public.calc_breakdown_downtime() set search_path = public, pg_catalog;
alter function public.calc_downtime_costs() set search_path = public, pg_catalog;
alter function public.refresh_work_order_totals() set search_path = public, pg_catalog;
