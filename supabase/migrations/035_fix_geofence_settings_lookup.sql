-- 035_fix_geofence_settings_lookup.sql
-- validate_driver_trip_geofence() (defined in 025) still queried
-- organization_settings using the pre-multi-tenant "WHERE id = true"
-- singleton pattern. Migration 032 dropped that column when
-- organization_settings became one row per tenant, which left this
-- function referencing a column that no longer exists — it only surfaces
-- at call time (PL/pgSQL bodies aren't re-validated on ALTER TABLE), which
-- is exactly why this went unnoticed until the driver-execution tests
-- actually invoked it. Re-create the function with the corrected lookup;
-- everything else is unchanged from 025.

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

  -- Corrected: organization_settings is now one row per tenant, keyed by
  -- tenant_id, instead of the old single global row keyed by "id = true".
  SELECT coalesce(trip_geofence_radius_m, 1000)
  INTO v_radius
  FROM public.organization_settings
  WHERE tenant_id = t.tenant_id;

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
