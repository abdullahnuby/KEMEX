-- KEMEX — Live GPS tracking foundation.
-- Provider-neutral device registry, position history, secure operations read model,
-- and Supabase Realtime publication support when the publication exists.

CREATE TABLE IF NOT EXISTS public.vehicle_gps_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id text NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'generic',
  external_device_id text NOT NULL UNIQUE,
  label text,
  active boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz,
  last_latitude numeric,
  last_longitude numeric,
  last_speed_kmh numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT vehicle_gps_devices_latitude_ck
    CHECK (last_latitude IS NULL OR last_latitude BETWEEN -90 AND 90),

  CONSTRAINT vehicle_gps_devices_longitude_ck
    CHECK (last_longitude IS NULL OR last_longitude BETWEEN -180 AND 180),

  CONSTRAINT vehicle_gps_devices_speed_ck
    CHECK (last_speed_kmh IS NULL OR last_speed_kmh >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS vehicle_gps_devices_active_asset_uidx
  ON public.vehicle_gps_devices(asset_id)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS vehicle_gps_devices_asset_idx
  ON public.vehicle_gps_devices(asset_id);

CREATE INDEX IF NOT EXISTS vehicle_gps_devices_active_seen_idx
  ON public.vehicle_gps_devices(active, last_seen_at DESC);

DROP TRIGGER IF EXISTS trg_vehicle_gps_devices_updated_at
ON public.vehicle_gps_devices;

CREATE TRIGGER trg_vehicle_gps_devices_updated_at
BEFORE UPDATE ON public.vehicle_gps_devices
FOR EACH ROW
EXECUTE FUNCTION private.set_updated_at();

CREATE TABLE IF NOT EXISTS public.vehicle_gps_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid REFERENCES public.vehicle_gps_devices(id) ON DELETE SET NULL,
  asset_id text NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  driver_id text REFERENCES public.drivers(id) ON DELETE SET NULL,
  trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  speed_kmh numeric,
  heading_degrees numeric,
  accuracy_m numeric,
  ignition_on boolean,
  recorded_at timestamptz NOT NULL,
  source text NOT NULL DEFAULT 'device',
  provider text,
  external_device_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT vehicle_gps_positions_latitude_ck
    CHECK (latitude BETWEEN -90 AND 90),

  CONSTRAINT vehicle_gps_positions_longitude_ck
    CHECK (longitude BETWEEN -180 AND 180),

  CONSTRAINT vehicle_gps_positions_speed_ck
    CHECK (speed_kmh IS NULL OR speed_kmh >= 0),

  CONSTRAINT vehicle_gps_positions_heading_ck
    CHECK (
      heading_degrees IS NULL
      OR heading_degrees BETWEEN 0 AND 360
    ),

  CONSTRAINT vehicle_gps_positions_accuracy_ck
    CHECK (accuracy_m IS NULL OR accuracy_m >= 0),

  CONSTRAINT vehicle_gps_positions_source_ck
    CHECK (
      source IN ('device','provider','driver','manual')
    )
);

CREATE INDEX IF NOT EXISTS vehicle_gps_positions_asset_time_idx
  ON public.vehicle_gps_positions(asset_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS vehicle_gps_positions_trip_time_idx
  ON public.vehicle_gps_positions(trip_id, recorded_at DESC)
  WHERE trip_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS vehicle_gps_positions_device_time_idx
  ON public.vehicle_gps_positions(device_id, recorded_at DESC)
  WHERE device_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS vehicle_gps_positions_provider_device_idx
  ON public.vehicle_gps_positions(external_device_id, recorded_at DESC)
  WHERE external_device_id IS NOT NULL;

ALTER TABLE public.vehicle_gps_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_gps_positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vehicle_gps_devices_read
ON public.vehicle_gps_devices;

CREATE POLICY vehicle_gps_devices_read
ON public.vehicle_gps_devices
FOR SELECT
TO authenticated
USING (
  private.can_action('trips','monitor')
);

DROP POLICY IF EXISTS vehicle_gps_devices_insert
ON public.vehicle_gps_devices;

CREATE POLICY vehicle_gps_devices_insert
ON public.vehicle_gps_devices
FOR INSERT
TO authenticated
WITH CHECK (
  private.current_role() IN ('admin','fleet')
);

DROP POLICY IF EXISTS vehicle_gps_devices_update
ON public.vehicle_gps_devices;

CREATE POLICY vehicle_gps_devices_update
ON public.vehicle_gps_devices
FOR UPDATE
TO authenticated
USING (
  private.current_role() IN ('admin','fleet')
)
WITH CHECK (
  private.current_role() IN ('admin','fleet')
);

DROP POLICY IF EXISTS vehicle_gps_positions_read
ON public.vehicle_gps_positions;

CREATE POLICY vehicle_gps_positions_read
ON public.vehicle_gps_positions
FOR SELECT
TO authenticated
USING (
  private.can_action('trips','monitor')
);

DROP POLICY IF EXISTS vehicle_gps_positions_insert
ON public.vehicle_gps_positions;

CREATE POLICY vehicle_gps_positions_insert
ON public.vehicle_gps_positions
FOR INSERT
TO authenticated
WITH CHECK (false);

REVOKE INSERT, UPDATE, DELETE
ON public.vehicle_gps_positions
FROM authenticated;

GRANT SELECT
ON public.vehicle_gps_positions
TO authenticated;

GRANT SELECT, INSERT, UPDATE
ON public.vehicle_gps_devices
TO authenticated;

CREATE OR REPLACE VIEW public.vehicle_latest_gps_positions
WITH (security_invoker = true)
AS
SELECT DISTINCT ON (p.asset_id)
  p.id,
  p.device_id,
  p.asset_id,
  p.driver_id,
  p.trip_id,
  p.latitude,
  p.longitude,
  p.speed_kmh,
  p.heading_degrees,
  p.accuracy_m,
  p.ignition_on,
  p.recorded_at,
  p.source,
  p.provider,
  p.external_device_id,
  p.metadata,
  p.created_at,
  a.code AS asset_code,
  a.name AS asset_name,
  a.plate_number AS asset_plate,
  a.status AS asset_status,
  a.asset_type AS asset_type,
  d.name AS driver_name,
  t.trip_number,
  t.status AS trip_status,
  t.execution_status AS trip_execution_status
FROM public.vehicle_gps_positions p
LEFT JOIN public.assets a
  ON a.id = p.asset_id
LEFT JOIN public.drivers d
  ON d.id = p.driver_id
LEFT JOIN public.trips t
  ON t.id = p.trip_id
ORDER BY p.asset_id, p.recorded_at DESC, p.created_at DESC;

GRANT SELECT
ON public.vehicle_latest_gps_positions
TO authenticated;

COMMENT ON TABLE public.vehicle_gps_devices IS
  'Provider-neutral registry linking external GPS device identifiers to KEMEX assets.';

COMMENT ON TABLE public.vehicle_gps_positions IS
  'Append-only GPS telemetry history for fleet assets.';

COMMENT ON VIEW public.vehicle_latest_gps_positions IS
  'Latest known GPS point per asset for operations tracking.';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_publication
    WHERE pubname = 'supabase_realtime'
  ) THEN
    BEGIN
      EXECUTE
        'ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicle_gps_positions';
    EXCEPTION
      WHEN duplicate_object THEN
        NULL;
    END;
  END IF;
END
$$;
