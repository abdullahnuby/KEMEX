import { createClient } from '@supabase/supabase-js'

const url = process.env.KEMEX_SUPABASE_URL || process.env.VITE_SUPABASE_URL
const key = process.env.KEMEX_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
if (!url || !key) throw new Error('Set KEMEX_SUPABASE_URL and KEMEX_SUPABASE_SERVICE_KEY (or a scoped publishable key for read-only smoke checks).')

const db = createClient(url, key, { auth: { persistSession: false } })
const checks = [
  ['purchase_orders', () => db.from('purchase_orders').select('id', { count: 'exact', head: true })],
  ['invoice_documents', () => db.from('invoice_documents').select('id', { count: 'exact', head: true })],
  ['notification_outbox', () => db.from('notification_outbox').select('id', { count: 'exact', head: true })],
  ['attachment_metadata', () => db.from('attachment_metadata').select('id', { count: 'exact', head: true })],
  ['client_error_events', () => db.from('client_error_events').select('id', { count: 'exact', head: true })],
  ['release_registry', () => db.from('release_registry').select('id', { count: 'exact', head: true })],
  ['backup_registry', () => db.from('backup_registry').select('id', { count: 'exact', head: true })],
]
for (const [name, fn] of checks) {
  const { error } = await fn()
  if (error) throw new Error(`${name}: ${error.message}`)
  console.log(`PASS ${name}`)
}
console.log('KEMEX production schema smoke check passed.')
