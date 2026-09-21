import { useMemo, useState } from 'react'
import { Download, Fuel, Gauge, ReceiptText, Wrench, CircleDollarSign, CalendarRange } from 'lucide-react'
import type { Asset, FuelOperation, Project, WorkOrder } from '../types/tfms'
import { ReferenceValue } from '../components/ReferenceValue'
import { sameReference } from '../utils/referenceLabels'

type RecordRow = Record<string, unknown>

type Props = {
  assets: Asset[]
  projects: Project[]
  workOrders: WorkOrder[]
  fuelOps: FuelOperation[]
  moduleData: Record<string, Record<string, unknown>[]>
}

export function CostsPage({ assets, projects, workOrders, fuelOps, moduleData }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const monthStart = `${today.slice(0, 7)}-01`
  const [from, setFrom] = useState(monthStart)
  const [to, setTo] = useState(today)
  const [own, setOwn] = useState('')
  const [projectId, setProjectId] = useState('')

  const rows = useMemo(() => assets
    .filter((a) => (!own || a.own === own) && (!projectId || a.proj === projectId || projects.some(p => p.id === projectId && sameReference(a.proj, p))))
    .map((a) => ({ ...calculateAssetCost(a, from, to, workOrders, fuelOps, moduleData), asset: a })),
    [assets, from, to, own, projectId, workOrders, fuelOps, moduleData])

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

  return <div>
    <div className="page-head">
      <div><h1>التكاليف والإهلاك</h1><p>تجميع تكلفة الأصل من الوقود والصيانة والزيوت والإطارات والإيجار والإهلاك.</p></div>
      <div className="page-actions"><button className="secondary-button" onClick={exportCsv}><Download size={16}/> تصدير CSV</button></div>
    </div>
    <section className="panel">
      <div className="form-grid report-filter-grid">
        <label className="field"><span>من</span><input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label>
        <label className="field"><span>إلى</span><input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label>
        <label className="field"><span>الملكية</span><select value={own} onChange={e=>setOwn(e.target.value)}><option value="">الكل</option><option>مملوك</option><option>مستأجر</option></select></label>
        <label className="field"><span>المشروع</span><select value={projectId} onChange={e=>setProjectId(e.target.value)}><option value="">كل المشروعات</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      </div>
    </section>
    <div className="metric-grid compact">
      <Metric icon={CircleDollarSign} label="إجمالي تكاليف الفترة" value={`${fmt(total)} ج.م`}/>
      <Metric icon={Fuel} label="الوقود" value={`${fmt(fuel)} ج.م`}/>
      <Metric icon={Wrench} label="الصيانة والمواد" value={`${fmt(maintenance + oils)} ج.م`}/>
      <Metric icon={ReceiptText} label="الإيجار المستحق" value={`${fmt(rental)} ج.م`}/>
      <Metric icon={Gauge} label="الإهلاك" value={`${fmt(dep)} ج.م`}/>
    </div>
    <section className="panel">
      <div className="report-meta"><div className="section-title"><div className="section-title-icon"><CalendarRange size={16}/></div><div><strong>تكلفة الأصول خلال الفترة</strong><small>إطارات {fmt(tires)} ج.م · الفترة {from} ← {to}</small></div></div><span className="badge blue">{rows.length} أصل</span></div>
      <div className="table-wrap"><table><thead><tr><th>الأصل</th><th>الملكية</th><th>المشروع</th><th>وقود</th><th>صيانة</th><th>زيوت</th><th>إطارات</th><th>إيجار</th><th>إهلاك</th><th>الإجمالي</th><th>الاستخدام</th></tr></thead><tbody>{rows.map(r=><tr key={r.asset.id}><td><ReferenceValue field="asset" value={r.asset.id} lookups={{assets}}/></td><td>{r.asset.own}</td><td><ReferenceValue field="proj" value={r.asset.proj} lookups={{projects}}/></td><td>{fmt(r.fuel)}</td><td>{fmt(r.maint)}</td><td>{fmt(r.oils)}</td><td>{fmt(r.tires)}</td><td>{fmt(r.rental)}</td><td>{fmt(r.dep)}</td><td><strong>{fmt(r.total)}</strong></td><td>{r.asset.mt==='كم'?`${fmt(r.km)} كم`:`${fmt(r.hours)} ساعة`}</td></tr>)}</tbody></table>{!rows.length&&<div className="empty">لا توجد بيانات مطابقة.</div>}</div>
    </section>
  </div>
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
function fmt(n:number){return new Intl.NumberFormat('ar-EG',{maximumFractionDigits:1}).format(Number(n||0))}
function Metric({icon:Icon,label,value}:{icon:typeof Fuel;label:string;value:string}){return <div className="metric-card"><div className="metric-icon"><Icon size={18}/></div><div className="metric-body"><span>{label}</span><strong>{value}</strong></div></div>}
