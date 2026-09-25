-- KEMEX 0.53 — Driver transportation execution workflow.
-- Incremental extension of the existing trips/RBAC/audit/attachment/notification model.

-- 1) Driver identity mapping + role vocabulary.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS driver_id text REFERENCES public.drivers(id) ON DELETE SET NULL;

-- The original 001_initial_schema migration created profiles_role_check
-- with only the legacy roles. Remove it so the new driver role domain
-- becomes the single authoritative role vocabulary.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_domain_ck;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_domain_ck CHECK (
    role IN ('admin','mgmt','fleet','pm','eng','maint','acct','driver')
  ) NOT VALID;

CREATE INDEX IF NOT EXISTS profiles_driver_id_idx
  ON public.profiles(driver_id)
  WHERE driver_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_driver_unique_idx
  ON public.profiles(driver_id)
  WHERE driver_id IS NOT NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_driver_role_consistency_ck;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_driver_role_consistency_ck CHECK (
    (role = 'driver' AND driver_id IS NOT NULL)
    OR
    (role <> 'driver' AND driver_id IS NULL)
  ) NOT VALID;

-- Authenticated users must not be able to update sensitive profile columns
-- directly. Admin-side profile workflows may update only the explicitly
-- supported mutable fields.
REVOKE UPDATE
ON public.profiles
FROM authenticated;

GRANT UPDATE (
  full_name,
  role,
  active,
  driver_id
)
ON public.profiles
TO authenticated;

-- 2) Configurable geofence radius. One company-level rule is intentionally provider-neutral.
ALTER TABLE public.organization_settings
  ADD COLUMN IF NOT EXISTS trip_geofence_radius_m integer NOT NULL DEFAULT 1000;

ALTER TABLE public.organization_settings
  DROP CONSTRAINT IF EXISTS organization_settings_trip_geofence_radius_ck;

ALTER TABLE public.organization_settings
  ADD CONSTRAINT organization_settings_trip_geofence_radius_ck
  CHECK (trip_geofence_radius_m > 0)
  NOT VALID;

-- 3) Operational trip fields. Existing commercial trip status remains intact; execution_status
-- is the driver lifecycle and is deliberately separate from invoicing/accounting states.
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS reference_number text,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS operational_instructions text,
  ADD COLUMN IF NOT EXISTS pickup_instructions text,
  ADD COLUMN IF NOT EXISTS delivery_instructions text,
  ADD COLUMN IF NOT EXISTS pickup_latitude numeric,
  ADD COLUMN IF NOT EXISTS pickup_longitude numeric,
  ADD COLUMN IF NOT EXISTS delivery_latitude numeric,
  ADD COLUMN IF NOT EXISTS delivery_longitude numeric,
  ADD COLUMN IF NOT EXISTS execution_status text,
  ADD COLUMN IF NOT EXISTS exception_status text;

ALTER TABLE public.trips
  DROP CONSTRAINT IF EXISTS trips_priority_ck;

ALTER TABLE public.trips
  ADD CONSTRAINT trips_priority_ck
  CHECK (priority IN ('low','normal','high','critical'))
  NOT VALID;

ALTER TABLE public.trips
  DROP CONSTRAINT IF EXISTS trips_execution_status_ck;

ALTER TABLE public.trips
  ADD CONSTRAINT trips_execution_status_ck
  CHECK (
    execution_status IS NULL OR execution_status IN (
      'assigned',
      'to_pickup',
      'arrived_pickup',
      'pickup_confirmed',
      'in_transit',
      'arrived_delivery',
      'delivered',
      'completed'
    )
  )
  NOT VALID;

ALTER TABLE public.trips
  DROP CONSTRAINT IF EXISTS trips_exception_status_ck;

ALTER TABLE public.trips
  ADD CONSTRAINT trips_exception_status_ck
  CHECK (
    exception_status IS NULL OR exception_status IN (
      'BREAKDOWN',
      'EMERGENCY',
      'PICKUP_PROBLEM',
      'DELIVERY_PROBLEM',
      'LOCATION_NOT_FOUND',
      'LOCATION_CLOSED',
      'CARGO_NOT_READY',
      'QUANTITY_MISMATCH',
      'ADDRESS_PROBLEM',
      'CUSTOMER_NOT_AVAILABLE',
      'CUSTOMER_REFUSED_DELIVERY',
      'DOCUMENT_PROBLEM',
      'CARGO_DAMAGE',
      'ROAD_PROBLEM',
      'GPS_PROBLEM',
      'OTHER'
    )
  )
  NOT VALID;

ALTER TABLE public.trips
  DROP CONSTRAINT IF EXISTS trips_pickup_latitude_ck;

ALTER TABLE public.trips
  ADD CONSTRAINT trips_pickup_latitude_ck
  CHECK (pickup_latitude BETWEEN -90 AND 90)
  NOT VALID;

ALTER TABLE public.trips
  DROP CONSTRAINT IF EXISTS trips_pickup_longitude_ck;

ALTER TABLE public.trips
  ADD CONSTRAINT trips_pickup_longitude_ck
  CHECK (pickup_longitude BETWEEN -180 AND 180)
  NOT VALID;

ALTER TABLE public.trips
  DROP CONSTRAINT IF EXISTS trips_delivery_latitude_ck;

ALTER TABLE public.trips
  ADD CONSTRAINT trips_delivery_latitude_ck
  CHECK (delivery_latitude BETWEEN -90 AND 90)
  NOT VALID;

ALTER TABLE public.trips
  DROP CONSTRAINT IF EXISTS trips_delivery_longitude_ck;

ALTER TABLE public.trips
  ADD CONSTRAINT trips_delivery_longitude_ck
  CHECK (delivery_longitude BETWEEN -180 AND 180)
  NOT VALID;

UPDATE public.trips
SET execution_status = CASE
  WHEN status = 'assigned' THEN 'assigned'
  WHEN status IN ('dispatched','in_transit') THEN 'in_transit'
  WHEN status IN ('delivered','received','invoiced','paid') THEN 'completed'
  ELSE NULL
END
WHERE execution_status IS NULL;

CREATE INDEX IF NOT EXISTS trips_execution_status_idx
  ON public.trips(execution_status, scheduled_start DESC);

CREATE INDEX IF NOT EXISTS trips_exception_status_idx
  ON public.trips(exception_status, updated_at DESC)
  WHERE exception_status IS NOT NULL;

CREATE OR REPLACE FUNCTION private.sync_trip_execution_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.driver_id IS NOT NULL
     AND NEW.execution_status IS NULL THEN

    IF NEW.status IN ('assigned','dispatched') THEN
      NEW.execution_status := 'assigned';

    ELSIF NEW.status IN ('in_transit','delivered','received','invoiced','paid') THEN
      NEW.execution_status :=
        CASE
          WHEN NEW.status = 'in_transit'
            THEN 'in_transit'
          ELSE 'completed'
        END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_trip_execution_status
ON public.trips;

CREATE TRIGGER trg_sync_trip_execution_status
BEFORE INSERT OR UPDATE OF driver_id,status
ON public.trips
FOR EACH ROW
EXECUTE FUNCTION private.sync_trip_execution_status();

-- 4) Immutable operational event stream for driver execution.
CREATE TABLE IF NOT EXISTS public.trip_execution_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  from_status text,
  to_status text,
  actor_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  driver_id text REFERENCES public.drivers(id) ON DELETE SET NULL,
  vehicle_id text REFERENCES public.assets(id) ON DELETE SET NULL,
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  latitude numeric,
  longitude numeric,
  distance_meters numeric,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  document_id uuid,
  notes text,
  CONSTRAINT trip_execution_events_latitude_ck
    CHECK (latitude BETWEEN -90 AND 90),
  CONSTRAINT trip_execution_events_longitude_ck
    CHECK (longitude BETWEEN -180 AND 180),
  CONSTRAINT trip_execution_events_distance_ck
    CHECK (
      distance_meters IS NULL
      OR distance_meters >= 0
    )
);

