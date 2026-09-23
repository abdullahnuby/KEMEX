-- KEMEX 0.51 — Action-level authorization and database-enforced workflow ownership.
-- The UI remains a convenience layer; sensitive status transitions are denied here.

CREATE OR REPLACE FUNCTION private.kemex_can_transition(module_name text, from_status text, to_status text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE r text;
BEGIN
  SELECT role INTO r FROM public.profiles WHERE id = auth.uid() AND active = true;
  IF r IS NULL THEN RETURN false; END IF;
  IF r = 'admin' THEN RETURN true; END IF;

  IF module_name = 'maintenance' THEN
    RETURN r IN ('maint','fleet')
      AND to_status IN ('مفتوح','قيد التنفيذ','بانتظار قطع غيار','مكتمل','ملغى');
  ELSIF module_name = 'trips' THEN
    IF to_status = 'paid' THEN RETURN r = 'acct'; END IF;
    IF to_status = 'invoiced' THEN RETURN r IN ('acct','fleet','pm'); END IF;
    RETURN r IN ('fleet','pm')
      AND to_status IN ('assigned','dispatched','in_transit','delivered','received','cancelled');
  END IF;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION private.validate_work_order_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT private.kemex_can_transition('maintenance', OLD.status, NEW.status) THEN
      RAISE EXCEPTION 'غير مسموح للدور الحالي بتغيير حالة أمر الصيانة من % إلى %', OLD.status, NEW.status USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_work_orders_action_authorization ON public.work_orders;
CREATE TRIGGER trg_work_orders_action_authorization
BEFORE UPDATE OF status ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION private.validate_work_order_action();

CREATE OR REPLACE FUNCTION private.validate_trip_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT private.kemex_can_transition('trips', OLD.status, NEW.status) THEN
      RAISE EXCEPTION 'غير مسموح للدور الحالي بتغيير حالة الرحلة من % إلى %', OLD.status, NEW.status USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trips_action_authorization ON public.trips;
CREATE TRIGGER trg_trips_action_authorization
BEFORE UPDATE OF status ON public.trips
FOR EACH ROW EXECUTE FUNCTION private.validate_trip_action();

-- Trusted RPCs for high-value workflow actions. They intentionally expose only
-- the fields that constitute the business action, rather than generic table writes.
CREATE OR REPLACE FUNCTION public.transition_trip(p_id uuid, p_to_status text, p_invoice_id text DEFAULT NULL)
RETURNS public.trips
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE v public.trips;
BEGIN
  SELECT * INTO v FROM public.trips WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'الرحلة غير موجودة'; END IF;
  IF NOT private.kemex_can_transition('trips', v.status, p_to_status) THEN
    RAISE EXCEPTION 'غير مصرح بتنفيذ انتقال الرحلة من % إلى %', v.status, p_to_status USING ERRCODE = '42501';
  END IF;
  IF p_to_status = 'invoiced' AND nullif(trim(coalesce(p_invoice_id,'')),'') IS NULL AND v.invoice_id IS NULL THEN
    RAISE EXCEPTION 'رقم الفاتورة مطلوب قبل فوترة الرحلة';
  END IF;
  UPDATE public.trips
     SET status = p_to_status,
         invoice_id = CASE WHEN p_invoice_id IS NOT NULL AND trim(p_invoice_id) <> '' THEN trim(p_invoice_id) ELSE invoice_id END,
         updated_at = now()
   WHERE id = p_id
   RETURNING * INTO v;
  RETURN v;
END;
$$;
REVOKE ALL ON FUNCTION public.transition_trip(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_trip(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.transition_work_order(p_id text, p_to_status text)
RETURNS public.work_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE v public.work_orders;
BEGIN
  SELECT * INTO v FROM public.work_orders WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'أمر الصيانة غير موجود'; END IF;
  IF NOT private.kemex_can_transition('maintenance', v.status, p_to_status) THEN
    RAISE EXCEPTION 'غير مصرح بتنفيذ انتقال أمر الصيانة من % إلى %', v.status, p_to_status USING ERRCODE = '42501';
  END IF;
  UPDATE public.work_orders SET status = p_to_status, updated_at = now() WHERE id = p_id RETURNING * INTO v;
  RETURN v;
END;
$$;
REVOKE ALL ON FUNCTION public.transition_work_order(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_work_order(text,text) TO authenticated;

COMMENT ON FUNCTION private.kemex_can_transition(text,text,text) IS 'Central database action authorization for sensitive workflow transitions.';
COMMENT ON FUNCTION public.transition_trip(uuid,text,text) IS 'Trusted trip workflow action; bypasses generic client status mutation.';
COMMENT ON FUNCTION public.transition_work_order(text,text) IS 'Trusted maintenance workflow action; bypasses generic client status mutation.';
