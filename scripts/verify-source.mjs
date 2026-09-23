import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const exists = file => fs.existsSync(path.join(root, file))
const fail = message => { throw new Error(message) }

const pkg = JSON.parse(read('package.json'))
const appConfig = read('src/config/app.ts')
if (!appConfig.includes(`version: '${pkg.version}'`)) fail(`config/app.ts version must match package.json (${pkg.version})`)

for (const migration of ['006_purchase_role_alignment', '007_form_data_expansion', '008_security_and_integrity']) {
  if (!exists(`supabase/migrations/${migration}.sql`)) fail(`Missing migration ${migration}`)
}

for (const file of [
  'src/pages/PlansPage.tsx',
  'src/pages/InventoryPage.tsx',
  'src/pages/MaintenancePage.tsx',
  'src/pages/OilsPage.tsx',
  'src/pages/TiresPage.tsx',
  'src/pages/PurchasesPage.tsx',
  'src/pages/CostsPage.tsx',
  'src/pages/ChargingPage.tsx',
  'src/pages/InvoicesPage.tsx',
  'src/pages/CustomersPage.tsx',
  'src/pages/AuditPage.tsx',
  'src/pages/WorkspacesPage.tsx',
  'src/utils/referenceLabels.ts',
  'src/components/ReferenceValue.tsx',
]) {
  if (!exists(file)) fail(`Missing required application file: ${file}`)
}

const layoutSource = read('src/components/Layout.tsx')
if (!exists('src/components/shell/AppNavbar.tsx')) fail('Missing canonical AppNavbar component')
if (!layoutSource.includes('<AppNavbar')) fail('Layout must mount canonical AppNavbar')
if (layoutSource.includes('<aside className="sidebar"')) fail('Legacy sidebar is still mounted')

const appSource = read('src/App.tsx')
if (/<Route\s/.test(appSource)) fail('Route declarations must live in src/app/routing/AppRoutes.tsx')
for (const requiredImport of [
  "./app/routing/AppRoutes",
  "./features/app/hooks/useKemexMutations",
  "./features/app/hooks/useKemexBootstrap",
]) {
  if (!appSource.includes(requiredImport)) fail(`App.tsx is missing architecture boundary import: ${requiredImport}`)
}

const routeSource = read('src/app/routing/AppRoutes.tsx')
const routeRegistry = read('src/app/routing/routeRegistry.ts')
const routePaths = [...routeSource.matchAll(/<Route path="([^"]+)"/g)].map(match => match[1])
const registryPaths = [...routeRegistry.matchAll(/path: '([^']+)'/g)].map(match => match[1])
const uniqueRoutes = [...new Set(routePaths)]
const uniqueRegistry = [...new Set(registryPaths)]
if (routePaths.length !== uniqueRoutes.length) fail('Duplicate Route declarations detected')
if (registryPaths.length !== uniqueRegistry.length) fail('Duplicate route registry entries detected')
if (routePaths.length !== registryPaths.length) fail(`Route parity mismatch: ${routePaths.length} rendered vs ${registryPaths.length} registered`)
for (const route of registryPaths) {
  if (!routePaths.includes(route)) fail(`Registered route is not rendered: ${route}`)
}


const phase3Files = [
  'src/components/shell/Breadcrumbs.tsx',
  'src/components/shell/ShellPopovers.tsx',
  'src/components/shell/index.ts',
  'src/shared/ui/design-system.css',
]
for (const file of phase3Files) {
  if (!exists(file)) fail(`Missing Phase 3 shell file: ${file}`)
}
const phase3Shell = read('src/components/shell/AppNavbar.tsx') + read('src/components/Layout.tsx')
for (const marker of ['GlobalSearchPanel', 'NotificationPopover', 'UserMenu', 'Breadcrumbs', 'MobileNavigation']) {
  if (!phase3Shell.includes(marker)) fail(`Application shell is missing Phase 3 boundary: ${marker}`)
}
const phase3Css = read('src/shared/ui/design-system.css')
for (const selector of ['.navbar-search-btn', '.shell-search-popover', '.shell-notification-popover', '.shell-user-popover', '.shell-breadcrumbs', '.mobile-nav-panel']) {
  if (!phase3Css.includes(selector)) fail(`Design system is missing canonical shell selector: ${selector}`)
}

for (const file of [
  'src/app/query/queryKeys.ts',
  'src/features/app/hooks/useKemexDomainQueries.ts',
  'src/features/app/hooks/useKemexBootstrap.ts',
  'src/features/app/hooks/useKemexMutations.ts',
  'src/app/routing/RouteGuard.tsx',
]) {
  if (!exists(file)) fail(`Missing Phase 1 architecture implementation file: ${file}`)
}

