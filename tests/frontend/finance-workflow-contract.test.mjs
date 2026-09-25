import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.cwd())

function read(file) { return fs.readFileSync(path.join(root, file), 'utf8') }

test('finance workflow uses controlled settlement and confirmation', () => {
  const source = read('src/pages/InvoicesPage.tsx')
  assert.match(source, /ConfirmModal/)
  assert.match(source, /setSettling/)
  assert.match(source, /paymentDate/)
  assert.match(source, /amount>remaining/)
  assert.doesNotMatch(source, /window\.confirm/)
})

test('cost and charging workspaces expose standard table controls', () => {
  const costs = read('src/pages/CostsPage.tsx')
  const charging = read('src/pages/ChargingPage.tsx')
  assert.match(costs, /rangeValid/)
  assert.match(costs, /OperationalSummaryStrip/)
  assert.match(costs, /KEMEX-costs/)
  assert.match(charging, /OperationalSummaryStrip/)
  assert.match(charging, /KEMEX-charging/)
})
