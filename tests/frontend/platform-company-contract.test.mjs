import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')

test('platform company management is wired end-to-end', () => {
  const page = read('src/pages/PlatformCompaniesPage.tsx')
  const service = read('src/services/platformService.ts')
  const routes = read('src/app/routing/AppRoutes.tsx')
  const registry = read('src/app/routing/routeRegistry.ts')
  const navbar = read('src/components/shell/AppNavbar.tsx')
  const appConfig = read('src/config/app.ts')
  const migration = read('supabase/migrations/034_platform_company_management.sql')
  const fn = read('supabase/functions/platform-admin/index.ts')

  assert.match(page, /createPlatformTenant/)
  assert.match(page, /listPlatformTenants/)
  assert.match(page, /trial.*standard.*enterprise/s)
  assert.match(service, /functions\.invoke\('platform-admin'/)
  assert.match(routes, /path="platform"/)
  assert.match(registry, /path: 'platform'/)
  assert.match(appConfig, /route:'platform'/)
  assert.match(navbar, /user\.isPlatformOwner === true/)
  assert.match(migration, /create table if not exists public\.platform_operators/)
  assert.match(migration, /insert into public\.platform_operators/)
  assert.match(fn, /action === "list"/)
  assert.match(fn, /action === "create"/)
  assert.match(fn, /auth\.admin\.createUser/)
  assert.match(fn, /tenant_id: tenant\.id/)
})