const bootstrapSource = read('src/features/app/hooks/useKemexBootstrap.ts')
if (!bootstrapSource.includes('useAssetQueries') || !bootstrapSource.includes('useMaintenanceQueries') || !bootstrapSource.includes('useModuleRecordsQueries')) {
  fail('Bootstrap facade is not composed from domain query boundaries')
}

const mutationSource = read('src/features/app/hooks/useKemexMutations.ts')
if (!mutationSource.includes('queryClient.invalidateQueries({ queryKey: kemexQueryKeys.all })')) fail('Mutation invalidation is not centralized')
if (!mutationSource.includes('queryClient.removeQueries({ queryKey: kemexQueryKeys.all })')) fail('Session cache clearing is not centralized')

const permissionSource = read('src/config/app.ts')
if (!permissionSource.includes('ROLE_MODULES')) fail('Missing role visibility matrix')
const modulesSource = read('src/config/modules.ts')
if (!modulesSource.includes("export { canWriteModule } from './app'")) fail('Module write permissions are not re-exported from the canonical permission source')

console.log(`KEMEX architecture integrity: OK`)
console.log(`Version: ${pkg.version}`)
console.log(`Route parity: ${routePaths.length}/${registryPaths.length}`)
console.log('Phase 1 boundaries: routing + permissions + domain queries + mutations + repository access')
console.log('Phase 3 shell: navigation + search + notifications + user menu + breadcrumbs + responsive navigation')

const phase4Files = [
  'src/shared/workflows/workflowDefinitions.ts',
  'src/shared/ui/WorkflowTimeline.tsx',
  'src/shared/ui/WorkflowActionCard.tsx',
  'docs/PHASE-4-ONE-SPRINT.md',
]
for (const file of phase4Files) {
  if (!exists(file)) fail(`Missing Phase 4 UX architecture file: ${file}`)
}
for (const marker of ['VEHICLE_WORKFLOW', 'MAINTENANCE_WORKFLOW', 'TRANSPORTATION_WORKFLOW']) {
  if (!read('src/shared/workflows/workflowDefinitions.ts').includes(marker)) fail(`Missing Phase 4 workflow definition: ${marker}`)
}
for (const [file, markers] of [
  ['src/pages/AssetDetailPage.tsx', ['WorkflowTimeline', 'VEHICLE_WORKFLOW']],
  ['src/pages/BreakdownDetailPage.tsx', ['WorkflowTimeline', 'MAINTENANCE_WORKFLOW']],
  ['src/pages/TripDetailPage.tsx', ['WorkflowTimeline', 'TRANSPORTATION_WORKFLOW']],
  ['src/pages/ModuleRecordsPage.tsx', ['WorkflowQueueBanner']],
]) {
  const source = read(file)
  for (const marker of markers) if (!source.includes(marker)) fail(`Phase 4 UX integration missing in ${file}: ${marker}`)
}
console.log('Phase 4 UX: vehicle + maintenance + transportation workflows + operational queue')


const phase5Files = [
  'src/pages/DashboardPage.tsx',
  'src/components/ui/AnalyticsCharts.tsx',
  'src/components/ui/MetricCard.tsx',
  'src/components/shell/AppNavbar.tsx',
  'docs/PHASE-5-ONE-SPRINT-REPORT.md',
]
for (const file of phase5Files) {
  if (!exists(file)) fail(`Missing Phase 5 sprint file: ${file}`)
}
const dashboardSource = read('src/pages/DashboardPage.tsx')
for (const marker of ['dashboard-command-strip', 'dashboard-period-switch', 'جاهزية الأسطول', 'الأولويات الآن', 'آخر أوامر العمل']) {
  if (!dashboardSource.includes(marker)) fail(`Phase 5 dashboard integration missing: ${marker}`)
}
const dashboardAnalyticsSource = read('src/components/ui/AnalyticsCharts.tsx')
for (const marker of ['secondaryLabel', 'primary-line', 'secondary-line', 'لا توجد بيانات تكلفة أو وقود كافية']) {
  if (!dashboardAnalyticsSource.includes(marker)) fail(`Phase 5 analytics integration missing: ${marker}`)
}
const navbarSource = read('src/components/shell/AppNavbar.tsx')
for (const marker of ['export function AppNavbar', 'desktop-nav', 'mobile-nav-panel', 'GlobalSearchPanel']) {
  if (!navbarSource.includes(marker)) fail(`Canonical navbar migration missing: ${marker}`)
}
const dsSource = read('src/shared/ui/design-system.css')
for (const marker of ['Phase 5 — Command-center dashboard', '.site-navbar', '.dashboard-command-strip', '.dashboard-period-switch']) {
  if (!dsSource.includes(marker)) fail(`Phase 5 design system layer missing: ${marker}`)
}
console.log('Phase 5: dashboard command center + canonical navbar migration + color consolidation')


