import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = process.cwd()

const copyFiles = [
  'supabase/migrations/028_live_gps_tracking.sql',
  'supabase/functions/gps-ingest/index.ts',
  'supabase/functions/gps-ingest/README.md',
  'src/features/gpsTracking/types.ts',
  'src/features/gpsTracking/service.ts',
  'src/components/GpsTrackingMap.tsx',
  'src/pages/GpsTrackingPage.tsx',
  'tests/db/gps-tracking.test.mjs',
  'tests/frontend/gps-tracking-contract.test.mjs',
]

const read = relative => fs.readFileSync(path.join(repoRoot, relative), 'utf8')
const write = (relative, content) => fs.writeFileSync(path.join(repoRoot, relative), content, 'utf8')

for (const relative of copyFiles) {
  const source = path.join(packageRoot, relative)
  const target = path.join(repoRoot, relative)
  if (!fs.existsSync(source)) throw new Error(`ملف الحزمة غير موجود: ${relative}`)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.copyFileSync(source, target)
}

// ------------------------------------------------------------
// 1) Navigation + permissions in src/config/app.ts
// ------------------------------------------------------------
let app = read('src/config/app.ts')

if (!app.includes("key:'tracking'")) {
  const marker = "  {\n    group: 'التقارير',"
  const navGroup = `  {
    group: 'المراقبة',
    icon: 'Gauge',
    items: [
      {key:'tracking', label:'تتبع المركبات', icon:'Gauge', route:'tracking', hint:'الموقع المباشر وحالة اتصال أجهزة GPS ومسار المركبات'},
    ]
  },
`
  if (!app.includes(marker)) {
    throw new Error('تعذر العثور على مجموعة التقارير داخل src/config/app.ts')
  }
  app = app.replace(marker, navGroup + marker)
}

for (const role of ['fleet', 'pm']) {
  const roleRegex = new RegExp(`(^\\s*${role}: \\[)([^\\n]*)(\\],$)`, 'm')
  const match = app.match(roleRegex)
  if (!match) throw new Error(`تعذر العثور على ROLE_MODULES للدور ${role}`)
  if (!match[2].includes("'tracking'")) {
    const body = match[2].trimEnd()
    app = app.replace(roleRegex, `${match[1]}${body},'tracking'${match[3]}`)
  }
}

if (!app.includes("'gps:manage_devices': ['admin','fleet']")) {
  const marker = "  'trips:monitor': ['admin','mgmt','fleet','pm'],\n"
  if (!app.includes(marker)) throw new Error('تعذر العثور على صلاحية trips:monitor')
  app = app.replace(
    marker,
    marker + "  'gps:manage_devices': ['admin','fleet'],\n",
  )
}

write('src/config/app.ts', app)

// ------------------------------------------------------------
// 2) Canonical route metadata
// ------------------------------------------------------------
let routeRegistry = read('src/app/routing/routeRegistry.ts')
if (!routeRegistry.includes("{ path: 'tracking'")) {
  const marker = "  { path: 'data-management',"
  const index = routeRegistry.indexOf(marker)
  if (index < 0) throw new Error('تعذر العثور على data-management في routeRegistry')
  const lineEnd = routeRegistry.indexOf('\n', index)
  const insertion = "\n  { path: 'tracking', module: 'tracking', title: 'تتبع المركبات', description: 'الموقع المباشر وحالة أجهزة GPS ومسار المركبات.', kind: 'page' },"
  routeRegistry = routeRegistry.slice(0, lineEnd) + insertion + routeRegistry.slice(lineEnd)
}
write('src/app/routing/routeRegistry.ts', routeRegistry)

// ------------------------------------------------------------
// 3) REAL route binding: prevent :moduleKey from catching tracking
// ------------------------------------------------------------
let routes = read('src/app/routing/AppRoutes.tsx')

if (!routes.includes("const GpsTrackingPage = lazy(() => import('../../pages/GpsTrackingPage')")) {
  const importMarker = "const DataManagementPage = lazy(() => import('../../pages/DataManagementPage').then(m => ({ default: m.DataManagementPage })))"
  if (!routes.includes(importMarker)) throw new Error('تعذر العثور على DataManagementPage في AppRoutes.tsx')
  routes = routes.replace(
    importMarker,
    importMarker + "\nconst GpsTrackingPage = lazy(() => import('../../pages/GpsTrackingPage').then(m => ({ default: m.GpsTrackingPage })))",
  )
}

