import { useMemo, useState } from 'react'
import { Download, Fuel, Gauge, ReceiptText, Wrench, CircleDollarSign, CalendarRange } from 'lucide-react'
import type { Asset, FuelOperation, Project, WorkOrder } from '../types/tfms'
import { ReferenceValue } from '../components/ReferenceValue'
import { sameReference } from '../utils/referenceLabels'
import { useCurrency } from '../features/settings'
import { PageHeader, Card, CardGrid, StatCard, DataTable, Button } from '../components/ui'
import type { DataTableColumn } from '../components/ui/DataTable'
import { OperationalSummaryStrip } from '../shared/ui'

import { APP_LOCALE } from '../shared/formatters/locale'
type RecordRow = Record<string, unknown>

type Props = {
  assets: Asset[]
  projects: Project[]
  workOrders: WorkOrder[]
  fuelOps: FuelOperation[]
  moduleData: Record<string, Record<string, unknown>[]>
}

export function CostsPage({ assets, projects, workOrders, fuelOps, moduleData }: Props) {
  const {formatMoney} = useCurrency()
  const today = new Date().toISOString().slice(0, 10)
  const monthStart = `${today.slice(0, 7)}-01`
  const [from, setFrom] = useState(monthStart)
  const [to, setTo] = useState(today)
  const [own, setOwn] = useState('')
  const [projectId, setProjectId] = useState('')
  const rangeValid = from <= to

  const rows = useMemo(() => (rangeValid ? assets
    .filter((a) => (!own || a.own === own) && (!projectId || a.proj === projectId || projects.some(p => p.id === projectId && sameReference(a.proj, p))))
    .map((a) => ({ ...calculateAssetCost(a, from, to, workOrders, fuelOps, moduleData), asset: a })) : []),
    [assets, from, to, own, projectId, workOrders, fuelOps, moduleData, rangeValid])

  const total = rows.reduce((s, r) => s + r.total, 0)
  const fuel = rows.reduce((s, r) => s + r.fuel, 0)
  const maintenance = rows.reduce((s, r) => s + r.maint, 0)
  const oils = rows.reduce((s, r) => s + r.oils, 0)
  const tires = rows.reduce((s, r) => s + r.tires, 0)
  const rental = rows.reduce((s, r) => s + r.rental, 0)
  const dep = rows.reduce((s, r) => s + r.dep, 0)

  function exportCsv() {
    const headers = ['الكود','الأصل','الملكية','المشروع','وقود','صيانة','زيوت وفلاتر','إطارات','إيجار مستحق','إهلاك','الإجمالي','الاستخدام']
    const esc = (v: unknown) => `"${String(v ?? '—').replace(/"/g, '""')}"`
    const lines = rows.map((r) => {
      const a = r.asset
      return [a.code,a.name,a.own,projects.find(p=>p.id===a.proj)?.name??'المقر',r.fuel,r.maint,r.oils,r.tires,r.rental,r.dep,r.total,a.mt==='كم'?`${r.km} كم`:`${r.hours} ساعة`].map(esc).join(',')
    })
    const blob = new Blob([`\ufeff${[headers.map(esc).join(','), ...lines].join('\r\n')}`], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `KEMEX-costs-${today}.csv`; a.click(); URL.revokeObjectURL(a.href)
  }

  type CostRow = ReturnType<typeof calculateAssetCost> & { asset: Asset }
  const columns: DataTableColumn<CostRow>[] = [
    { key: 'asset', header: 'الأصل', accessor: (r) => r.asset.name, render: (r) => <ReferenceValue field="asset" value={r.asset.id} lookups={{ assets }} /> },
    { key: 'own', header: 'الملكية', accessor: (r) => r.asset.own ?? '', render: (r) => r.asset.own, hideOnMobile: true },
    { key: 'proj', header: 'المشروع', accessor: (r) => projects.find((p) => sameReference(r.asset.proj, p))?.name ?? '', render: (r) => <ReferenceValue field="proj" value={r.asset.proj} lookups={{ projects }} /> },
    { key: 'fuel', header: 'وقود', sortable: true, render: (r) => fmt(r.fuel) },
    { key: 'maint', header: 'صيانة', sortable: true, render: (r) => fmt(r.maint), hideOnMobile: true },
    { key: 'oils', header: 'زيوت', render: (r) => fmt(r.oils), hideOnMobile: true },
    { key: 'tires', header: 'إطارات', render: (r) => fmt(r.tires), hideOnMobile: true },
    { key: 'rental', header: 'إيجار', render: (r) => fmt(r.rental), hideOnMobile: true },
    { key: 'dep', header: 'إهلاك', render: (r) => fmt(r.dep), hideOnMobile: true },
    { key: 'total', header: 'الإجمالي', sortable: true, render: (r) => <strong className="font-semibold text-gray-900">{fmt(r.total)}</strong> },
    { key: 'usage', header: 'الاستخدام', accessor: (r) => (r.asset.mt === 'كم' ? r.km : r.hours), render: (r) => (r.asset.mt === 'كم' ? `${fmt(r.km)} كم` : `${fmt(r.hours)} ساعة`) },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="التكاليف والإهلاك"
        description="تجميع تكلفة الأصل من الوقود والصيانة والزيوت والإطارات والإيجار والإهلاك."
        action={
          <Button variant="secondary" icon={<Download size={16} />} onClick={exportCsv}>
            تصدير CSV
          </Button>
        }
      />

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <label className="block">
            <span className="text-xs font-medium text-gray-500 mb-1.5 block">من</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition" />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500 mb-1.5 block">إلى</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition" />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500 mb-1.5 block">الملكية</span>
            <select value={own} onChange={(e) => setOwn(e.target.value)} className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition">
              <option value="">الكل</option>
              <option>مملوك</option>
              <option>مستأجر</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500 mb-1.5 block">المشروع</span>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition">
              <option value="">كل المشروعات</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      {!rangeValid && <div className="global-error" role="alert">تاريخ البداية لا يمكن أن يكون بعد تاريخ النهاية.</div>}

      <CardGrid cols={4}>
        <StatCard icon={<CircleDollarSign size={18} />} label="إجمالي تكاليف الفترة" value={formatMoney(total)} />
        <StatCard icon={<Fuel size={18} />} label="الوقود" value={formatMoney(fuel)} />
        <StatCard icon={<Wrench size={18} />} label="الصيانة والمواد" value={formatMoney(maintenance + oils)} />
        <StatCard icon={<ReceiptText size={18} />} label="الإيجار المستحق" value={formatMoney(rental)} />
        <StatCard icon={<Gauge size={18} />} label="الإهلاك" value={formatMoney(dep)} />
      </CardGrid>

      <OperationalSummaryStrip items={[
        { id: 'total', label: 'إجمالي التكلفة', value: formatMoney(total), tone: 'default' },
        { id: 'fuel', label: 'الوقود', value: formatMoney(fuel) },
        { id: 'maintenance', label: 'الصيانة والمواد', value: formatMoney(maintenance + oils) },
        { id: 'fixed', label: 'الإيجار والإهلاك', value: formatMoney(rental + dep) },
      ]} />

      <Card
        title="تكلفة الأصول خلال الفترة"
        description={`إطارات ${formatMoney(tires)} · الفترة ${from} ← ${to}`}
        action={<span className="inline-flex items-center rounded-full bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20 px-2.5 py-1 text-xs font-semibold"><CalendarRange size={13} className="me-1" />{rows.length} أصل</span>}
      >
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.asset.id} emptyState="لا توجد بيانات مطابقة." mobilePresentation="cards" enableColumnVisibility columnVisibilityStorageKey="kemex.costs.columns.v1" exportable exportFileName="KEMEX-costs" printTitle="سجل التكاليف والإهلاك" />
      </Card>
    </div>
  )
}