const phase6to10Files = [
  'src/components/ui/DataTable.tsx',
  'src/shared/ui/FormModal.tsx',
  'src/shared/ui/FormSection.tsx',
  'src/shared/ui/OperationalSummaryStrip.tsx',
  'src/pages/ContractsPage.tsx',
  'docs/PHASE-6-10-ONE-SPRINT-REPORT.md',
]
for (const file of phase6to10Files) {
  if (!exists(file)) fail(`Missing Phase 6-10 sprint file: ${file}`)
}

const tableSource = read('src/components/ui/DataTable.tsx')
for (const marker of ['enableColumnVisibility', 'enableSelection', 'bulkActions', 'exportable', 'stickyHeader', 'pageSizeOptions', 'loading']) {
  if (!tableSource.includes(marker)) fail(`Enterprise DataTable capability missing: ${marker}`)
}
const formSource = read('src/shared/ui/FormModal.tsx') + read('src/shared/ui/FormSection.tsx')
for (const marker of ['dirty', 'protectUnsaved', 'required', 'ds-form-section', 'ds-form-field__error']) {
  if (!formSource.includes(marker)) fail(`Form architecture capability missing: ${marker}`)
}
const contractSource = read('src/pages/ContractsPage.tsx')
for (const marker of ['OperationalSummaryStrip', 'enableColumnVisibility', 'exportable', 'FormModal', 'contractStatus', 'fuelIncluded', 'maintenanceIncluded', 'onDelete']) {
  if (!contractSource.includes(marker)) fail(`Phase 9 contract lifecycle integration missing: ${marker}`)
}
const workspaceSource = read('src/pages/WorkspacesPage.tsx')
if (!workspaceSource.includes("import { ContractsPage } from './ContractsPage'")) fail('ContractsPage is not migrated into the Fleet workspace')
if (!workspaceSource.includes("tab==='contracts'&&<ContractsPage")) fail('Fleet workspace does not render the canonical ContractsPage')
for (const file of ['src/pages/AssetsPage.tsx','src/pages/DriversPage.tsx','src/pages/TripsPage.tsx','src/pages/MaintenancePage.tsx','src/pages/InventoryPage.tsx','src/pages/PurchasesPage.tsx']) {
  const source = read(file)
  if (!source.includes('DataTable')) fail(`Operational entity is missing enterprise table integration: ${file}`)
}
console.log('Phase 6-10: enterprise data + fleet/transport + maintenance + assets/rentals + forms/workflow')

const phase11Files = [
  'src/styles/phase11-responsive.css',
  'docs/PHASE-11-12-ONE-SPRINT-REPORT.md',
]
for (const file of phase11Files) {
  if (!exists(file)) fail(`Missing Phase 11 file: ${file}`)
}
const responsiveCss = read('src/styles/phase11-responsive.css')
for (const marker of [
  '@media (max-width: 1080px)',
  '@media (max-width: 760px)',
  '@media (max-width: 560px)',
  '@media (pointer: coarse)',
  '.ui-data-table__desktop { display: none !important; }',
  '.modal-card',
]) {
  if (!responsiveCss.includes(marker)) fail(`Phase 11 responsive coverage missing: ${marker}`)
}
if (!responsiveCss.includes('.desktop-nav {\n  overflow: visible !important;')) fail('Navbar dropdown overflow regression was not fixed in Phase 11')

const phase12Css = read('src/styles/phase12-rtl.css')
if (!exists('src/styles/phase12-rtl.css')) fail('Missing Phase 12 RTL stylesheet')
for (const marker of [
  "html[dir='rtl']",
  'input[type=\'date\']',
  '.numeric',
  '.reference-number',
  '.table-wrap th.numeric',
  '.site-navbar,',
]) {
  if (!phase12Css.includes(marker)) fail(`Phase 12 RTL coverage missing: ${marker}`)
}
const mainSource = read('src/main.tsx')
for (const importPath of ["./styles/phase11-responsive.css", "./styles/phase12-rtl.css"]) {
  if (!mainSource.includes(importPath)) fail(`Missing canonical style import: ${importPath}`)
}

console.log('Phase 11: responsive desktop/tablet/mobile + touch + overflow protection')
console.log('Phase 12: Arabic RTL structural rules + numeric/mixed-content handling')


