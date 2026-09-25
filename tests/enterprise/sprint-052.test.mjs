import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../..', import.meta.url))
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')
const migration = read('supabase/migrations/024_enterprise_data_controls.sql')
const app = read('src/config/app.ts')
const bootstrap = read('src/features/app/hooks/useKemexDomainQueries.ts')

test('enterprise sprint 0.52 migration covers all ten workstreams', () => {
  for (const needle of ['purchase_orders','invoice_documents','notification_outbox','attachment_metadata','client_error_events','release_registry','backup_registry','private.can_action','trg_enterprise_record_projection','trg_approval_event_notification','report_client_error','kemex-attachments']) {
    assert.match(migration, new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
})

test('UI capability matrix is centralized', () => {
  for (const needle of ['ACTION_PERMISSIONS','users:manage','maintenance:transition','trips:transition','purchases:approve','invoices:pay']) {
    assert.match(app, new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
  assert.match(app, /export function canAction\(/)
})

test('bootstrap is route-scoped instead of loading every generic module on every route', () => {
  assert.match(bootstrap, /const coreModules = \[/)
  assert.match(bootstrap, /const needsAll = \['reports'\]/)
  assert.match(bootstrap, /activeRoute = 'dashboard'/)
})
