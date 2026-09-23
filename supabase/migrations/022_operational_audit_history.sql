-- KEMEX 0.50 — Operational audit coverage + immutable workflow history
-- Extends the existing trusted audit layer to the schema recovered in 018 and
-- records status transitions for core operational workflows in approval_events.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'breakdown_events', 'downtime_tracking', 'maintenance_cost_items',
    'maintenance_transports', 'trip_costs', 'trip_permits', 'trips'
  ] LOOP
    EXECUTE format('drop trigger if exists trg_%I_audit on public.%I', t, t);
    EXECUTE format('create trigger trg_%I_audit after insert or update or delete on public.%I for each row execute function private.audit_change()', t, t);
  END LOOP;
END $$;

-- Work-order status history: the generic approval_events table is reused as the
-- immutable workflow timeline. The client has no insert/update/delete rights.
CREATE OR REPLACE FUNCTION private.log_work_order_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.approval_events(id,module_name,record_id,from_status,to_status,acted_by,metadata)
    VALUES ('APR-' || replace(gen_random_uuid()::text,'-',''),'maintenance',NEW.id,
            CASE WHEN TG_OP='UPDATE' THEN OLD.status ELSE NULL END,NEW.status,auth.uid(),
            jsonb_build_object('source','db-trigger','table','work_orders','operation',TG_OP));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_work_orders_status_history ON public.work_orders;
CREATE TRIGGER trg_work_orders_status_history
AFTER INSERT OR UPDATE OF status ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION private.log_work_order_status();

-- Transportation status history.
CREATE OR REPLACE FUNCTION private.log_trip_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.approval_events(id,module_name,record_id,from_status,to_status,acted_by,metadata)
    VALUES ('APR-' || replace(gen_random_uuid()::text,'-',''),'trips',NEW.id,
            CASE WHEN TG_OP='UPDATE' THEN OLD.status ELSE NULL END,NEW.status,auth.uid(),
            jsonb_build_object('source','db-trigger','table','trips','operation',TG_OP));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trips_status_history ON public.trips;
CREATE TRIGGER trg_trips_status_history
AFTER INSERT OR UPDATE OF status ON public.trips
FOR EACH ROW EXECUTE FUNCTION private.log_trip_status();

CREATE INDEX IF NOT EXISTS approval_events_module_status_time_idx
  ON public.approval_events(module_name,to_status,acted_at DESC);

COMMENT ON FUNCTION private.log_work_order_status() IS 'Immutable maintenance workflow history written by database trigger.';
COMMENT ON FUNCTION private.log_trip_status() IS 'Immutable transportation workflow history written by database trigger.';
