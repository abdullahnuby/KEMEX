import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(process.cwd(), 'src')
const read = file => readFileSync(join(root, file), 'utf8')
const users = read('pages/UsersPage.tsx')
const audit = read('pages/AuditPage.tsx')
const settings = read('pages/SettingsPage.tsx')
const data = read('pages/DataManagementPage.tsx')

if (!users.includes('filters={[{id:\'role\'')) throw new Error('UsersPage role filter missing')
if (!users.includes('mobilePresentation="cards"')) throw new Error('UsersPage mobile cards missing')
if (!audit.includes('OperationalSummaryStrip')) throw new Error('Audit summary strip missing')
if (!audit.includes('printTitle="سجل التدقيق"')) throw new Error('Audit print contract missing')
if (settings.includes('window.alert(')) throw new Error('SettingsPage still uses blocking window.alert')
if (!settings.includes('ConfirmModal')) throw new Error('Settings restore confirmation missing')
if (data.includes('window.confirm(')) throw new Error('DataManagementPage still uses blocking window.confirm')
if (!data.includes('ConfirmModal')) throw new Error('Data restore confirmation missing')
console.log('KEMEX admin/settings/data contract: PASS')
