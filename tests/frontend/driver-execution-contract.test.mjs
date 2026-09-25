import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../..', import.meta.url))
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')
const migration = read('supabase/migrations/025_driver_transport_execution.sql')
const app = read('src/App.tsx')
const portal = read('src/pages/driver/DriverPortal.tsx')
const config = read('src/config/app.ts')
const service = read('src/features/driverExecution/service.ts')

const normalFlow = ['assigned','to_pickup','arrived_pickup','pickup_confirmed','in_transit','arrived_delivery','delivered','completed']

test('driver execution exposes the requested normal state machine', () => {
  for (const state of normalFlow) assert.match(migration, new RegExp(`'${state}'`))
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.driver_trip_transition/)
  assert.match(migration, /IF\s+p_to_status\s*=\s*'to_pickup'\s+AND\s+t\.execution_status\s*=\s*'assigned'/)
  assert.match(migration, /ELSIF\s+p_to_status\s*=\s*'pickup_confirmed'\s+AND\s+t\.execution_status\s*=\s*'arrived_pickup'/)
  assert.match(migration, /ELSIF\s+p_to_status\s*=\s*'in_transit'\s+AND\s+t\.execution_status\s*=\s*'pickup_confirmed'/)
  assert.match(migration, /ELSIF\s+p_to_status\s*=\s*'arrived_delivery'\s+AND\s+t\.execution_status\s*=\s*'in_transit'/)
  assert.match(migration, /ELSIF\s+p_to_status\s*=\s*'delivered'\s+AND\s+t\.execution_status\s*=\s*'arrived_delivery'/)
  assert.match(migration, /ELSIF\s+p_to_status\s*=\s*'completed'\s+AND\s+t\.execution_status\s*=\s*'delivered'/)
})

test('driver execution has no rejection workflow and server-side ownership checks', () => {
  assert.doesNotMatch(portal, /reject|rejection|رفض\s*(الرحلة|التكليف)/i)
  assert.match(migration, /t\.driver_id IS DISTINCT FROM v_driver_id/)
  assert.match(migration, /private\.can_action\(\s*'trips'\s*,\s*'driver_execute'\s*\)/)
  assert.match(migration, /REVOKE\s+INSERT,\s*UPDATE,\s*DELETE\s+ON\s+public\.trip_execution_events\s+FROM\s+authenticated/)
})

test('pickup and delivery confirmations require receipts plus geofence validation', () => {
  const receiptChecks = migration.match(/إيصال الاستلام مطلوب قبل تأكيد التحميل/g) || []
  assert.equal(receiptChecks.length, 1)
  assert.match(migration, /إيصال التسليم مطلوب قبل تأكيد التسليم/)
  assert.match(migration, /private\.validate_driver_trip_geofence\s*\(\s*t\.id\s*,\s*p_latitude\s*,\s*p_longitude\s*,\s*'pickup'\s*,\s*p_to_status\s*\)/)
  assert.match(migration, /private\.validate_driver_trip_geofence\s*\(\s*t\.id\s*,\s*p_latitude\s*,\s*p_longitude\s*,\s*'delivery'\s*,\s*p_to_status\s*\)/)
  assert.match(migration, /UPDATE\s+public\.trip_receipts\s+SET\s+distance_meters\s*=\s*v_distance\s+WHERE\s+id\s*=\s*p_receipt_id/)
  assert.match(migration, /trip_geofence_radius_m/)
})

test('exceptions persist in timeline and emergency gets critical priority', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.trip_exceptions/)
  assert.match(migration, /linked_attachment_ids jsonb NOT NULL DEFAULT '\[\]'::jsonb/)
  assert.match(migration, /v_priority\s+text\s*:=\s*CASE\s+WHEN\s+p_exception_type\s*=\s*'EMERGENCY'\s+THEN\s*'critical'/s)
  assert.match(migration, /PROBLEM_RESOLVED/)
  assert.match(migration, /DRIVER_EMERGENCY/)
  assert.match(migration, /DRIVER_EXCEPTION/)
})

test('driver portal is isolated from the administrative shell and has core surfaces', () => {
  assert.match(app, /user\.role === 'driver'/)
  assert.match(app, /<DriverPortal user=\{user\} onLogout=\{handleLogout\} \/>/)
  for (const route of ['/driver', '/driver/trips', '/driver/trips/:id', '/driver/history', '/driver/notifications', '/driver/profile']) {
    assert.match(portal, new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
  for (const text of ['تبليغ عن مشكلة','تبليغ عن عطل','حالة طارئة','إيصال الاستلام','إيصال التسليم']) assert.match(portal, new RegExp(text))
})

test('driver upload service uses the existing attachment system and structured receipt rows', () => {
  assert.match(service, /uploadAttachment\(\{ entityType: 'trip_receipt'/)
  assert.match(service, /from\('trip_receipts'\)/)
  assert.match(service, /rpc\('driver_trip_transition'/)
  assert.match(service, /rpc\('driver_report_trip_exception'/)
})

test('driver role is present in the shared permission model', () => {
  assert.match(config, /RoleKey[\s\S]*driver/)
  assert.match(config, /'trips:driver_execute'/)
  assert.match(config, /'trips:driver_receipt'/)
  assert.match(config, /'trips:driver_exception'/)
  assert.match(config, /'trips:override_geofence'/)
})
