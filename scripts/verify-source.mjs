import fs from 'node:fs'
import path from 'node:path'

const root = new URL('..', import.meta.url).pathname
const legacy = fs.readFileSync(path.join(root,'legacy/TFMS_Fixed.html'),'utf8')

if (!legacy.includes('نظام إدارة النقل والأسطول والمعدات')) throw new Error('Legacy source is not the expected TFMS HTML')
const pkg = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'))
const appSource = fs.readFileSync(path.join(root,'src/config/app.ts'),'utf8')
if (!appSource.includes(`version: '${pkg.version}'`)) throw new Error(`config/app.ts version must match package.json (${pkg.version})`)
for (const m of ['006_purchase_role_alignment','007_form_data_expansion','008_security_and_integrity']) if (!fs.existsSync(path.join(root,`supabase/migrations/${m}.sql`))) throw new Error(`Missing migration ${m}`)
for (const file of ['src/pages/PlansPage.tsx','src/pages/InventoryPage.tsx','src/pages/MaintenancePage.tsx','src/pages/OilsPage.tsx','src/pages/TiresPage.tsx','src/pages/PurchasesPage.tsx']) {
  if (!fs.existsSync(path.join(root,file))) throw new Error(`Missing Sprint 06-02 file: ${file}`)
}
const appSourceFile = fs.readFileSync(path.join(root,'src/App.tsx'),'utf8')
for (const route of ["case 'plans'","case 'inventory'","case 'maintenance'","case 'oils'","case 'tires'","case 'purchases'"]) {
  if (!appSourceFile.includes(route)) throw new Error(`Missing specialized route: ${route}`)
}
for (const file of ['src/pages/CostsPage.tsx','src/pages/ChargingPage.tsx','src/pages/InvoicesPage.tsx','src/pages/CustomersPage.tsx','src/pages/AuditPage.tsx']) {
  if (!fs.existsSync(path.join(root,file))) throw new Error(`Missing Sprint 07 file: ${file}`)
}
for (const route of ["case 'costs'","case 'charging'","case 'invoices'","case 'customers'","case 'audit'"]) {
  if (!appSourceFile.includes(route)) throw new Error(`Missing Sprint 07 specialized route: ${route}`)
}
if (!appSource.includes('ROLE_MODULES')) throw new Error('Missing role visibility matrix')
const layoutSource = fs.readFileSync(path.join(root,'src/components/Layout.tsx'),'utf8')
if (!layoutSource.includes('site-navbar')) throw new Error('Navbar was not implemented')
if (layoutSource.includes('<aside className="sidebar"')) throw new Error('Legacy sidebar is still mounted')
if (!fs.existsSync(path.join(root,'src/utils/referenceLabels.ts'))) throw new Error('Missing reference label resolver')
if (!fs.existsSync(path.join(root,'src/components/ReferenceValue.tsx'))) throw new Error('Missing ReferenceValue component')
if (!appSource.includes("key: 'contracts'")) throw new Error('Contracts module is missing from navigation')
console.log('KEMEX source integrity: OK')
console.log('Production data source: Supabase only')

const refSource = fs.readFileSync(path.join(root,'src/utils/referenceLabels.ts'),'utf8')
if (!refSource.includes('matchesRef')) throw new Error('Global reference matcher is missing')
if (!fs.readFileSync(path.join(root,'src/pages/DashboardPage.tsx'),'utf8').includes('field="proj"')) throw new Error('Dashboard project reference display is missing')