if (!routes.includes('<Route path="tracking"')) {
  const operationsRoute = `    <Route path="operations" element={guard('operations', <OperationsWorkspacePage {...operationsWorkspaceProps} />)} />`
  if (!routes.includes(operationsRoute)) throw new Error('تعذر العثور على operations route في AppRoutes.tsx')
  const trackingRoute = `\n    <Route path="tracking" element={guard('tracking', <GpsTrackingPage user={user} />)} />`
  routes = routes.replace(operationsRoute, operationsRoute + trackingRoute)
}

write('src/app/routing/AppRoutes.tsx', routes)

// ------------------------------------------------------------
// 4) Windows-safe verify-migrations
// ------------------------------------------------------------
let verifier = read('scripts/verify-migrations.mjs')
if (verifier.includes('new URL') && verifier.includes('.pathname')) {
  verifier = verifier.replace(
    "import fs from 'node:fs'\nimport path from 'node:path'",
    "import fs from 'node:fs'\nimport path from 'node:path'\nimport { fileURLToPath } from 'node:url'",
  )
  verifier = verifier.replace(
    "const root = path.resolve(new URL('.', import.meta.url).pathname, '..')",
    "const root = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..')",
  )
}
write('scripts/verify-migrations.mjs', verifier)

// ------------------------------------------------------------
// 5) package scripts
// ------------------------------------------------------------
const packagePath = path.join(repoRoot, 'package.json')
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
pkg.scripts['test:gps'] = 'node --test tests/db/gps-tracking.test.mjs tests/frontend/gps-tracking-contract.test.mjs'
if (!pkg.scripts['test:db'].includes('tests/db/gps-tracking.test.mjs')) {
  pkg.scripts['test:db'] = 'node --test tests/db/rls.test.mjs tests/db/driver-execution.test.mjs tests/db/gps-tracking.test.mjs'
}
if (!pkg.scripts['test:enterprise-sprint'].includes('tests/frontend/gps-tracking-contract.test.mjs')) {
  pkg.scripts['test:enterprise-sprint'] = 'node --test tests/enterprise/sprint-052.test.mjs tests/frontend/gps-tracking-contract.test.mjs'
}
fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n', 'utf8')

// ------------------------------------------------------------
// 6) Verify final binding before declaring success
// ------------------------------------------------------------
const finalApp = read('src/config/app.ts')
const finalRegistry = read('src/app/routing/routeRegistry.ts')
const finalRoutes = read('src/app/routing/AppRoutes.tsx')

for (const [label, ok] of [
  ['navbar tracking item', finalApp.includes("key:'tracking'")],
  ['tracking permission', finalApp.includes("'gps:manage_devices': ['admin','fleet']")],
  ['tracking route metadata', finalRegistry.includes("{ path: 'tracking'")],
  ['GpsTrackingPage import', finalRoutes.includes('GpsTrackingPage')],
  ['tracking explicit route', finalRoutes.includes('<Route path="tracking"')],
]) {
  if (!ok) throw new Error(`فشل التحقق النهائي: ${label}`)
}

console.log('✅ KEMEX GPS Tracking integrated successfully.')
console.log('✅ Navbar: المراقبة > تتبع المركبات')
console.log('✅ Route: /tracking')
console.log('✅ GpsTrackingPage is explicitly bound before :moduleKey fallback')
console.log('✅ Device management capability: gps:manage_devices')
console.log('✅ Windows-safe migration verifier applied')
console.log('Next commands:')
console.log('npm.cmd run test:gps')
console.log('npm.cmd run test:driver')
console.log('npm.cmd run test:enterprise-sprint')
console.log('npm.cmd run test:db')
console.log('npm.cmd run test:security')
console.log('npm.cmd run verify:migrations')
console.log('npm.cmd run test:source')
console.log('npm.cmd run verify:source')
console.log('npm.cmd run test:map')
console.log('npm.cmd run typecheck')
console.log('npm.cmd run build')
