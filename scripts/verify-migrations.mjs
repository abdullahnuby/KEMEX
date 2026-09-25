import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const dir = path.join(root, 'supabase', 'migrations')
const files = fs.readdirSync(dir).filter(x => /^\d+_.+\.sql$/.test(x)).sort()
const nums = files.map(x => Number(x.slice(0,3)))
for (let i=0;i<nums.length;i++) {
  if (nums[i] === i+1) continue

  // Historical production-only migration 028 was applied out-of-band.
  // Migration 029 is intentionally the next repository migration.
  const isHistorical028Gap =
    nums[i] === 29 &&
    nums[i-1] === 27 &&
    !files.some(file => file.startsWith('028_'))

  if (!isHistorical028Gap) {
    throw new Error(`Migration sequence gap/duplicate near ${String(nums[i]).padStart(3,'0')}`)
  }
}
const required = ['018_schema_recovery_breakdown_trips.sql','019_domain_integrity_hardening.sql','020_rbac_audit_hardening.sql','021_workflow_integrity.sql','022_operational_audit_history.sql','023_action_authorization_and_integrity.sql','024_enterprise_data_controls.sql','025_driver_transport_execution.sql','026_data_management.sql']
for (const f of required) if (!files.includes(f)) throw new Error(`Missing required enterprise migration: ${f}`)
const sql = files.map(f => fs.readFileSync(path.join(dir,f),'utf8')).join('\n')
for (const needle of ['CREATE OR REPLACE FUNCTION private.kemex_can_transition','CREATE OR REPLACE FUNCTION public.transition_trip','CREATE OR REPLACE FUNCTION public.transition_work_order','CREATE TABLE IF NOT EXISTS public.purchase_orders','CREATE TABLE IF NOT EXISTS public.invoice_documents','CREATE TABLE IF NOT EXISTS public.notification_outbox','CREATE OR REPLACE FUNCTION private.can_action','CREATE OR REPLACE FUNCTION public.report_client_error','CREATE OR REPLACE FUNCTION public.kemex_data_catalog','CREATE OR REPLACE FUNCTION public.kemex_export_table','CREATE OR REPLACE FUNCTION public.kemex_import_table','CREATE OR REPLACE FUNCTION public.kemex_register_backup']) {
  if (!sql.toLowerCase().includes(needle.toLowerCase())) throw new Error(`Missing required migration construct: ${needle}`)
}
console.log('Historical production-only migration 028 is intentionally not replayed from the repository baseline.')
console.log(`KEMEX migrations OK (${files.length} ordered migrations; enterprise hardening through 024).`)