CREATE INDEX IF NOT EXISTS trip_execution_events_trip_time_idx
  ON public.trip_execution_events(trip_id, occurred_at);

CREATE INDEX IF NOT EXISTS trip_execution_events_type_time_idx
  ON public.trip_execution_events(event_type, occurred_at DESC);

ALTER TABLE public.trip_execution_events
  ADD COLUMN IF NOT EXISTS sequence_no bigint GENERATED ALWAYS AS IDENTITY;

-- 5) Structured receipts. Binary files stay in the existing object storage bucket.
CREATE TABLE IF NOT EXISTS public.trip_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  receipt_type text NOT NULL,
  attachment_id uuid NOT NULL
    REFERENCES public.attachment_metadata(id)
    ON DELETE RESTRICT,
  uploaded_by uuid NOT NULL
    REFERENCES public.profiles(id)
    ON DELETE RESTRICT,
  uploaded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  latitude numeric,
  longitude numeric,
  distance_meters numeric,

  CONSTRAINT trip_receipts_type_ck
    CHECK (
      receipt_type IN (
        'PICKUP_RECEIPT',
        'DELIVERY_RECEIPT'
      )
    ),

  CONSTRAINT trip_receipts_latitude_ck
    CHECK (latitude BETWEEN -90 AND 90),

  CONSTRAINT trip_receipts_longitude_ck
    CHECK (longitude BETWEEN -180 AND 180),

  CONSTRAINT trip_receipts_distance_ck
    CHECK (
      distance_meters IS NULL
      OR distance_meters >= 0
    ),

  UNIQUE (trip_id, receipt_type)
);

CREATE INDEX IF NOT EXISTS trip_receipts_trip_idx
  ON public.trip_receipts(trip_id, uploaded_at DESC);

ALTER TABLE public.trip_execution_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_receipts ENABLE ROW LEVEL SECURITY;