const phase13Files = [
  'src/app/providers/AppErrorBoundary.tsx',
  'src/shared/ui/useDialogA11y.ts',
  'src/shared/ui/ConfirmModal.tsx',
  'src/shared/ui/FormModal.tsx',
]
for (const file of phase13Files) {
  if (!exists(file)) fail(`Missing Phase 13 accessibility file: ${file}`)
}
const confirmSource = read('src/shared/ui/ConfirmModal.tsx')
const formModalSource = read('src/shared/ui/FormModal.tsx')
if (!confirmSource.includes('useDialogA11y') || !confirmSource.includes('aria-describedby="confirm-modal-description"')) fail('Confirm modal accessibility contract is incomplete')
if (!formModalSource.includes('useDialogA11y') || !formModalSource.includes('aria-describedby={subtitle ? \'form-modal-subtitle\' : undefined}')) fail('Form modal accessibility contract is incomplete')
const dataTableA11y = read('src/components/ui/DataTable.tsx')
for (const marker of ['useDeferredValue', 'aria-sort', 'aria-label="جدول البيانات"']) {
  if (!dataTableA11y.includes(marker)) fail(`Accessibility/performance marker missing from DataTable: ${marker}`)
}
const errorBoundarySource = read('src/app/providers/AppErrorBoundary.tsx')
if (!errorBoundarySource.includes('class AppErrorBoundary') || !errorBoundarySource.includes('role="alert"')) fail('Top-level UI error boundary is incomplete')
const toastSource = read('src/shared/ui/ToastProvider.tsx')
if (!toastSource.includes('role={item.tone === \'error\' ? \'alert\' : \'status\'}')) fail('Toast live-region semantics are incomplete')
console.log('Phase 13: dialog focus + keyboard focus + semantic status/table accessibility')

const routeSplittingSource = read('src/app/routing/AppRoutes.tsx')
const lazyRouteCount = (routeSplittingSource.match(/const [A-Za-z0-9_]+ = lazy\(/g) ?? []).length
if (lazyRouteCount < 8) fail(`Route-level lazy loading coverage is too low: ${lazyRouteCount}`)
console.log(`Phase 14 route splitting: ${lazyRouteCount} lazy page/workspace modules`)

const phase14Files = [
  'src/utils/performance.ts',
  'docs/PHASE-13-16-ONE-SPRINT-REPORT.md',
]
for (const file of phase14Files) if (!exists(file)) fail(`Missing Phase 14/16 performance or release artifact: ${file}`)
const mainPerfSource = read('src/main.tsx')
if (!mainPerfSource.includes("markPerformance('app-startup')") || !mainPerfSource.includes("measurePerformance('app-startup')")) fail('Startup performance instrumentation missing')
const dashboardPerf = read('src/pages/DashboardPage.tsx')
for (const marker of ['assetProjectCounts', 'assetUsageIndex']) if (!dashboardPerf.includes(marker)) fail(`Dashboard performance optimization missing: ${marker}`)
console.log('Phase 14: startup timing + deferred table search + dashboard aggregation optimization')

const workflowFile = '.github/workflows/quality-gate.yml'
if (!exists(workflowFile)) fail('Missing Phase 15-16 Node 24 CI quality gate')
if (!exists('vercel.json')) fail('Missing Vercel production configuration')
const vercelSource = read('vercel.json')
for (const header of ['X-Content-Type-Options', 'Referrer-Policy', 'X-Frame-Options', 'Permissions-Policy']) if (!vercelSource.includes(header)) fail(`Production security header missing: ${header}`)
const workflowSource = read(workflowFile)
for (const marker of ['node-version: 24', 'npm ci', 'npm run verify:source', 'npm run typecheck', 'npm run build', 'npm run test:source']) {
  if (!workflowSource.includes(marker)) fail(`Production CI gate missing: ${marker}`)
}
const pkgSource = JSON.parse(read('package.json'))
if (pkgSource.scripts?.['verify:source'] !== 'node scripts/verify-source.mjs') fail('Missing verify:source package script')
if (pkgSource.scripts?.['test:source'] !== 'node --test tests/frontend/source-integrity.test.mjs') fail('Missing test:source package script')
if (!exists('tests/frontend/source-integrity.test.mjs')) fail('Missing frontend source integrity test')
if (!exists('docs/PRODUCTION-READINESS.md')) fail('Missing production readiness checklist')
console.log('Phase 15: source regression test + CI quality gate')
console.log('Phase 16: Node 24 release gate + measurable production-readiness contract')
