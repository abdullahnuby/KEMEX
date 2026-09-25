import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '../..')
const read = p => fs.readFileSync(path.join(root, p), 'utf8')

test('maintenance bulk workflow uses the shared confirmation contract', () => {
  const source = read('src/pages/MaintenancePage.tsx')
  assert.match(source, /ConfirmModal/)
  assert.doesNotMatch(source, /window\.confirm/)
  assert.match(source, /requestBulkWaitingForParts/)
  assert.match(source, /confirmBulkWaitingForParts/)
  assert.match(source, /queueFilter/)
  assert.match(source, /طابور العمل/)
})

test('breakdown workspace exposes operational queues without removing existing filters', () => {
  const source = read('src/pages/BreakdownListPage.tsx')
  assert.match(source, /ConfirmModal/)
  assert.match(source, /queueFilter/)
  assert.match(source, /طابور الأعطال/)
  assert.match(source, /under_repair/)
  assert.match(source, /in_transit_to_workshop/)
  assert.match(source, /72/)
  assert.match(source, /setStatusFilter\(''\)/)
  assert.match(source, /setSeverityFilter\(''\)/)
})