-- 6) Structured driver exceptions. They never delete or reset the trip.
CREATE TABLE IF NOT EXISTS public.trip_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  exception_type text NOT NULL,
  category text,
  reason text,
  notes text,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'reported',
  reported_by uuid NOT NULL
    REFERENCES public.profiles(id)
    ON DELETE RESTRICT,
  driver_id text REFERENCES public.drivers(id) ON DELETE SET NULL,
  vehicle_id text REFERENCES public.assets(id) ON DELETE SET NULL,
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  linked_attachment_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  latitude numeric,
  longitude numeric,

  CONSTRAINT trip_exceptions_type_ck
    CHECK (
      exception_type IN (
        'BREAKDOWN',
        'EMERGENCY',
        'PICKUP_PROBLEM',
        'DELIVERY_PROBLEM',
        'LOCATION_NOT_FOUND',
        'LOCATION_CLOSED',
        'CARGO_NOT_READY',
        'QUANTITY_MISMATCH',
        'ADDRESS_PROBLEM',
        'CUSTOMER_NOT_AVAILABLE',
        'CUSTOMER_REFUSED_DELIVERY',
        'DOCUMENT_PROBLEM',
        'CARGO_DAMAGE',
        'ROAD_PROBLEM',
        'GPS_PROBLEM',
        'OTHER'
      )
    ),

  CONSTRAINT trip_exceptions_priority_ck
    CHECK (
      priority IN ('normal','high','critical')
    ),

  CONSTRAINT trip_exceptions_status_ck
    CHECK (
      status IN (
        'reported',
        'in_progress',
        'resolved',
        'closed'
      )
    ),

  CONSTRAINT trip_exceptions_latitude_ck
    CHECK (latitude BETWEEN -90 AND 90),

  CONSTRAINT trip_exceptions_longitude_ck
    CHECK (longitude BETWEEN -180 AND 180),

  CONSTRAINT trip_exceptions_resolve_consistency_ck
    CHECK (
      resolved_at IS NULL
      OR resolved_by IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS trip_exceptions_trip_time_idx
  ON public.trip_exceptions(trip_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS trip_exceptions_open_idx
  ON public.trip_exceptions(status, priority, occurred_at DESC);

ALTER TABLE public.trip_exceptions ENABLE ROW LEVEL SECURITY;

-- 7) Provider-neutral distance calculation.
CREATE OR REPLACE FUNCTION private.trip_distance_meters(
  p_latitude numeric,
  p_longitude numeric,
  p_target_latitude numeric,
  p_target_longitude numeric
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_phi1 numeric;
  v_phi2 numeric;
  v_dphi numeric;
  v_dlambda numeric;
  v_a numeric;
BEGIN
  IF p_latitude IS NULL
     OR p_longitude IS NULL
     OR p_target_latitude IS NULL
     OR p_target_longitude IS NULL THEN
    RETURN NULL;
  END IF;

  v_phi1 := radians(p_latitude);
  v_phi2 := radians(p_target_latitude);
  v_dphi := radians(p_target_latitude - p_latitude);
  v_dlambda := radians(p_target_longitude - p_longitude);

  v_a :=
    power(sin(v_dphi / 2), 2)
    + cos(v_phi1)
      * cos(v_phi2)
      * power(sin(v_dlambda / 2), 2);

  RETURN 6371000
    * 2
    * atan2(
        sqrt(v_a),
        sqrt(greatest(0, 1 - v_a))
      );
END;
$$;

CREATE OR REPLACE FUNCTION private.driver_trip_allowed(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.trips t
      ON t.driver_id = p.driver_id
    WHERE p.id = auth.uid()
      AND p.active = true
      AND p.role = 'driver'
      AND t.id = p_trip_id
  )
$$;

CREATE OR REPLACE FUNCTION private.trip_geofence_distance(
  p_trip_id uuid,
  p_latitude numeric,
  p_longitude numeric,
  p_target text
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  t public.trips;
  v_distance numeric;
BEGIN
  SELECT *
  INTO t
  FROM public.trips
  WHERE id = p_trip_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'الرحلة غير موجودة';
  END IF;

  IF p_latitude IS NULL
     OR p_longitude IS NULL THEN
    RAISE EXCEPTION 'تعذر التحقق من الموقع';
  END IF;

  IF p_target = 'pickup' THEN

    IF t.pickup_latitude IS NULL
       OR t.pickup_longitude IS NULL THEN
      RAISE EXCEPTION 'إحداثيات موقع التحميل غير مهيأة للرحلة';
    END IF;

    v_distance := private.trip_distance_meters(
      p_latitude,
      p_longitude,
      t.pickup_latitude,
      t.pickup_longitude
    );

  ELSE

    IF t.delivery_latitude IS NULL
       OR t.delivery_longitude IS NULL THEN
      RAISE EXCEPTION 'إحداثيات موقع التسليم غير مهيأة للرحلة';
    END IF;

    v_distance := private.trip_distance_meters(
      p_latitude,
      p_longitude,
      t.delivery_latitude,
      t.delivery_longitude
    );

  END IF;

  RETURN v_distance;
END;
$$;

-- Validate driver coordinates against the configured company geofence.
-- A documented operations override may be used only for the same action and stage.
CREATE OR REPLACE FUNCTION private.validate_driver_trip_geofence(
  p_trip_id uuid,
  p_latitude numeric,
  p_longitude numeric,
  p_target text,
  p_action text
)
RETURNS TABLE(
  distance_meters numeric,
  override_event_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  t public.trips;
  v_distance numeric;
  v_radius integer;
  v_override_event_id uuid;
BEGIN
  IF p_target NOT IN ('pickup', 'delivery') THEN
    RAISE EXCEPTION
      'هدف التحقق الجغرافي غير صالح';
  END IF;

  IF p_action NOT IN (
    'arrived_pickup',
    'pickup_confirmed',
    'arrived_delivery',
    'delivered'
  ) THEN
    RAISE EXCEPTION
      'إجراء التحقق الجغرافي غير صالح';
  END IF;

  SELECT *
  INTO t
  FROM public.trips
  WHERE id = p_trip_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'الرحلة غير موجودة';
  END IF;

  IF p_latitude IS NULL
     OR p_longitude IS NULL THEN
    RAISE EXCEPTION
      'إحداثيات الموقع الحالية مطلوبة للتحقق الجغرافي';
  END IF;

  IF p_target = 'pickup' THEN

    IF t.pickup_latitude IS NULL
       OR t.pickup_longitude IS NULL THEN
      RAISE EXCEPTION
        'إحداثيات موقع التحميل غير مهيأة للرحلة';
    END IF;

    v_distance := private.trip_distance_meters(
      p_latitude,
      p_longitude,
      t.pickup_latitude,
      t.pickup_longitude
    );

  ELSE

    IF t.delivery_latitude IS NULL
       OR t.delivery_longitude IS NULL THEN
      RAISE EXCEPTION
        'إحداثيات موقع التسليم غير مهيأة للرحلة';
    END IF;

    v_distance := private.trip_distance_meters(
      p_latitude,
      p_longitude,
      t.delivery_latitude,
      t.delivery_longitude
    );

  END IF;

  SELECT coalesce(trip_geofence_radius_m, 1000)
  INTO v_radius
  FROM public.organization_settings
  WHERE id = true;

  v_radius := coalesce(v_radius, 1000);

  IF v_distance IS NOT NULL
     AND v_distance <= v_radius THEN

    distance_meters := v_distance;
    override_event_id := NULL;

    RETURN NEXT;
    RETURN;
  END IF;

  SELECT e.id
  INTO v_override_event_id
  FROM public.trip_execution_events e
  JOIN public.profiles p
    ON p.id = e.actor_user_id
  WHERE e.trip_id = t.id
    AND e.event_type = 'MANUAL_GEOFENCE_OVERRIDE'
    AND coalesce(e.metadata ->> 'action', '') = p_action
    AND e.from_status IS NOT DISTINCT FROM t.execution_status
    AND e.to_status IS NOT DISTINCT FROM t.execution_status
    AND p.role IN ('fleet', 'pm')
  ORDER BY e.occurred_at DESC, e.sequence_no DESC
  LIMIT 1;

  IF v_override_event_id IS NULL THEN
    RAISE EXCEPTION
      'الموقع خارج النطاق الجغرافي المسموح. المسافة: % متر، والنطاق المسموح: % متر',
      round(v_distance, 2),
      v_radius;
  END IF;

  distance_meters := v_distance;
  override_event_id := v_override_event_id;

  RETURN NEXT;
END;
$$;

REVOKE ALL
ON FUNCTION private.validate_driver_trip_geofence(
  uuid,
  numeric,
  numeric,
  text,
  text
)
FROM PUBLIC;

-- Extend the existing central action matrix for the driver execution capability set.
CREATE OR REPLACE FUNCTION private.can_action(
  p_module text,
  p_action text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  r text := private.current_role();
BEGIN
  IF r IS NULL THEN
    RETURN false;
  END IF;

  IF r = 'admin' THEN
    RETURN true;
  END IF;

  RETURN CASE p_module || ':' || p_action

    WHEN 'users:manage'
      THEN false

    WHEN 'audit:read'
      THEN r IN ('mgmt','fleet','maint','acct')

    WHEN 'maintenance:transition'
      THEN r IN ('maint','fleet')

    WHEN 'trips:transition'
      THEN r IN ('fleet','pm','acct')

    WHEN 'purchases:approve'
      THEN r IN ('fleet','maint')

    WHEN 'purchases:receive'
      THEN r IN ('fleet','maint','acct')

    WHEN 'invoices:approve'
      THEN r = 'acct'

    WHEN 'invoices:pay'
      THEN r = 'acct'

    WHEN 'attachments:write'
      THEN r IN ('fleet','pm','eng','maint','acct')

    WHEN 'observability:write'
      THEN true

    WHEN 'trips:driver_execute'
      THEN r = 'driver'

    WHEN 'trips:driver_receipt'
      THEN r = 'driver'

    WHEN 'trips:driver_exception'
      THEN r = 'driver'

    WHEN 'trips:monitor'
      THEN r IN ('mgmt','fleet','pm')

    WHEN 'trips:exception_view'
      THEN r IN ('mgmt','fleet','pm')

    WHEN 'trips:exception_manage'
      THEN r IN ('fleet','pm')

    WHEN 'trips:exception_report'
      THEN r IN ('driver','fleet','pm')

    WHEN 'trips:override_geofence'
      THEN r IN ('fleet','pm')

    ELSE private.can_module(p_module, 'write')
  END;
END;
$$;

REVOKE EXECUTE
ON FUNCTION private.can_action(text,text)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION private.can_action(text,text)
TO authenticated;

-- Compatibility with the existing commercial trip workflow guards.
-- Driver execution RPCs may advance the legacy status only along the three
-- controlled boundaries that represent real execution milestones.
CREATE OR REPLACE FUNCTION public.kemex_validate_trip_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.status IS DISTINCT FROM OLD.status THEN

    IF private.current_role() = 'driver' THEN

      IF NOT private.driver_trip_allowed(NEW.id) THEN
        RAISE EXCEPTION
          'KEMEX: driver is not assigned to this trip'
          USING ERRCODE = '42501';
      END IF;

      IF NOT (
        (
          OLD.status IN ('assigned','dispatched')
          AND NEW.status = 'in_transit'
        )
        OR
        (
          OLD.status = 'in_transit'
          AND NEW.status = 'delivered'
        )
        OR
        (
          OLD.status = 'delivered'
          AND NEW.status = 'received'
        )
      ) THEN
        RAISE EXCEPTION
          'KEMEX: invalid driver trip status transition from % to %',
          OLD.status,
          NEW.status;
      END IF;

    ELSIF NOT (
      (
        OLD.status = 'draft'
        AND NEW.status IN ('assigned','cancelled')
      )
      OR
      (
        OLD.status = 'assigned'
        AND NEW.status IN ('dispatched','cancelled')
      )
      OR
      (
        OLD.status = 'dispatched'
        AND NEW.status IN ('in_transit','cancelled')
      )
      OR
      (
        OLD.status = 'in_transit'
        AND NEW.status IN ('delivered','cancelled')
      )
      OR
      (
        OLD.status = 'delivered'
        AND NEW.status = 'received'
      )
      OR
      (
        OLD.status = 'received'
        AND NEW.status = 'invoiced'
      )
      OR
      (
        OLD.status = 'invoiced'
        AND NEW.status = 'paid'
      )
    ) THEN
      RAISE EXCEPTION
        'KEMEX: invalid trip status transition from % to %',
        OLD.status,
        NEW.status;
    END IF;
  END IF;

  IF NEW.status = 'invoiced'
     AND coalesce(
       nullif(trim(NEW.invoice_id::text), ''),
       ''
     ) = '' THEN

    RAISE EXCEPTION
      'KEMEX: invoiced trip requires invoice_id';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.validate_trip_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.status IS DISTINCT FROM OLD.status THEN

    IF private.current_role() = 'driver' THEN

      IF NOT private.driver_trip_allowed(NEW.id) THEN
        RAISE EXCEPTION
          'غير مسموح للسائق تعديل رحلة غير مخصصة له'
          USING ERRCODE = '42501';
      END IF;

      IF NOT (
        (
          OLD.status IN ('assigned','dispatched')
          AND NEW.status = 'in_transit'
        )
        OR
        (
          OLD.status = 'in_transit'
          AND NEW.status = 'delivered'
        )
        OR
        (
          OLD.status = 'delivered'
          AND NEW.status = 'received'
        )
      ) THEN
        RAISE EXCEPTION
          'غير مسموح للسائق بتغيير حالة الرحلة من % إلى %',
          OLD.status,
          NEW.status
          USING ERRCODE = '42501';
      END IF;

    ELSIF NOT private.kemex_can_transition(
      'trips',
      OLD.status,
      NEW.status
    ) THEN

      RAISE EXCEPTION
        'غير مسموح للدور الحالي بتغيير حالة الرحلة من % إلى %',
        OLD.status,
        NEW.status
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 8) Normalize all high-value driver actions into one auditable insert helper.
CREATE OR REPLACE FUNCTION private.record_driver_event(
  p_trip_id uuid,
  p_event_type text,
  p_from_status text,
  p_to_status text,
  p_latitude numeric DEFAULT NULL,
  p_longitude numeric DEFAULT NULL,
  p_distance numeric DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_notes text DEFAULT NULL,
  p_document_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  t public.trips;
  v_id uuid;
BEGIN
  SELECT *
  INTO t
  FROM public.trips
  WHERE id = p_trip_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'الرحلة غير موجودة';
  END IF;

  INSERT INTO public.trip_execution_events(
    trip_id,
    event_type,
    from_status,
    to_status,
    actor_user_id,
    driver_id,
    vehicle_id,
    occurred_at,
    latitude,
    longitude,
    distance_meters,
    metadata,
    document_id,
    notes
  )
  VALUES (
    p_trip_id,
    p_event_type,
    p_from_status,
    p_to_status,
    auth.uid(),
    t.driver_id,
    t.truck_asset_id,
    now(),
    p_latitude,
    p_longitude,
    p_distance,
    coalesce(p_metadata,'{}'::jsonb),
    p_document_id,
    p_notes
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION private.enqueue_trip_notification(
  p_recipient uuid,
  p_event_type text,
  p_title text,
  p_body text,
  p_link text,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  INSERT INTO public.notification_outbox(
    recipient_id,
    event_type,
    title,
    body,
    link,
    payload
  )
  VALUES(
    p_recipient,
    p_event_type,
    p_title,
    p_body,
    p_link,
    p_payload
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.notify_trip_roles(
  p_roles text[],
  p_event_type text,
  p_title text,
  p_body text,
  p_trip_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT id
    FROM public.profiles
    WHERE active = true
      AND role = ANY(p_roles)
  LOOP

    PERFORM private.enqueue_trip_notification(
      r.id,
      p_event_type,
      p_title,
      p_body,
      '/trips/' || p_trip_id::text,
      jsonb_build_object('trip_id',p_trip_id)
    );

  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION private.prevent_trip_execution_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'سجل تنفيذ الرحلة غير قابل للتعديل أو الحذف'
    USING ERRCODE='42501';

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_trip_execution_events_immutable
ON public.trip_execution_events;

CREATE TRIGGER trg_trip_execution_events_immutable
BEFORE UPDATE OR DELETE
ON public.trip_execution_events
FOR EACH ROW
EXECUTE FUNCTION private.prevent_trip_execution_event_mutation();

-- 9) Driver state transitions. RLS blocks generic trip mutations; these RPCs are the only
-- driver path and enforce assignment, state, receipt, geofence and permission server-side.
CREATE OR REPLACE FUNCTION public.driver_trip_transition(
  p_trip_id uuid,
  p_to_status text,
  p_latitude numeric DEFAULT NULL,
  p_longitude numeric DEFAULT NULL,
  p_receipt_id uuid DEFAULT NULL
)
RETURNS public.trips
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  t public.trips;
  v_distance numeric;
  v_event uuid;
  v_driver_id text;
BEGIN
  IF NOT private.can_action(
    'trips',
    'driver_execute'
  ) THEN

    RAISE EXCEPTION
      'غير مصرح بهذا الإجراء'
      USING ERRCODE='42501';
  END IF;

  SELECT p.driver_id
  INTO v_driver_id
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND p.active = true
    AND p.role = 'driver';

  IF v_driver_id IS NULL THEN
    RAISE EXCEPTION 'غير مصرح بهذا الإجراء';
  END IF;

  SELECT *
  INTO t
  FROM public.trips
  WHERE id = p_trip_id
  FOR UPDATE;

  IF NOT FOUND
     OR t.driver_id IS DISTINCT FROM v_driver_id THEN
    RAISE EXCEPTION 'الرحلة غير مخصصة لهذا السائق';
  END IF;

  IF p_to_status = 'to_pickup'
     AND t.execution_status = 'assigned' THEN

    UPDATE public.trips
    SET execution_status='to_pickup',
        updated_at=now()
    WHERE id=t.id
    RETURNING * INTO t;

    PERFORM private.record_driver_event(
      t.id,
      'TO_PICKUP',
      'assigned',
      'to_pickup'
    );

  ELSIF p_to_status = 'arrived_pickup'
        AND t.execution_status = 'to_pickup' THEN

    SELECT g.distance_meters,
           g.override_event_id
    INTO v_distance,
         v_event
    FROM private.validate_driver_trip_geofence(
      t.id,
      p_latitude,
      p_longitude,
      'pickup',
      p_to_status
    ) g;

    IF v_event IS NOT NULL THEN

      PERFORM private.record_driver_event(
        t.id,
        'MANUAL_GEOFENCE_OVERRIDE_USED',
        t.execution_status,
        t.execution_status,
        p_latitude,
        p_longitude,
        v_distance,
        jsonb_build_object(
          'override_event_id',v_event,
          'action',p_to_status
        ),
        NULL,
        NULL
      );

    END IF;

    UPDATE public.trips
    SET execution_status='arrived_pickup',
        updated_at=now()
    WHERE id=t.id
    RETURNING * INTO t;

    PERFORM private.record_driver_event(
      t.id,
      'PICKUP_ARRIVAL',
      'to_pickup',
      'arrived_pickup',
      p_latitude,
      p_longitude,
      v_distance
    );

    PERFORM private.notify_trip_roles(
      ARRAY['fleet','pm'],
      'DRIVER_ARRIVED_PICKUP',
      'وصل السائق للتحميل',
      'وصل السائق إلى موقع التحميل للرحلة ' ||
        coalesce(t.trip_number,t.id::text),
      t.id
    );

  ELSIF p_to_status = 'pickup_confirmed'
        AND t.execution_status = 'arrived_pickup' THEN

    IF p_receipt_id IS NULL
       OR NOT EXISTS (
         SELECT 1
         FROM public.trip_receipts r
         JOIN public.attachment_metadata am
           ON am.id=r.attachment_id
         WHERE r.id=p_receipt_id
           AND r.trip_id=t.id
           AND r.receipt_type='PICKUP_RECEIPT'
           AND r.uploaded_by=auth.uid()
           AND am.entity_type='trip_receipt'
           AND am.entity_id=t.id::text
           AND am.uploaded_by=auth.uid()
       ) THEN

      RAISE EXCEPTION
        'إيصال الاستلام مطلوب قبل تأكيد التحميل';
    END IF;

    SELECT g.distance_meters,
           g.override_event_id
    INTO v_distance,
         v_event
    FROM private.validate_driver_trip_geofence(
      t.id,
      p_latitude,
      p_longitude,
      'pickup',
      p_to_status
    ) g;

    IF v_event IS NOT NULL THEN

      PERFORM private.record_driver_event(
        t.id,
        'MANUAL_GEOFENCE_OVERRIDE_USED',
        t.execution_status,
        t.execution_status,
        p_latitude,
        p_longitude,
        v_distance,
        jsonb_build_object(
          'override_event_id',v_event,
          'action',p_to_status
        ),
        NULL,
        NULL
      );

      PERFORM private.notify_trip_roles(
        ARRAY['mgmt','fleet','pm'],
        'TRIP_GEOFENCE_OVERRIDE_USED',
        'تم استخدام استثناء التحقق الجغرافي',
        'تم استخدام استثناء معتمد للتحقق من الموقع للرحلة ' ||
          coalesce(t.trip_number,t.id::text),
        t.id
      );

    END IF;

    UPDATE public.trip_receipts
    SET distance_meters=v_distance
    WHERE id=p_receipt_id;

    UPDATE public.trips
    SET execution_status='pickup_confirmed',
        status='in_transit',
        updated_at=now()
    WHERE id=t.id
    RETURNING * INTO t;

    v_event := private.record_driver_event(
      t.id,
      'PICKUP_CONFIRMED',
      'arrived_pickup',
      'pickup_confirmed',
      p_latitude,
      p_longitude,
      v_distance,
      '{}'::jsonb,
      NULL,
      p_receipt_id
    );

    PERFORM private.notify_trip_roles(
      ARRAY['fleet','pm'],
      'DRIVER_PICKUP_CONFIRMED',
      'تم تأكيد الاستلام',
      'تم تأكيد استلام الحمولة للرحلة ' ||
        coalesce(t.trip_number,t.id::text),
      t.id
    );

  ELSIF p_to_status = 'in_transit'
        AND t.execution_status = 'pickup_confirmed' THEN

    UPDATE public.trips
    SET execution_status='in_transit',
        actual_start=coalesce(actual_start,now()),
        updated_at=now()
    WHERE id=t.id
    RETURNING * INTO t;

    PERFORM private.record_driver_event(
      t.id,
      'IN_TRANSIT',
      'pickup_confirmed',
      'in_transit'
    );

    PERFORM private.notify_trip_roles(
      ARRAY['fleet','pm'],
      'DRIVER_TRIP_STARTED',
      'بدأت الرحلة',
      'بدأ السائق نقل الحمولة للرحلة ' ||
        coalesce(t.trip_number,t.id::text),
      t.id
    );

  ELSIF p_to_status = 'arrived_delivery'
        AND t.execution_status = 'in_transit' THEN

    SELECT g.distance_meters,
           g.override_event_id
    INTO v_distance,
         v_event
    FROM private.validate_driver_trip_geofence(
      t.id,
      p_latitude,
      p_longitude,
      'delivery',
      p_to_status
    ) g;

    IF v_event IS NOT NULL THEN

      PERFORM private.record_driver_event(
        t.id,
        'MANUAL_GEOFENCE_OVERRIDE_USED',
        t.execution_status,
        t.execution_status,
        p_latitude,
        p_longitude,
        v_distance,
        jsonb_build_object(
          'override_event_id',v_event,
          'action',p_to_status
        ),
        NULL,
        NULL
      );

    END IF;

    UPDATE public.trips
    SET execution_status='arrived_delivery',
        updated_at=now()
    WHERE id=t.id
    RETURNING * INTO t;

    PERFORM private.record_driver_event(
      t.id,
      'DELIVERY_ARRIVAL',
      'in_transit',
      'arrived_delivery',
      p_latitude,
      p_longitude,
      v_distance
    );

    PERFORM private.notify_trip_roles(
      ARRAY['fleet','pm'],
      'DRIVER_ARRIVED_DELIVERY',
      'وصل السائق للتسليم',
      'وصل السائق إلى موقع التسليم للرحلة ' ||
        coalesce(t.trip_number,t.id::text),
      t.id
    );

  ELSIF p_to_status = 'delivered'
        AND t.execution_status = 'arrived_delivery' THEN

    IF p_receipt_id IS NULL
       OR NOT EXISTS (
         SELECT 1
         FROM public.trip_receipts r
         JOIN public.attachment_metadata am
           ON am.id=r.attachment_id
         WHERE r.id=p_receipt_id
           AND r.trip_id=t.id
           AND r.receipt_type='DELIVERY_RECEIPT'
           AND r.uploaded_by=auth.uid()
           AND am.entity_type='trip_receipt'
           AND am.entity_id=t.id::text
           AND am.uploaded_by=auth.uid()
       ) THEN

      RAISE EXCEPTION
        'إيصال التسليم مطلوب قبل تأكيد التسليم';
    END IF;

    SELECT g.distance_meters,
           g.override_event_id
    INTO v_distance,
         v_event
    FROM private.validate_driver_trip_geofence(
      t.id,
      p_latitude,
      p_longitude,
      'delivery',
      p_to_status
    ) g;

    IF v_event IS NOT NULL THEN

      PERFORM private.record_driver_event(
        t.id,
        'MANUAL_GEOFENCE_OVERRIDE_USED',
        t.execution_status,
        t.execution_status,
        p_latitude,
        p_longitude,
        v_distance,
        jsonb_build_object(
          'override_event_id',v_event,
          'action',p_to_status
        ),
        NULL,
        NULL
      );

      PERFORM private.notify_trip_roles(
        ARRAY['mgmt','fleet','pm'],
        'TRIP_GEOFENCE_OVERRIDE_USED',
        'تم استخدام استثناء التحقق الجغرافي',
        'تم استخدام استثناء معتمد للتحقق من الموقع للرحلة ' ||
          coalesce(t.trip_number,t.id::text),
        t.id
      );

    END IF;

    UPDATE public.trip_receipts
    SET distance_meters=v_distance
    WHERE id=p_receipt_id;

    UPDATE public.trips
    SET execution_status='delivered',
        status='delivered',
        updated_at=now()
    WHERE id=t.id
    RETURNING * INTO t;

    PERFORM private.record_driver_event(
      t.id,
      'DELIVERED',
      'arrived_delivery',
      'delivered',
      p_latitude,
      p_longitude,
      v_distance,
      '{}'::jsonb,
      NULL,
      p_receipt_id
    );

    PERFORM private.notify_trip_roles(
      ARRAY['fleet','pm'],
      'DRIVER_DELIVERY_CONFIRMED',
      'تم تأكيد التسليم',
      'تم تأكيد تسليم الرحلة ' ||
        coalesce(t.trip_number,t.id::text),
      t.id
    );

  ELSIF p_to_status = 'completed'
        AND t.execution_status = 'delivered' THEN

    UPDATE public.trips
    SET execution_status='completed',
        status='received',
        actual_end=coalesce(actual_end,now()),
        updated_at=now()
    WHERE id=t.id
    RETURNING * INTO t;

    PERFORM private.record_driver_event(
      t.id,
      'COMPLETED',
      'delivered',
      'completed'
    );

    PERFORM private.notify_trip_roles(
      ARRAY['fleet','pm'],
      'DRIVER_TRIP_COMPLETED',
      'اكتملت الرحلة',
      'اكتملت رحلة النقل ' ||
        coalesce(t.trip_number,t.id::text),
      t.id
    );

  ELSE

    RAISE EXCEPTION
      'انتقال الرحلة غير صالح من % إلى %',
      coalesce(t.execution_status,'غير محدد'),
      p_to_status;
  END IF;

  RETURN t;
END;
$$;

REVOKE ALL
ON FUNCTION public.driver_trip_transition(
  uuid,
  text,
  numeric,
  numeric,
  uuid
)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.driver_trip_transition(
  uuid,
  text,
  numeric,
  numeric,
  uuid
)
TO authenticated;

-- 10) Driver exception reporting. Exceptions preserve the current execution state.
CREATE OR REPLACE FUNCTION public.driver_report_trip_exception(
  p_trip_id uuid,
  p_exception_type text,
  p_category text DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_latitude numeric DEFAULT NULL,
  p_longitude numeric DEFAULT NULL,
  p_attachment_ids jsonb DEFAULT '[]'::jsonb
)
RETURNS public.trip_exceptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  t public.trips;
  ex public.trip_exceptions;
  v_driver_id text;
  v_priority text :=
    CASE
      WHEN p_exception_type='EMERGENCY' THEN 'critical'
      WHEN p_exception_type='BREAKDOWN' THEN 'high'
      ELSE 'normal'
    END;
BEGIN
  IF NOT private.can_action(
    'trips',
    'driver_exception'
  ) THEN
    RAISE EXCEPTION
      'غير مصرح بهذا الإجراء'
      USING ERRCODE='42501';
  END IF;

  SELECT p.driver_id
  INTO v_driver_id
  FROM public.profiles p
  WHERE p.id=auth.uid()
    AND p.active=true
    AND p.role='driver';

  IF v_driver_id IS NULL THEN
    RAISE EXCEPTION 'غير مصرح بهذا الإجراء';
  END IF;

  SELECT *
  INTO t
  FROM public.trips
  WHERE id=p_trip_id
  FOR UPDATE;

  IF NOT FOUND
     OR t.driver_id IS DISTINCT FROM v_driver_id THEN
    RAISE EXCEPTION
      'الرحلة غير مخصصة لهذا السائق';
  END IF;

  IF t.execution_status = 'completed' THEN
    RAISE EXCEPTION
      'لا يمكن تسجيل استثناء على رحلة مكتملة'
      USING ERRCODE='40901';
  END IF;

  IF p_exception_type NOT IN (
    'BREAKDOWN',
    'EMERGENCY',
    'PICKUP_PROBLEM',
    'DELIVERY_PROBLEM',
    'LOCATION_NOT_FOUND',
    'LOCATION_CLOSED',
    'CARGO_NOT_READY',
    'QUANTITY_MISMATCH',
    'ADDRESS_PROBLEM',
    'CUSTOMER_NOT_AVAILABLE',
    'CUSTOMER_REFUSED_DELIVERY',
    'DOCUMENT_PROBLEM',
    'CARGO_DAMAGE',
    'ROAD_PROBLEM',
    'GPS_PROBLEM',
    'OTHER'
  ) THEN
    RAISE EXCEPTION 'نوع الاستثناء غير صالح';
  END IF;

  IF jsonb_typeof(
    coalesce(
      p_attachment_ids,
      '[]'::jsonb
    )
  ) <> 'array' THEN
    RAISE EXCEPTION 'مرفقات الاستثناء غير صالحة';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      coalesce(
        p_attachment_ids,
        '[]'::jsonb
      )
    ) a(attachment_id)
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.attachment_metadata am
      WHERE am.id::text = a.attachment_id
        AND am.entity_type = 'trip_exception'
        AND am.entity_id = t.id::text
        AND am.uploaded_by = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION
      'أحد مرفقات الاستثناء غير مرتبط بهذه الرحلة';
  END IF;

  INSERT INTO public.trip_exceptions(
    trip_id,
    exception_type,
    category,
    reason,
    notes,
    priority,
    status,
    reported_by,
    driver_id,
    vehicle_id,
    occurred_at,
    linked_attachment_ids,
    latitude,
    longitude
  )
  VALUES (
    t.id,
    p_exception_type,
    p_category,
    p_reason,
    p_notes,
    v_priority,
    'reported',
    auth.uid(),
    v_driver_id,
    t.truck_asset_id,
    now(),
    coalesce(p_attachment_ids,'[]'::jsonb),
    p_latitude,
    p_longitude
  )
  RETURNING *
  INTO ex;

  UPDATE public.trips
  SET exception_status=p_exception_type,
      updated_at=now()
  WHERE id=t.id;

  PERFORM private.record_driver_event(
    t.id,
    p_exception_type,
    t.execution_status,
    t.execution_status,
    p_latitude,
    p_longitude,
    NULL,
    jsonb_build_object(
      'exception_id',ex.id,
      'category',p_category,
      'priority',v_priority
    ),
    p_notes
  );

  IF p_exception_type='EMERGENCY' THEN

    PERFORM private.notify_trip_roles(
      ARRAY['fleet','pm'],
      'DRIVER_EMERGENCY',
      '🚨 حالة طارئة من السائق',
      'تم تسجيل حالة طارئة على الرحلة ' ||
        coalesce(t.trip_number,t.id::text),
      t.id
    );

  ELSE

    PERFORM private.notify_trip_roles(
      ARRAY['fleet','pm'],
      'DRIVER_EXCEPTION',
      'استثناء تشغيلي جديد',
      'تم تسجيل ' ||
        p_exception_type ||
        ' على الرحلة ' ||
        coalesce(t.trip_number,t.id::text),
      t.id
    );

  END IF;

  RETURN ex;
END;
$$;

REVOKE ALL
ON FUNCTION public.driver_report_trip_exception(
  uuid,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  jsonb
)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.driver_report_trip_exception(
  uuid,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  jsonb
)
TO authenticated;

-- 11) Driver can request resumption after an exception; it does not erase history.
CREATE OR REPLACE FUNCTION public.driver_clear_exception(
  p_trip_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS public.trips
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  t public.trips;
  v_driver_id text;
BEGIN
  IF NOT private.can_action(
    'trips',
    'driver_exception'
  ) THEN
    RAISE EXCEPTION
      'غير مصرح بهذا الإجراء'
      USING ERRCODE='42501';
  END IF;

  SELECT p.driver_id
  INTO v_driver_id
  FROM public.profiles p
  WHERE p.id=auth.uid()
    AND p.active=true
    AND p.role='driver';

  IF v_driver_id IS NULL THEN
    RAISE EXCEPTION 'غير مصرح بهذا الإجراء';
  END IF;

  SELECT *
  INTO t
  FROM public.trips
  WHERE id=p_trip_id
  FOR UPDATE;

  IF NOT FOUND
     OR t.driver_id IS DISTINCT FROM v_driver_id THEN
    RAISE EXCEPTION
      'الرحلة غير مخصصة لهذا السائق';
  END IF;

  IF t.execution_status = 'completed' THEN
    RAISE EXCEPTION
      'لا يمكن تعديل استثناء رحلة مكتملة'
      USING ERRCODE='40901';
  END IF;

  IF t.exception_status IS NULL THEN
    RETURN t;
  END IF;

  INSERT INTO public.trip_execution_events(
    trip_id,
    event_type,
    from_status,
    to_status,
    actor_user_id,
    driver_id,
    vehicle_id,
    metadata,
    notes
  )
  VALUES(
    t.id,
    'PROBLEM_RESOLVED',
    t.execution_status,
    t.execution_status,
    auth.uid(),
    t.driver_id,
    t.truck_asset_id,
    jsonb_build_object(
      'exception_status',
      t.exception_status
    ),
    p_notes
  );

  UPDATE public.trip_exceptions
  SET status='resolved',
      resolved_at=now(),
      resolved_by=auth.uid()
  WHERE trip_id=t.id
    AND status IN ('reported','in_progress');

  UPDATE public.trips
  SET exception_status=NULL,
      updated_at=now()
  WHERE id=t.id
  RETURNING *
  INTO t;

  PERFORM private.notify_trip_roles(
    ARRAY['fleet','pm'],
    'DRIVER_EXCEPTION_RESOLVED',
    'تم تحديث الاستثناء',
    'تمت متابعة/حل الاستثناء على الرحلة ' ||
      coalesce(t.trip_number,t.id::text),
    t.id
  );

  RETURN t;
END;
$$;

REVOKE ALL
ON FUNCTION public.driver_clear_exception(uuid,text)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.driver_clear_exception(uuid,text)
TO authenticated;

-- 12) Controlled operations geofence override. Driver never receives this capability.
CREATE OR REPLACE FUNCTION public.override_trip_geofence(
  p_trip_id uuid,
  p_action text,
  p_reason text,
  p_latitude numeric DEFAULT NULL,
  p_longitude numeric DEFAULT NULL
)
RETURNS public.trip_execution_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  t public.trips;
  e public.trip_execution_events;
  v_role text := private.current_role();
BEGIN
  IF NOT private.can_action(
    'trips',
    'override_geofence'
  ) THEN
    RAISE EXCEPTION
      'غير مصرح بتجاوز التحقق الجغرافي'
      USING ERRCODE='42501';
  END IF;

  IF p_action NOT IN (
    'arrived_pickup',
    'pickup_confirmed',
    'arrived_delivery',
    'delivered'
  ) THEN
    RAISE EXCEPTION 'إجراء التجاوز غير صالح';
  END IF;

  IF btrim(coalesce(p_reason,'')) = '' THEN
    RAISE EXCEPTION 'سبب التجاوز مطلوب';
  END IF;

  SELECT *
  INTO t
  FROM public.trips
  WHERE id=p_trip_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'الرحلة غير موجودة';
  END IF;

  IF NOT (
    (
      p_action='arrived_pickup'
      AND t.execution_status='to_pickup'
    )
    OR
    (
      p_action='pickup_confirmed'
      AND t.execution_status='arrived_pickup'
    )
    OR
    (
      p_action='arrived_delivery'
      AND t.execution_status='in_transit'
    )
    OR
    (
      p_action='delivered'
      AND t.execution_status='arrived_delivery'
    )
  ) THEN
    RAISE EXCEPTION
      'لا يمكن إنشاء استثناء تحقق جغرافي للمرحلة الحالية';
  END IF;

  INSERT INTO public.trip_execution_events(
    trip_id,
    event_type,
    from_status,
    to_status,
    actor_user_id,
    driver_id,
    vehicle_id,
    latitude,
    longitude,
    metadata,
    notes
  )
  VALUES(
    t.id,
    'MANUAL_GEOFENCE_OVERRIDE',
    t.execution_status,
    t.execution_status,
    auth.uid(),
    t.driver_id,
    t.truck_asset_id,
    p_latitude,
    p_longitude,
    jsonb_build_object(
      'action',p_action,
      'reason',p_reason,
      'authorized_role',v_role
    ),
    NULL
  );

  UPDATE public.trips
  SET updated_at=now()
  WHERE id=t.id;

  SELECT *
  INTO e
  FROM public.trip_execution_events
  WHERE trip_id=t.id
    AND event_type='MANUAL_GEOFENCE_OVERRIDE'
  ORDER BY occurred_at DESC
  LIMIT 1;

  RETURN e;
END;
$$;

REVOKE ALL
ON FUNCTION public.override_trip_geofence(
  uuid,
  text,
  text,
  numeric,
  numeric
)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.override_trip_geofence(
  uuid,
  text,
  text,
  numeric,
  numeric
)
TO authenticated;

-- Safe vehicle projection: drivers get only the vehicle(s) attached to their assigned trip,
-- while operations keep the normal trip-read scope. Asset master data remains protected.
CREATE OR REPLACE FUNCTION public.trip_vehicle_info(p_trip_id uuid)
RETURNS TABLE(
  trip_id uuid,
  truck_id text,
  truck_code text,
  truck_name text,
  truck_plate text,
  trailer_id text,
  trailer_code text,
  trailer_name text,
  trailer_plate text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF private.current_role() = 'driver' THEN

    IF NOT private.can_action(
      'trips',
      'driver_execute'
    )
       OR NOT private.driver_trip_allowed(p_trip_id) THEN
      RAISE EXCEPTION
        'غير مصرح بالوصول إلى بيانات وسيلة النقل'
        USING ERRCODE='42501';
    END IF;

  ELSIF NOT private.can_module(
    'trips',
    'read'
  ) THEN

    RAISE EXCEPTION
      'غير مصرح بالوصول إلى بيانات وسيلة النقل'
      USING ERRCODE='42501';
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    a.id,
    a.code,
    a.name,
    a.plate_number,
    ta.id,
    ta.code,
    ta.name,
    ta.plate_number
  FROM public.trips t
  LEFT JOIN public.assets a
    ON a.id=t.truck_asset_id
  LEFT JOIN public.assets ta
    ON ta.id=t.trailer_asset_id
  WHERE t.id=p_trip_id;
END;
$$;

REVOKE ALL
ON FUNCTION public.trip_vehicle_info(uuid)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.trip_vehicle_info(uuid)
TO authenticated;

-- 13) Assignment notification when an existing trip is assigned to a mapped driver.
CREATE OR REPLACE FUNCTION private.notify_trip_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  recipient uuid;
BEGIN
  IF NEW.driver_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP='INSERT'
     OR NEW.driver_id IS DISTINCT FROM OLD.driver_id
     OR NEW.status IS DISTINCT FROM OLD.status THEN

    IF NEW.status='assigned' THEN

      IF NOT EXISTS (
        SELECT 1
        FROM public.trip_execution_events
        WHERE trip_id=NEW.id
          AND event_type='ASSIGNED'
      ) THEN

        INSERT INTO public.trip_execution_events(
          trip_id,
          event_type,
          from_status,
          to_status,
          actor_user_id,
          driver_id,
          vehicle_id,
          metadata
        )
        VALUES(
          NEW.id,
          'ASSIGNED',
          NULL,
          'assigned',
          auth.uid(),
          NEW.driver_id,
          NEW.truck_asset_id,
          jsonb_build_object(
            'commercial_status',
            NEW.status
          )
        );

      END IF;

      SELECT id
      INTO recipient
      FROM public.profiles
      WHERE driver_id=NEW.driver_id
        AND active=true
        AND role='driver'
      LIMIT 1;

      IF recipient IS NOT NULL THEN

        PERFORM private.enqueue_trip_notification(
          recipient,
          'TRIP_ASSIGNED',
          'تم تخصيص رحلة جديدة',
          'تم تخصيص رحلة ' ||
            coalesce(NEW.trip_number,NEW.id::text) ||
            ' لك.',
          '/driver/trips/' ||
            NEW.id::text,
          jsonb_build_object(
            'trip_id',
            NEW.id
          )
        );

      END IF;

    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trip_driver_assignment_notification
ON public.trips;

CREATE TRIGGER trg_trip_driver_assignment_notification
AFTER INSERT OR UPDATE OF driver_id,status
ON public.trips
FOR EACH ROW
EXECUTE FUNCTION private.notify_trip_assignment();

-- 14) RLS: drivers see only their own execution surface; operations retain existing access.
DROP POLICY IF EXISTS trips_read
ON public.trips;

CREATE POLICY trips_read
ON public.trips
FOR SELECT
TO authenticated
USING (
  private.can_module('trips','read')
  OR (
    private.current_role()='driver'
    AND driver_id = (
      SELECT p.driver_id
      FROM public.profiles p
      WHERE p.id=auth.uid()
        AND p.active=true
    )
  )
);

DROP POLICY IF EXISTS trips_update
ON public.trips;

CREATE POLICY trips_update
ON public.trips
FOR UPDATE
TO authenticated
USING (
  private.can_module('trips','write')
)
WITH CHECK (
  private.can_module('trips','write')
);

DROP POLICY IF EXISTS trip_execution_events_read
ON public.trip_execution_events;

CREATE POLICY trip_execution_events_read
ON public.trip_execution_events
FOR SELECT
TO authenticated
USING (
  private.can_module('trips','read')
  OR (
    private.current_role()='driver'
    AND trip_id IN (
      SELECT t.id
      FROM public.trips t
      JOIN public.profiles p
        ON p.driver_id=t.driver_id
      WHERE p.id=auth.uid()
        AND p.active=true
    )
  )
);

DROP POLICY IF EXISTS trip_receipts_read
ON public.trip_receipts;

CREATE POLICY trip_receipts_read
ON public.trip_receipts
FOR SELECT
TO authenticated
USING (
  private.can_module('trips','read')
  OR (
    private.current_role()='driver'
    AND trip_id IN (
      SELECT t.id
      FROM public.trips t
      JOIN public.profiles p
        ON p.driver_id=t.driver_id
      WHERE p.id=auth.uid()
        AND p.active=true
    )
  )
);

DROP POLICY IF EXISTS trip_receipts_insert
ON public.trip_receipts;

CREATE POLICY trip_receipts_insert
ON public.trip_receipts
FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND (
    private.can_action('attachments','write')
    OR (
      private.current_role()='driver'
      AND private.can_action('trips','driver_receipt')
      AND trip_id IN (
        SELECT t.id
        FROM public.trips t
        JOIN public.profiles p
          ON p.driver_id=t.driver_id
        WHERE p.id=auth.uid()
          AND p.active=true
      )
      AND EXISTS (
        SELECT 1
        FROM public.attachment_metadata am
        WHERE am.id = attachment_id
          AND am.entity_type = 'trip_receipt'
          AND am.entity_id = trip_id::text
          AND am.uploaded_by = auth.uid()
      )
    )
  )
);

DROP POLICY IF EXISTS trip_exceptions_read
ON public.trip_exceptions;

CREATE POLICY trip_exceptions_read
ON public.trip_exceptions
FOR SELECT
TO authenticated
USING (
  private.can_module('trips','read')
  OR (
    private.current_role()='driver'
    AND trip_id IN (
      SELECT t.id
      FROM public.trips t
      JOIN public.profiles p
        ON p.driver_id=t.driver_id
      WHERE p.id=auth.uid()
        AND p.active=true
    )
  )
);

DROP POLICY IF EXISTS trip_exceptions_insert
ON public.trip_exceptions;

CREATE POLICY trip_exceptions_insert
ON public.trip_exceptions
FOR INSERT
TO authenticated
WITH CHECK (
  reported_by = auth.uid()
  AND private.can_action('trips','exception_report')
  AND private.current_role() <> 'driver'
);

DROP POLICY IF EXISTS trip_exceptions_update
ON public.trip_exceptions;

CREATE POLICY trip_exceptions_update
ON public.trip_exceptions
FOR UPDATE
TO authenticated
USING (
  private.can_action('trips','exception_manage')
)
WITH CHECK (
  private.can_action('trips','exception_manage')
);

-- Existing generic attachments are tightened only for the new driver role.
DROP POLICY IF EXISTS attachment_metadata_read
ON public.attachment_metadata;

CREATE POLICY attachment_metadata_read
ON public.attachment_metadata
FOR SELECT
TO authenticated
USING (
  private.current_role() <> 'driver'
  OR (
    entity_type IN (
      'trip_receipt',
      'trip_exception'
    )
    AND entity_id IN (
      SELECT t.id::text
      FROM public.trips t
      JOIN public.profiles p
        ON p.driver_id=t.driver_id
      WHERE p.id=auth.uid()
        AND p.active=true
    )
  )
);

DROP POLICY IF EXISTS attachment_metadata_write
ON public.attachment_metadata;

CREATE POLICY attachment_metadata_write
ON public.attachment_metadata
FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND (
    private.can_action('attachments','write')
    OR (
      private.current_role()='driver'
      AND entity_type IN (
        'trip_receipt',
        'trip_exception'
      )
      AND entity_id IN (
        SELECT t.id::text
        FROM public.trips t
        JOIN public.profiles p
          ON p.driver_id=t.driver_id
        WHERE p.id=auth.uid()
          AND p.active=true
      )
    )
  )
);

-- Drivers can upload/read only the object-storage paths generated for their own trip receipts/evidence.
DO $$
BEGIN
  IF to_regclass('storage.objects') IS NOT NULL THEN

    EXECUTE 'DROP POLICY IF EXISTS kemex_attachment_read ON storage.objects';

    EXECUTE $policy$
      CREATE POLICY kemex_attachment_read
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id::text = 'kemex-attachments'
        AND (
          private.can_module('trips','read')
          OR (
            private.current_role() = 'driver'
            AND EXISTS (
              SELECT 1
              FROM public.profiles p
              JOIN public.trips t
                ON t.driver_id = p.driver_id
              WHERE p.id = auth.uid()
                AND p.active = true
                AND (
                  name LIKE 'trip_receipt/' ||
                    t.id::text ||
                    '/%'
                  OR
                  name LIKE 'trip_exception/' ||
                    t.id::text ||
                    '/%'
                )
            )
          )
        )
      )
    $policy$;

    EXECUTE 'DROP POLICY IF EXISTS kemex_attachment_insert ON storage.objects';

    EXECUTE $policy$
      CREATE POLICY kemex_attachment_insert
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id::text = 'kemex-attachments'
        AND (
          private.can_action('attachments','write')
          OR (
            private.current_role() = 'driver'
            AND EXISTS (
              SELECT 1
              FROM public.profiles p
              JOIN public.trips t
                ON t.driver_id = p.driver_id
              WHERE p.id = auth.uid()
                AND p.active = true
                AND (
                  name LIKE 'trip_receipt/' ||
                    t.id::text ||
                    '/%'
                  OR
                  name LIKE 'trip_exception/' ||
                    t.id::text ||
                    '/%'
                )
            )
          )
        )
      )
    $policy$;

  END IF;
