import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../..', import.meta.url))
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

test('trips workflow requires explicit confirmation before advancing commercial status', () => {
  const page = read('src/pages/TripsPage.tsx')
  assert.match(page, /ConfirmModal/)
  assert.match(page, /pendingAdvance/)
  assert.match(page, /requestAdvance/)
  assert.match(page, /onConfirm=\{confirmAdvance\}/)
})

test('trip detail blocks direct invoicing transition until invoice is linked and confirms later transitions', () => {
  const page = read('src/pages/TripDetailPage.tsx')
  assert.match(page, /requiresInvoiceLink/)
  assert.match(page, /id=\"trip-invoice-input\"/)
  assert.match(page, /ربط الفاتورة/)
  assert.match(page, /pendingStatus/)
  assert.match(page, /onConfirm=\{confirmTransition\}/)
})

test('trip status transitions remain server-validated through the trips service', () => {
  const service = read('src/features/trips/service.ts')
  assert.match(service, /assertTransition\('transportation'/)
  assert.match(service, /لا يمكن تحويل الرحلة إلى مفوترة بدون رقم فاتورة/)
})
