import fs from 'node:fs'
import assert from 'node:assert/strict'

const inventory = fs.readFileSync('src/pages/InventoryPage.tsx', 'utf8')
const purchases = fs.readFileSync('src/pages/PurchasesPage.tsx', 'utf8')

assert.match(inventory, /OperationalSummaryStrip/)
assert.match(inventory, /id: 'stockHealth'/)
assert.match(inventory, /searchPlaceholder="ابحث بالكود أو اسم الصنف أو الباركود/)
assert.match(inventory, /hideOnMobile:true/)
assert.doesNotMatch(inventory, /window\.confirm\s*\(/)

assert.match(purchases, /ConfirmModal/)
assert.match(purchases, /id:'status'/)
assert.match(purchases, /id:'receiptStatus'/)
assert.match(purchases, /تأكيد الرفض/)
assert.doesNotMatch(purchases, /window\.confirm\s*\(/)

console.log('KEMEX Sprint 06 inventory/purchases contract: PASS')
