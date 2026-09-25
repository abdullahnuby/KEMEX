-- KEMEX — Hardens maintenance trigger/helper functions by pinning search_path.
--
-- This migration is intentionally self-contained: the maintenance functions below
-- are defined here BEFORE ALTER FUNCTION is executed, so a brand-new database can
-- replay migrations 001..N without depending on objects that existed only in an
-- older/manual production database.

-- ============================================================================
-- 1. BREAKDOWN DOWNTIME CALCULATION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calc_breakdown_downtime()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- A breakdown's stored downtime is derived from the actual breakdown and
  -- recovery timestamps. Keep an open breakdown at NULL until recovery exists.
  IF NEW.recovery_datetime IS NULL THEN
    NEW.downtime_hours := NULL;
  ELSE
    IF NEW.recovery_datetime < NEW.breakdown_datetime THEN
      RAISE EXCEPTION USING
        MESSAGE = 'وقت الاستعادة لا يمكن أن يسبق وقت العطل',
        ERRCODE = '22023';
    END IF;

    NEW.downtime_hours := ROUND(
      (EXTRACT(EPOCH FROM (NEW.recovery_datetime - NEW.breakdown_datetime)) / 3600)::numeric,
      2
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- ============================================================================
-- 2. DOWNTIME COST CALCULATION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calc_downtime_costs()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  effective_duration numeric;
BEGIN
  -- Costs are materialized when an interval has an end timestamp. For an open
  -- interval, keep duration/cost fields at zero until the record is closed.
  IF NEW.end_datetime IS NULL THEN
    NEW.duration_hours := NULL;
    NEW.driver_downtime_cost := 0;
    NEW.lost_revenue_total := 0;
    RETURN NEW;
  END IF;

  IF NEW.end_datetime < NEW.start_datetime THEN
    RAISE EXCEPTION USING
      MESSAGE = 'وقت نهاية التوقف لا يمكن أن يسبق وقت البداية',
      ERRCODE = '22023';
  END IF;

  effective_duration := ROUND(
    (EXTRACT(EPOCH FROM (NEW.end_datetime - NEW.start_datetime)) / 3600)::numeric,
    2
  );

  NEW.duration_hours := effective_duration;
  NEW.driver_downtime_cost := ROUND(
    (effective_duration / 24) * GREATEST(COALESCE(NEW.driver_daily_rate, 0), 0),
    2
  );
  NEW.lost_revenue_total := ROUND(
    (effective_duration / 24) * GREATEST(COALESCE(NEW.lost_revenue_per_day, 0), 0),
    2
  );

  RETURN NEW;
END;
$function$;

-- ============================================================================
-- 3. WORK-ORDER PARTS TOTAL REFRESH
-- ============================================================================
CREATE OR REPLACE FUNCTION public.refresh_work_order_totals()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  target_work_order_id text;
BEGIN
  target_work_order_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.work_order_id ELSE NEW.work_order_id END;

  IF target_work_order_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  UPDATE public.work_orders wo
  SET parts_cost = ROUND(COALESCE((
    SELECT SUM(
      GREATEST(COALESCE(mp.issued_qty, 0) - COALESCE(mp.returned_qty, 0), 0)
      * GREATEST(COALESCE(mp.unit_cost, 0), 0)
    )
    FROM public.maintenance_parts mp
    WHERE mp.work_order_id = target_work_order_id
  ), 0), 2)
  WHERE wo.id = target_work_order_id;

  -- A maintenance part row can only have one work order. On an UPDATE the
  -- work-order id can change, so refresh the old parent too.
  IF TG_OP = 'UPDATE' AND OLD.work_order_id IS DISTINCT FROM NEW.work_order_id THEN
    UPDATE public.work_orders wo
    SET parts_cost = ROUND(COALESCE((
      SELECT SUM(
        GREATEST(COALESCE(mp.issued_qty, 0) - COALESCE(mp.returned_qty, 0), 0)
        * GREATEST(COALESCE(mp.unit_cost, 0), 0)
      )
      FROM public.maintenance_parts mp
      WHERE mp.work_order_id = OLD.work_order_id
    ), 0), 2)
    WHERE wo.id = OLD.work_order_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;

-- Trigger installation is performed after the recovered maintenance tables exist
-- in migration 018. This migration only makes the helper definitions available
-- before the hardening ALTER FUNCTION statements below.

-- Keep all three functions pinned to trusted schemas after creation as well.
ALTER FUNCTION public.calc_breakdown_downtime() SET search_path = public, pg_catalog;
ALTER FUNCTION public.calc_downtime_costs() SET search_path = public, pg_catalog;
ALTER FUNCTION public.refresh_work_order_totals() SET search_path = public, pg_catalog;

-- Trigger functions do not form part of the application RPC surface.
REVOKE ALL ON FUNCTION public.calc_breakdown_downtime() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.calc_downtime_costs() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_work_order_totals() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.calc_breakdown_downtime() IS
  'KEMEX maintenance trigger: derives breakdown downtime hours from recovery and breakdown timestamps.';
COMMENT ON FUNCTION public.calc_downtime_costs() IS
  'KEMEX maintenance trigger: derives downtime duration, driver downtime cost, and lost revenue.';
COMMENT ON FUNCTION public.refresh_work_order_totals() IS
  'KEMEX maintenance trigger: synchronizes work_orders.parts_cost from issued maintenance parts.';
