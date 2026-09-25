import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../..', import.meta.url))
const read = p => fs.readFileSync(path.join(root, p), 'utf8')

const service = read('src/features/notifications/service.ts')
const hook = read('src/features/notifications/useNotificationCenter.ts')
const popover = read('src/components/shell/ShellPopovers.tsx')
const navbar = read('src/components/shell/AppNavbar.tsx')
const alerts = read('src/pages/AlertsPage.tsx')
const center = read('src/pages/OperationsCenterPage.tsx')
const routes = read('src/app/routing/AppRoutes.tsx')
const app = read('src/config/app.ts')
const registry = read('src/app/routing/routeRegistry.ts')


test('notification service is user-scoped and supports read state', () => {
  assert.match(service, /from\('notification_outbox'\)/)
  assert.match(service, /eq\('recipient_id', userId\)/)
  assert.match(service, /update\(\{ read_at:/)
  assert.match(service, /is\('read_at', null\)/)
})

test('notification center polls existing durable inbox without a second Supabase client', () => {
  assert.match(hook, /notificationService\.list\(userId\)/)
  assert.match(hook, /20_000/)
  assert.match(hook, /visibilitychange/)
})

test('bell exposes durable notifications and links to the center', () => {
  assert.match(popover, /مركز التنبيهات/)
  assert.match(popover, /فتح مركز التنبيهات/)
  assert.match(navbar, /notificationUnreadCount/)
  assert.match(navbar, /NotificationPopover/)
})

test('alerts page combines persisted notifications with derived operational alerts', () => {
  assert.match(alerts, /الرسائل التشغيلية الموجهة/)
  assert.match(alerts, /الاستحقاقات والتنبيهات الذكية/)
  assert.match(alerts, /onMarkAllRead/)
})

test('operations center has an explicit route and operational attention metrics', () => {
  assert.match(center, /مركز التشغيل/)
  assert.match(center, /رحلات متأخرة/)
  assert.match(center, /استثناءات الرحلات/)
  assert.match(routes, /path="operations-center"/)
  assert.match(app, /operations-center/)
  assert.match(registry, /path: 'operations-center'/)
})