END $$;

DROP POLICY IF EXISTS settings_read
ON public.organization_settings;

CREATE POLICY settings_read
ON public.organization_settings
FOR SELECT
TO authenticated
USING (
  private.current_role() <> 'driver'
);

-- Driver accounts may read their own profile only; administration retains existing profile write policy.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_read_driver_scope
ON public.profiles;

CREATE POLICY profiles_read_driver_scope
ON public.profiles
FOR SELECT
TO authenticated
USING (
  private.current_role() <> 'driver'
  OR id = auth.uid()
);

-- Drivers may read only their own driver record; operations retain normal module access.
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS drivers_read
ON public.drivers;

CREATE POLICY drivers_read
ON public.drivers
FOR SELECT
TO authenticated
USING (
  private.can_module('drivers','read')
  OR (
    private.current_role()='driver'
    AND id = (
      SELECT p.driver_id
      FROM public.profiles p
      WHERE p.id=auth.uid()
        AND p.active=true
    )
  )
);

DROP POLICY IF EXISTS drivers_write
ON public.drivers;

CREATE POLICY drivers_write
ON public.drivers
FOR ALL
TO authenticated
USING (
  private.can_module('drivers','write')
)
WITH CHECK (
  private.can_module('drivers','write')
);

-- A driver may read its own driver master record; the broad drivers policy remains unchanged for all other roles.
DROP POLICY IF EXISTS drivers_read_own_driver
ON public.drivers;

