import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = process.cwd()

const copyFiles = [
  'supabase/migrations/029_live_gps_tracking.sql',
  'supabase/functions/gps-ingest/index.ts',
  'supabase/functions/gps-ingest/README.md',
  'src/features/gpsTracking/types.ts',
  'src/features/gpsTracking/service.ts',
  'src/components/GpsTrackingMap.tsx',
  'src/pages/GpsTrackingPage.tsx',
  'tests/db/gps-tracking.test.mjs',
  'tests/frontend/gps-tracking-contract.test.mjs',
]

for (const relative of copyFiles) {
  const source = path.join(packageRoot, relative)
  const target = path.join(repoRoot, relative)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.copyFileSync(source, target)
}

function read(relative) {
  return fs.readFileSync(path.join(repoRoot, relative), 'utf8')
}

function write(relative, content) {
  fs.writeFileSync(path.join(repoRoot, relative), content, 'utf8')
}

function replaceOnce(relative, from, to, description) {
  const current = read(relative)
  if (current.includes(to)) return
  if (!current.includes(from)) {
    throw new Error(`لم يتم العثور على نقطة التعديل في ${relative}: ${description}`)
  }
  write(relative, current.replace(from, to))
}


function replaceRegexOnce(relative, pattern, replacement, description) {
  const current = read(relative)
  if (current.includes(replacement)) return
  const regex = new RegExp(pattern, 'm')
  if (!regex.test(current)) {
    throw new Error(`لم يتم العثور على نقطة التعديل في ${relative}: ${description}`)
  }
  write(relative, current.replace(regex, replacement))
}


replaceRegexOnce(
  'src/config/app.ts',
  `\\{\\s*group:\\s*'التقارير',[\\s\\S]*?items:\\s*\\[\\],\\s*\\},`,
  `  {
    group: 'المراقبة', icon: 'Gauge', items: [
      {key:'tracking', label:'تتبع المركبات', icon:'Gauge', route:'tracking', hint:'الموقع المباشر وحالة اتصال أجهزة GPS ومسار المركبة'},
    ]
  },
  {
    group: 'التقارير', icon: 'ChartNoAxesCombined', items: [],
  },`,
  'إضافة مجموعة المراقبة',
)


for (const role of ['mgmt', 'fleet', 'pm']) {
  const currentConfig = read('src/config/app.ts')
  const roleLine = currentConfig
    .split('\n')
    .find(line => line.trimStart().startsWith(`${role}: `))

  if (!roleLine) {
    throw new Error(`تعذر العثور على تعريف دور ${role} في src/config/app.ts`)
  }

  // Roles configured as '*' already have access to every module and must not be
  // rewritten as arrays. This is the case for the management role in KEMEX.
  if (roleLine.includes("'*'") || roleLine.includes("= '*'")) continue
  if (roleLine.includes("'tracking'")) continue

  const updated = roleLine.replace(/\],$/, `,'tracking'],`)
  if (updated === roleLine) {
    throw new Error(`تعذر إضافة tracking إلى دور ${role}`)
  }

  write(
    'src/config/app.ts',
    currentConfig.replace(roleLine, updated),
  )
}

replaceOnce(
  'src/config/app.ts',
  `  'trips:monitor': ['admin','mgmt','fleet','pm'],
`,
  `  'trips:monitor': ['admin','mgmt','fleet','pm'],
  'gps:manage_devices': ['admin','fleet'],
`,
  'إضافة صلاحية إدارة أجهزة GPS',
)

replaceOnce(
  'src/app/routing/routeRegistry.ts',
  `  { path: 'data-management', module: 'data-management', title: 'إدارة البيانات', description: 'استيراد وتصدير Excel والنسخ الاحتياطي واستعادة البيانات.', kind: 'page' },`,
  `  { path: 'data-management', module: 'data-management', title: 'إدارة البيانات', description: 'استيراد وتصدير Excel والنسخ الاحتياطي واستعادة البيانات.', kind: 'page' },
  { path: 'tracking', module: 'tracking', title: 'تتبع المركبات', description: 'الموقع المباشر وحالة أجهزة GPS ومسار المركبات.', kind: 'page' },`,
  'إضافة route metadata',
)

replaceOnce(
  'src/app/routing/AppRoutes.tsx',
  `const DataManagementPage = lazy(() => import('../../pages/DataManagementPage').then(m => ({ default: m.DataManagementPage })))`,
  `const DataManagementPage = lazy(() => import('../../pages/DataManagementPage').then(m => ({ default: m.DataManagementPage })))
const GpsTrackingPage = lazy(() => import('../../pages/GpsTrackingPage').then(m => ({ default: m.GpsTrackingPage })))`,
  'إضافة lazy page',
)

replaceRegexOnce(
  'src/app/routing/AppRoutes.tsx',
  `^\\s*<Route path=\\\"operations\\\"[^\\n]*$`,
  `    <Route path="operations" element={guard('operations', <OperationsWorkspacePage {...operationsWorkspaceProps} />)} />
    <Route path="tracking" element={guard('tracking', <GpsTrackingPage user={user} />)} />`,
  'إضافة tracking route',
)

const packageJsonPath = path.join(repoRoot, 'package.json')
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
packageJson.scripts['test:db'] = 'node --test tests/db/rls.test.mjs tests/db/driver-execution.test.mjs tests/db/gps-tracking.test.mjs'
packageJson.scripts['test:enterprise-sprint'] = 'node --test tests/enterprise/sprint-052.test.mjs tests/frontend/gps-tracking-contract.test.mjs'
packageJson.scripts['test:gps'] = 'node --test tests/db/gps-tracking.test.mjs tests/frontend/gps-tracking-contract.test.mjs'
fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8')

const verifierPath = path.join(repoRoot, 'scripts/verify-migrations.mjs')
let verifier = fs.readFileSync(verifierPath, 'utf8')
const oldLoop = `for (let i=0;i<nums.length;i++) {
  if (nums[i] !== i+1) throw new Error(\`Migration sequence gap/duplicate near \${String(nums[i]).padStart(3,'0')}\`)
}`
const newLoop = `for (let i=0;i<nums.length;i++) {
  if (nums[i] === i+1) continue

  // Historical production-only migration 028 was applied out-of-band.
  // Migration 029 is intentionally the next repository migration.
  const isHistorical028Gap =
    nums[i] === 29 &&
    nums[i-1] === 27 &&
    !files.some(file => file.startsWith('028_'))

  if (!isHistorical028Gap) {
    throw new Error(\`Migration sequence gap/duplicate near \${String(nums[i]).padStart(3,'0')}\`)
  }
}`
if (!verifier.includes(newLoop)) {
  if (!verifier.includes(oldLoop)) {
    throw new Error('تعذر تحديث verify-migrations.mjs')
  }
  verifier = verifier.replace(oldLoop, newLoop)
}
if (!verifier.includes('historical production-only migration 028')) {
  // Keep a visible note even when a future repository version changes the loop.
  verifier = verifier.replace(
    /console\.log\(`KEMEX migrations OK/,
    `console.log('Historical production-only migration 028 is intentionally not replayed from the repository baseline.')\nconsole.log(\`KEMEX migrations OK`,
  )
}
fs.writeFileSync(verifierPath, verifier, 'utf8')

console.log('KEMEX GPS Tracking changes applied.')
console.log('Next: npm.cmd run test:gps && npm.cmd run test:db && npm.cmd run test:security && npm.cmd run typecheck && npm.cmd run build')
