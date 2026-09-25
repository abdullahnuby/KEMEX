import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../..', import.meta.url))
const migration = fs.readFileSync(
  path.join(root, 'supabase/migrations/029_live_gps_tracking.sql'),
  'utf8',
)
const page = fs.readFileSync(
  path.join(root, 'src/pages/GpsTrackingPage.tsx'),
  'utf8',
)
const map = fs.readFileSync(
  path.join(root, 'src/components/GpsTrackingMap.tsx'),
  'utf8',
)
const service = fs.readFileSync(
  path.join(root, 'src/features/gpsTracking/service.ts'),
  'utf8',
)
const ingest = fs.readFileSync(
  path.join(root, 'supabase/functions/gps-ingest/index.ts'),
  'utf8',
)
const config = fs.readFileSync(
  path.join(root, 'src/config/app.ts'),
  'utf8',
)

test('GPS schema has device registry, telemetry history and secured latest view', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.vehicle_gps_devices/)
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.vehicle_gps_positions/)
  assert.match(migration, /vehicle_gps_devices_active_asset_uidx/)
  assert.match(migration, /CREATE POLICY vehicle_gps_positions_read/)
  assert.match(migration, /vehicle_gps_devices_insert/)
  assert.match(migration, /WITH CHECK \(false\)/)
  assert.match(migration, /vehicle_latest_gps_positions/)
  assert.match(migration, /security_invoker = true/)
})

test('tracking service uses the existing Supabase client and Realtime', () => {
  assert.match(service, /requireSupabase/)
  assert.match(service, /vehicle_latest_gps_positions/)
  assert.match(service, /postgres_changes/)
  assert.match(service, /vehicle_gps_positions/)
})

test('tracking UI has vehicle map, health states, history and device registration', () => {
  for (const needle of [
    'تتبع المركبات',
    'متصل الآن',
    'متأخر',
    'غير متصل',
    'تسجيل جهاز GPS',
    'تاريخ المسار',
    'gps-ingest',
  ]) {
    assert.match(page, new RegExp(needle))
  }
  assert.match(map, /openstreetmap\.org/)
  assert.match(map, /circleMarker/)
  assert.match(map, /polyline/)
})

test('GPS device management has a centralized capability', () => {
  assert.match(config, /'gps:manage_devices': \['admin','fleet'\]/)
})

test('GPS ingestion stays server-side behind a custom secret', () => {
  assert.match(ingest, /KEMEX_GPS_INGEST_SECRET/)
  assert.match(ingest, /x-kemex-gps-secret/)
  assert.match(ingest, /vehicle_gps_devices/)
  assert.match(ingest, /vehicle_gps_positions/)
  assert.match(ingest, /SUPABASE_SERVICE_ROLE_KEY/)
})
