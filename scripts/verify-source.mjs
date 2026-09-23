import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const required = [
  'src',
  'src/main.tsx',
  'src/App.tsx',
  'supabase/migrations',
  'package.json',
  'package-lock.json',
]
const missing = required.filter(item => !fs.existsSync(path.join(root, item)))
if (missing.length) {
  console.error(`KEMEX source integrity failed. Missing: ${missing.join(', ')}`)
  process.exit(1)
}

function walk(dir) {
  const out=[]
  for (const entry of fs.readdirSync(dir,{withFileTypes:true})) {
    if (['node_modules','dist','.git'].includes(entry.name)) continue
    const full=path.join(dir,entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

const files=walk(path.join(root,'src'))
const duplicateBasenames=new Map()
for (const file of files) {
  const base=path.basename(file)
  const list=duplicateBasenames.get(base)??[]
  list.push(path.relative(root,file))
  duplicateBasenames.set(base,list)
}
// Duplicate names are allowed inside feature boundaries; this gate only checks
// for the retired parallel UI tree that caused the historical P0 issue.
const retiredUiFiles=files.filter(file => file.includes(`${path.sep}src${path.sep}shared${path.sep}ui${path.sep}`) && /^(Button|Card|DataTable|StatusBadge|MetricCard|PageHeader|FilterBar|ModalPortal|CardGrid|EmptyState|AnalyticsCharts)\.tsx$/.test(path.basename(file)))
if (retiredUiFiles.length) {
  console.error('Retired duplicate UI primitives detected:', retiredUiFiles.map(x=>path.relative(root,x)).join(', '))
  process.exit(1)
}
console.log(`KEMEX source integrity OK (${files.length} source files).`)