-- Driver notification inbox remains scoped by the existing recipient_id policy from 024.

-- Clients may read the event stream but may not forge/update/delete events directly.
REVOKE INSERT, UPDATE, DELETE
ON public.trip_execution_events
FROM authenticated;

-- 15) Grants for RPC-backed driver workflow.
GRANT SELECT
ON public.trips,
   public.trip_execution_events,
   public.trip_receipts,
   public.trip_exceptions
TO authenticated;

GRANT SELECT
ON public.drivers
TO authenticated;

GRANT SELECT
ON public.profiles
TO authenticated;

GRANT SELECT
ON public.organization_settings
TO authenticated;

GRANT INSERT
ON public.trip_receipts
TO authenticated;

GRANT INSERT, UPDATE
ON public.trip_exceptions
TO authenticated;

COMMENT ON COLUMN public.trips.execution_status IS
  'Driver execution lifecycle, separate from legacy commercial/billing status.';

COMMENT ON TABLE public.trip_execution_events IS
  'Append-only driver execution timeline; binary documents stay in object storage.';

COMMENT ON TABLE public.trip_receipts IS
  'Structured pickup/delivery proof linked to attachment metadata and execution evidence.';

COMMENT ON TABLE public.trip_exceptions IS
  'Persistent operational exceptions; exceptions never delete/reset the trip.';
