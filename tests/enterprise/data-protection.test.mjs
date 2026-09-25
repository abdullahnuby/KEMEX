import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)))

test('data protection backup workflow is scheduled, manual, and least-privilege', () => {
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/backup.yml'), 'utf8')
  assert.match(workflow, /schedule:/)
  assert.match(workflow, /cron:\s*['"]0 2 \* \* \*['"]/) 
  assert.match(workflow, /workflow_dispatch:/)
  assert.match(workflow, /permissions:\s*\n\s+contents:\s+read/)
  assert.match(workflow, /awscli\.amazonaws\.com\/v2\/install\.sh/)
  assert.doesNotMatch(workflow, /apt-get install[^\n]*awscli/i)
  assert.doesNotMatch(workflow, /service_role|sb_secret_/i)
})

test('backup script captures database, auth, storage metadata and storage binaries', () => {
  const script = fs.readFileSync(path.join(root, 'scripts/backup/kemex-backup.mjs'), 'utf8')
  for (const needle of [
    "'--role-only'",
    "'--data-only'",
    "'--schema', 'auth'",
    "'--schema', 'storage'",
    "'s3', 'sync'",
    "'migration-history-schema.sql'",
    "'migration-history-data.sql'",
    'KEMEX_BACKUP_AGE_RECIPIENT',
    "'put-object-retention'",
    "'head-object'",
    'backup_registry',
  ]) assert.ok(script.includes(needle), `Missing backup construct: ${needle}`)
})

test('migration 028 is the repository GPS migration and sequence is contiguous', () => {
  const files = fs.readdirSync(path.join(root, 'supabase/migrations'))
  assert.ok(files.includes('028_live_gps_tracking.sql'))
  assert.ok(!files.includes('029_live_gps_tracking.sql'))
  const verifier = fs.readFileSync(path.join(root, 'scripts/verify-migrations.mjs'), 'utf8')
  assert.doesNotMatch(verifier, /historical.*028.*gap/i)
})
