import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(new URL('.', import.meta.url).pathname, '..')
const dir = path.join(root, 'supabase', 'migrations')
const files = fs.readdirSync(dir).filter(x => /^\d+_.+\.sql$/.test(x)).sort()
const nums = files.map(x => Number(x.slice(0,3)))
for (let i=0;i<nums.length;i++) {
  if (nums[i] !== i+1) throw new Error(`Migration sequence gap/duplicate near ${String(nums[i]).padStart(3,'0')}`)
}
const required = ['018_schema_recovery_breakdown_trips.sql','019_domain_integrity_hardening.sql','020_rbac_audit_hardening.sql','021_workflow_integrity.sql','022_operational_audit_history.sql','023_action_authorization_and_integrity.sql','024_enterprise_data_controls.sql']
for (const f of required) if (!files.includes(f)) throw new Error(`Missing required enterprise migration: ${f}`)
const sql = files.map(f => fs.readFileSync(path.join(dir,f),'utf8')).join('\n')
for (const needle of ['CREATE OR REPLACE FUNCTION private.kemex_can_transition','CREATE OR REPLACE FUNCTION public.transition_trip','CREATE OR REPLACE FUNCTION public.transition_work_order','CREATE TABLE IF NOT EXISTS public.purchase_orders','CREATE TABLE IF NOT EXISTS public.invoice_documents','CREATE TABLE IF NOT EXISTS public.notification_outbox','CREATE OR REPLACE FUNCTION private.can_action','CREATE OR REPLACE FUNCTION public.report_client_error']) {
  if (!sql.toLowerCase().includes(needle.toLowerCase())) throw new Error(`Missing required migration construct: ${needle}`)
}
console.log(`KEMEX migrations OK (${files.length} ordered migrations; enterprise hardening through 024).`)
