import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../..', import.meta.url))
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

test('notification center is connected to durable outbox data', () => {
  const service = read('src/features/notifications/service.ts')
  const hook = read('src/features/notifications/useNotifications.ts')
  const app = read('src/App.tsx')
  const layout = read('src/components/Layout.tsx')
  const navbar = read('src/components/shell/AppNavbar.tsx')
  const popovers = read('src/components/shell/ShellPopovers.tsx')

  assert.match(service, /notification_outbox/)
  assert.match(service, /markRead/)
  assert.match(service, /markAllRead/)
  assert.match(hook, /setInterval/)
  assert.match(hook, /visibilitychange/)
  assert.match(app, /useNotifications/)
  assert.match(layout, /notificationUnreadCount/)
  assert.match(navbar, /notificationUnreadCount/)
  assert.match(popovers, /فتح مركز التنبيهات/)
})

test('operations center is wired into route navigation', () => {
  const mainRoutes = read('src/app/routing/AppRoutes.tsx')
  const config = read('src/config/app.ts')
  const page = read('src/pages/OperationsCenterPage.tsx')

  assert.match(mainRoutes, /OperationsCenterPage/)
  assert.match(mainRoutes, /path=['"]operations-center['"]/)
  assert.match(config, /operations-center/)
  assert.match(page, /الرحلات المتأخرة/)
  assert.match(page, /الاستثناءات التشغيلية/)
  assert.match(page, /آخر التنبيهات/)
})
