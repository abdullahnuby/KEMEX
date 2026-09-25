import fs from 'node:fs'
import assert from 'node:assert/strict'

const root = new URL('../../', import.meta.url).pathname
const read = file => fs.readFileSync(root + file, 'utf8')

const page = read('src/pages/OperationalWorkflowPage.tsx')
const workspace = read('src/pages/WorkspacesPage.tsx')

assert.match(workspace, /OperationalWorkflowPage/)
assert.match(workspace, /operational\('operations'\)/)
assert.match(workspace, /operational\('requests'\)/)
assert.match(workspace, /operational\('assignments'\)/)
assert.match(page, /قائمة العمل التشغيلية/)
assert.match(page, /ConfirmModal/)
assert.doesNotMatch(page, /window\.confirm/)
assert.match(page, /mobilePresentation="cards"/)
assert.match(page, /requests/) 
assert.match(page, /assignments/)
assert.match(page, /operations/)
console.log('KEMEX Sprint 10 Operations workflow contract: PASS')