export function calculateAssetCost(asset: Asset, from:string, to:string, workOrders:WorkOrder[], fuelOps:FuelOperation[], moduleData:Record<string,Record<string,unknown>[]>) {
  const inRange=(v:unknown)=>{const d=String(v??'');return !!d && (!from||d>=from) && (!to||d<=to)}
  const fuel=fuelOps.filter(x=>(x.assetId===asset.id||x.assetId===asset.code)&&x.type!=='استلام'&&x.status==='معتمد'&&inRange(x.date)).reduce((s,x)=>s+Number(x.total||0),0)
  const maint=workOrders.filter(x=>(x.asset===asset.id||x.asset===asset.code)&&x.status==='مكتمل'&&inRange(x.completed)).reduce((s,x)=>s+Number(x.laborCost||0)+Number(x.partsCost||0)+Number(x.vendorCost||0),0)
  const oils=(moduleData.oilChanges??[]).filter(x=>(String(x.asset??'')===asset.id||String(x.asset??'')===asset.code)&&inRange(x.date)).reduce((s,x)=>s+Number(x.matCost||0)+Number(x.labCost||0),0)
  const tires=(moduleData.tireOps??[]).filter(x=>(String(x.asset??'')===asset.id||String(x.asset??'')===asset.code)&&inRange(x.date)).reduce((s,x)=>s+Number(x.cost||0),0)
  const operations=(moduleData.operations??[]).filter(x=>(String(x.assetId??'')===asset.id||String(x.assetId??'')===asset.code)&&String(x.status??'')==='معتمد'&&inRange(x.date))
  const hours=operations.reduce((s,x)=>s+Number(x.hours||0),0)
  const contracts=(moduleData.contracts??[])
  const contract=contracts.find(x=>includesAsset(x.assets,asset.id))
  const rental=asset.own==='مستأجر' && contract ? rentalFor(contract,from,to,hours): 0
  const dep=depreciationFor(asset,from,to)
  const ordered=operations.slice().sort((a,b)=>String(a.date??'').localeCompare(String(b.date??''))); const previousOps= (moduleData.operations??[]).filter(x=>(String(x.assetId??'')===asset.id||String(x.assetId??'')===asset.code)&&String(x.status??'')==='معتمد'&&String(x.date??'')<from).sort((a,b)=>String(a.date??'').localeCompare(String(b.date??''))); const baseline=previousOps.length?Number(previousOps.at(-1)?.meter??0):(ordered[0]?Number(ordered[0].meter??0):0); const km=asset.mt==='كم'&&ordered.length?Math.max(0,Number(ordered.at(-1)?.meter??0)-baseline):0
  return {fuel,maint,oils,tires,rental,dep,hours,km,total:fuel+maint+oils+tires+rental+dep}
}
function includesAsset(raw:unknown,id:string){return Array.isArray(raw)?raw.map(String).includes(id):String(raw??'').split(',').map(x=>x.trim()).includes(id)}
function rentalFor(c:RecordRow,from:string,to:string,hours:number){const rate=Number(c.rate||0);const unit=String(c.unit||'');if(!rate)return 0;const days=Math.max(0,Math.floor((new Date(to).getTime()-new Date(from).getTime())/864e5)+1);const months=days/30.4;const min=Number(c.minimum||0);if(unit==='شهر')return rate*months;if(unit==='يوم')return rate*days;if(unit==='ساعة')return rate*Math.max(hours,min*months);return 0}
function depreciationFor(a:Asset,from:string,to:string){if(a.own!=='مملوك'||!a.capex||!a.life||!a.buy)return 0;const monthly=(Number(a.capex)-Number(a.resid||0))/(Number(a.life)*12);const st=new Date(a.buy),fr=new Date(from),end=new Date(to),now=new Date();const mStart=new Date(Math.max(fr.getTime(),st.getTime()));let months=(end.getFullYear()*12+end.getMonth())-(mStart.getFullYear()*12+mStart.getMonth())+1;const elapsed=(now.getFullYear()*12+now.getMonth())-(st.getFullYear()*12+st.getMonth())+1;months=Math.min(months,Math.max(0,elapsed),Number(a.life)*12);return monthly*Math.max(0,months)}
function fmt(n:number){return new Intl.NumberFormat(APP_LOCALE,{maximumFractionDigits:1}).format(Number(n||0))}
