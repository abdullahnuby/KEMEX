export type GpsHealth = 'online' | 'stale' | 'offline'

export type GpsAsset = {
  id: string
  code: string
  name: string
  plate_number?: string | null
  status?: string | null
  asset_type?: string | null
  category?: string | null
}

export type GpsPosition = {
  id: string
  device_id?: string | null
  asset_id: string
  driver_id?: string | null
  trip_id?: string | null
  latitude: number
  longitude: number
  speed_kmh?: number | null
  heading_degrees?: number | null
  accuracy_m?: number | null
  ignition_on?: boolean | null
  recorded_at: string
  source: string
  provider?: string | null
  external_device_id?: string | null
  metadata?: Record<string, unknown> | null
  created_at?: string
  asset_code?: string | null
  asset_name?: string | null
  asset_plate?: string | null
  asset_status?: string | null
  asset_type?: string | null
  driver_name?: string | null
  trip_number?: string | null
  trip_status?: string | null
  trip_execution_status?: string | null
}

export type GpsDevice = {
  id: string
  asset_id: string
  provider: string
  external_device_id: string
  label?: string | null
  active: boolean
  last_seen_at?: string | null
  last_latitude?: number | null
  last_longitude?: number | null
  last_speed_kmh?: number | null
  created_at: string
  updated_at: string
}
