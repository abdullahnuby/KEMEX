import { useEffect, useMemo, useState } from 'react'
import { BarChart3, CalendarClock, ChartNoAxesCombined, CheckCircle2, ClipboardCheck, Download, FileBarChart, Fuel, Gauge, PackageCheck, Printer, ReceiptText, RotateCcw, Search, Truck, Users, Wrench, type LucideIcon } from 'lucide-react'
import type { Asset, FuelOperation, Operation, Project, WorkOrder } from '../types/tfms'
import type { Trip, TripCost } from '../features/trips/types'
import { sameReference } from '../utils/referenceLabels'
import { Button, DataTable, PageHeader, StatusBadge, AnalyticsBarChart, AnalyticsDonut, AnalyticsDualBars, ChartShell } from '../components/ui'
import { useCurrency } from '../features/settings'

export type ReportKey = 'all'|'owned'|'rented'|'veh'|'eq'|'contracts'|'due'|'fuel'|'invn'|'drivers'|'appr'|'unbilled'|'trip-profitability'
type RefCell = { kind:'ref'; field:'asset'|'proj'|'item'; label:string; code?:string }
type ReportCell = string | number | RefCell
type ReportDef = { title:string; subtitle:string; columns:string[]; rows:ReportCell[][] }
type Filters = { from:string; to:string; cat:string; own:string; status:string; proj:string }

const emptyFilters:Filters={from:'',to:'',cat:'',own:'',status:'',proj:''}

export function ReportsPage({assets,projects,workOrders,fuelOps,operations,moduleData,trips,tripCosts,onRoute,initialKind}:{assets:Asset[];projects:Project[];workOrders:WorkOrder[];fuelOps:FuelOperation[];operations:Operation[];moduleData:Record<string,Record<string,unknown>[]>;trips:Trip[];tripCosts:TripCost[];onRoute?:(route:string)=>void;initialKind?:ReportKey}) {
  const {formatMoney}=useCurrency()
  const [kind,setKind]=useState<ReportKey>(initialKind ?? 'all')
  useEffect(()=>{if(initialKind && REPORTS.some(r=>r.key===initialKind)) setKind(initialKind)},[initialKind])
  const [filters,setFilters]=useState<Filters>(emptyFilters)
  const data=useMemo(()=>build(kind,assets,projects,workOrders,fuelOps,operations,moduleData,filters,trips,tripCosts),[kind,assets,projects,workOrders,fuelOps,operations,moduleData,filters,trips,tripCosts])
  const categories=useMemo(()=>Array.from(new Set(assets.map(a=>a.cat).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'ar')),[assets])
  const statuses=useMemo(()=>Array.from(new Set(assets.map(a=>a.status).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'ar')),[assets])
  const selectedReport=REPORTS.find(x=>x.key===kind)??REPORTS[0]
  const totalCost=useMemo(()=>sumNumericColumn(data,'إجمالي التكلفة'),[data])
  const totalFuel=useMemo(()=>sumNumericColumn(data,'تكلفة الوقود')||sumNumericColumn(data,'وقود'),[data])
  const insights=useMemo(()=>buildReportInsights(kind,data,assets,projects,fuelOps,workOrders,operations),[kind,data,assets,projects,fuelOps,workOrders,operations])
  function download(){
    const csv=toCsv(data.columns,data.rows)
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([`\ufeff${csv}`],{type:'text/csv;charset=utf-8'}));a.download=`KEMEX-${kind}-${new Date().toISOString().slice(0,10)}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),700)
  }
  return <div className="report-page space-y-5">
    <PageHeader
      title="مركز التقارير والتحليلات"
      description="اختر التقرير، عدّل المرشحات، وشاهد المؤشرات والرسوم والنتيجة مباشرة في نفس الشاشة — بدون زر تشغيل أو نزول متكرر."
      meta={<div className="eyebrow"><BarChart3 size={14}/> مركز التحليلات والتقارير</div>}
      action={<div className="reference-header-actions"><Button variant="secondary" icon={<Printer size={16} />} onClick={()=>window.print()}>طباعة</Button><Button icon={<Download size={16} />} onClick={download} disabled={!data.rows.length}>تصدير CSV</Button></div>}
    />

    <section className="report-workbench">
      <div className="report-selection-strip">
        <div className="report-selection-main">
          <span className="report-selection-icon"><BarChart3 size={16}/></span>
          <div><span>التقرير المحدد</span><strong>{selectedReport.title}</strong><small>{selectedReport.subtitle}</small></div>
        </div>
        <div className="report-selection-meta"><StatusBadge tone="blue">RPT-{String(REPORTS.findIndex(x=>x.key===kind)+1).padStart(2,'0')}</StatusBadge><strong>{new Intl.NumberFormat('ar-EG').format(data.rows.length)}</strong><span>سجل</span></div>
      </div>

      <div className="report-filter-inline">
        <label className="field"><span>من تاريخ</span><input type="date" value={filters.from} onChange={e=>setFilters(f=>({...f,from:e.target.value}))}/></label>
        <label className="field"><span>إلى تاريخ</span><input type="date" value={filters.to} onChange={e=>setFilters(f=>({...f,to:e.target.value}))}/></label>
        <label className="field"><span>الفئة</span><select value={filters.cat} onChange={e=>setFilters(f=>({...f,cat:e.target.value}))}><option value="">كل الفئات</option>{categories.map(x=><option key={x}>{x}</option>)}</select></label>
        <label className="field"><span>الملكية</span><select value={filters.own} onChange={e=>setFilters(f=>({...f,own:e.target.value}))}><option value="">الكل</option><option value="مملوك">مملوك</option><option value="مستأجر">مستأجر</option></select></label>
        <label className="field"><span>الحالة</span><select value={filters.status} onChange={e=>setFilters(f=>({...f,status:e.target.value}))}><option value="">كل الحالات</option>{statuses.map(x=><option key={x}>{x}</option>)}</select></label>
        <label className="field"><span>المشروع</span><select value={filters.proj} onChange={e=>setFilters(f=>({...f,proj:e.target.value}))}><option value="">كل المشروعات</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name} — {p.code}</option>)}</select></label>
        <div className="report-filter-actions"><Button variant="secondary" icon={<RotateCcw size={14}/>} onClick={()=>setFilters(emptyFilters)}>إعادة ضبط</Button><span className="report-filter-status"><CheckCircle2 size={13}/> تحديث مباشر</span></div>
      </div>

      <section className="report-live-grid">
        <ChartShell title="التحليل الرئيسي" description={insights.description}>
          {insights.kind==='dual' ? <AnalyticsDualBars points={insights.points} firstLabel={insights.firstLabel} secondLabel={insights.secondLabel}/> : <AnalyticsBarChart points={insights.points} valueSuffix={insights.valueSuffix} limit={8}/>} 
        </ChartShell>
        <div className="report-live-kpis">
          <div className="report-live-kpi"><span><Search size={16}/></span><div><small>السجلات الناتجة</small><strong>{new Intl.NumberFormat('ar-EG').format(data.rows.length)}</strong></div></div>
          <div className="report-live-kpi"><span><Truck size={16}/></span><div><small>الأصول المعنية</small><strong>{new Intl.NumberFormat('ar-EG').format(insights.assetCount)}</strong></div></div>
          <div className="report-live-kpi"><span><Fuel size={16}/></span><div><small>تكلفة الوقود</small><strong>{formatMoney(totalFuel)}</strong></div></div>
          <div className="report-live-kpi"><span><Gauge size={16}/></span><div><small>المؤشر المالي</small><strong>{formatMoney(totalCost || insights.primaryTotal)}</strong></div></div>
          {insights.donut.length>0 && <div className="report-donut-mini"><AnalyticsDonut segments={insights.donut} centerValue={new Intl.NumberFormat('ar-EG').format(data.rows.length)} centerLabel="سجل"/></div>}
        </div>
      </section>
    </section>

    <section className="report-results">
      <div className="report-results-head"><div><h2>النتيجة التفصيلية</h2><p>البيانات المطابقة للمرشحات الحالية · يتم تحديثها مباشرة</p></div><StatusBadge tone="emerald">بيانات محدثة</StatusBadge></div>
      <div className="report-result-meta"><span>{data.columns.length} أعمدة</span><span>{new Intl.NumberFormat('ar-EG').format(data.rows.length)} سجل</span><span>{filters.cat||'كل الفئات'}</span><span>{filters.own||'كل الملكيات'}</span><span>{filters.status||'كل الحالات'}</span><span>{filters.proj?projects.find(p=>p.id===filters.proj)?.name??'مشروع محدد':'كل المشروعات'}</span></div>
      <DataTable<ReportCell[]>
        rows={data.rows}
        rowKey={(row) => `${kind}-${JSON.stringify(row)}`}
        pageSize={15}
        searchPlaceholder="بحث داخل النتيجة..."
        searchableText={(row: ReportCell[]) => row.map(value => typeof value === 'object' ? `${value.label} ${value.code ?? ''}` : String(value ?? '')).join(' ')}
        emptyState={<div className="analytics-empty"><FileBarChart size={22}/> لا توجد بيانات مطابقة للمرشحات الحالية.</div>}
        columns={data.columns.map((column, index) => ({
          id: `report-${index}`,
          header: column,
          sortValue: (row: ReportCell[]) => typeof row[index] === 'object' ? String((row[index] as RefCell).label) : String(row[index] ?? ''),
          render: (row: ReportCell[]) => renderReportCell(row[index]),
          mobileVisible: index < 6,
        }))}
      />
    </section>
  </div>
}

type ReportInsights = {
  description:string
  kind:'single'|'dual'
  points:{label:string;value:number;secondary?:number}[]
  firstLabel?:string
  secondLabel?:string
  valueSuffix?:string
  donut:{label:string;value:number}[]
  assetCount:number
  primaryTotal:number
}

function buildReportInsights(kind:ReportKey, data:ReportDef, assets:Asset[], projects:Project[], fuelOps:FuelOperation[], workOrders:WorkOrder[], operations:Operation[]): ReportInsights {
  const assetCount = new Set(assets.map(a=>a.id)).size
  const numeric = data.columns.map((header,index)=>({header,index,values:data.rows.map(r=>metricValue(r[index]))})).map(x=>({...x,score:x.values.filter(v=>v!==null).length,prefer:/إجمالي التكلفة|قيمة النقل|تكلفة الوقود|إجمالي|تكلفة|وقود|قيمة|إهلاك|رصيد|ساعات|كم|الهامش|استخدام|توقف/.test(x.header)?10:0})).sort((a,b)=>(b.prefer-b.prefer)||(b.score-a.score))
  const primary=numeric.find(x=>x.score>0)
  const secondary=numeric.find(x=>x.score>0 && x.index!==primary?.index)
  const primaryTotal=primary?primary.values.reduce((s,v)=>s+(v??0),0):0
  const labels = data.rows.map(r=>labelOf(r[0]))
  const points = primary ? data.rows.map((row,i)=>({label:labels[i],value:primary.values[i]??0,secondary:secondary?secondary.values[i]??0:undefined})).filter(x=>x.value>0 || (x.secondary??0)>0).sort((a,b)=>b.value-a.value).slice(0,8) : []
  const statusIndex=data.columns.findIndex(x=>/الحالة/.test(x))
  const statusCount = statusIndex>=0 ? countBy(data.rows.map(r=>labelOf(r[statusIndex]))) : []
  const donut=statusCount.slice(0,6)
  let description=`توزيع ${primary?.header??'المؤشر الرئيسي'} عبر السجلات الناتجة.`
  if(kind==='fuel') description='أعلى الأصول حسب قيمة الوقود المسجلة؛ استخدمها لملاحظة التركّز والمصروفات غير المعتادة.'
  if(kind==='trip-profitability') description='مقارنة قيمة النقل بالتكلفة المباشرة والوقود لإظهار العمليات الأعلى أثرًا ماليًا.'
  if(kind==='drivers') description='أداء السائقين والمشغلين بحسب حجم الاستخدام وعدد العمليات المسجلة.'
  if(kind==='invn') description='الأصناف الأعلى من حيث الرصيد؛ راقب أيضًا أصناف إعادة الطلب من نتيجة التقرير.'
  return {
    description,
    kind:kind==='trip-profitability'||kind==='drivers'?'dual':'single',
    points,
    firstLabel:primary?.header,
    secondLabel:secondary?.header,
    valueSuffix:primary?.header.includes('%')?'%':'',
    donut,
    assetCount: kind==='drivers' ? points.length : assetCount,
    primaryTotal,
  }
}

function metricValue(value:ReportCell|undefined):number|null{
  if(typeof value==='number') return Number.isFinite(value)?value:null
  if(typeof value!=='string') return null
  const s=value.replaceAll('٬','').replaceAll(',','').replaceAll('،','').replaceAll('٪','%').trim()
  if(!s || /\d{4}-\d{2}-\d{2}/.test(s) || /\/|:/.test(s)) return null
  const m=s.replace(/[^0-9.\-]/g,'')
  if(!m) return null
  const n=Number(m)
  return Number.isFinite(n)?n:null
}
function labelOf(value:ReportCell|undefined){return typeof value==='object'&&'kind' in value ? value.label : String(value??'—')}
function countBy(values:string[]){const m=new Map<string,number>();for(const v of values){if(!v||v==='—')continue;m.set(v,(m.get(v)??0)+1)}return Array.from(m.entries()).map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value)}

function renderReportCell(v:ReportCell){
  if(typeof v==='object'&&'kind' in v&&v.kind==='ref')return <span className="report-reference-cell"><strong>{v.label}</strong>{v.code&&<small>{v.code}</small>}</span>
  return v as string|number
}
function sumNumericColumn(data:ReportDef,column:string){const i=data.columns.indexOf(column);if(i<0)return 0;return data.rows.reduce((s,r)=>s+(typeof r[i]==='object'?0:normalizeNumberText(String(r[i]??''))),0)}
function fmt(n:number){return new Intl.NumberFormat('ar-EG',{maximumFractionDigits:0}).format(Number(n||0))}

function ReportIcon({kind}:{kind:ReportKey}){
  if(kind==='fuel')return <Fuel size={18}/>; if(kind==='eq'||kind==='veh')return <Truck size={18}/>; if(kind==='due')return <CalendarClock size={18}/>; if(kind==='invn')return <PackageCheck size={18}/>; if(kind==='appr')return <ClipboardCheck size={18}/>; if(kind==='contracts'||kind==='rented')return <ReceiptText size={18}/>; if(kind==='owned')return <FileBarChart size={18}/>; return <Gauge size={18}/>
}

const REPORTS:Array<{key:ReportKey;title:string;subtitle:string;icon:LucideIcon}> = [
  {key:'all',title:'التقرير الشامل لجميع الأصول',subtitle:'التشغيل والتكلفة والاستخدام',icon:Gauge},
  {key:'owned',title:'الأصول المملوكة والإهلاك',subtitle:'القيمة الرأسمالية والقيمة الدفترية',icon:FileBarChart},
  {key:'rented',title:'الأصول المستأجرة والعقود',subtitle:'المدد والتكلفة والاستخدام',icon:ReceiptText},
  {key:'veh',title:'السيارات والمركبات',subtitle:'الاستهلاك والمسافة والتكلفة',icon:Truck},
  {key:'eq',title:'المعدات والمولدات',subtitle:'ساعات التشغيل وتكلفة الساعة',icon:Wrench},
  {key:'contracts',title:'عقود الإيجار',subtitle:'الالتزامات والمدد والموردون',icon:ReceiptText},
  {key:'due',title:'الاستحقاقات',subtitle:'الصيانة والزيوت والفلاتر',icon:CalendarClock},
  {key:'fuel',title:'الوقود والاستهلاك',subtitle:'الكميات والتكلفة الفعلية',icon:Fuel},
  {key:'invn',title:'المخزون وقطع الغيار',subtitle:'الرصيد والحد الأدنى والقيمة',icon:PackageCheck},
  {key:'drivers',title:'أداء السائقين والمشغلين',subtitle:'الرحلات والتشغيل والاستخدام',icon:Users},
  {key:'appr',title:'الموافقات المعلقة',subtitle:'السجلات التي تحتاج إجراء',icon:ClipboardCheck},
  {key:'unbilled',title:'النقل غير المفوتر',subtitle:'عمليات الاستلام القابلة للفوترة',icon:ReceiptText},
  {key:'trip-profitability',title:'ربحية عمليات النقل',subtitle:'قيمة النقل والتكلفة والهامش',icon:ChartNoAxesCombined},
]

function build(kind:ReportKey,assets:Asset[],projects:Project[],workOrders:WorkOrder[],fuelOps:FuelOperation[],operations:Operation[],moduleData:Record<string,Record<string,unknown>[]>,filters:Filters,trips:Trip[],tripCosts:TripCost[]):ReportDef {
  const assetOk=(a:Asset)=>!filters.cat||a.cat===filters.cat
    ? (!filters.own||a.own===filters.own) && (!filters.status||a.status===filters.status) && (!filters.proj||sameReference(a.proj, projects.find(p=>sameReference(filters.proj,p))??{}))
    : false
  const inRange=(d:unknown)=>{const s=String(d??'');return !!s&&(!filters.from||s>=filters.from)&&(!filters.to||s<=filters.to)}
  const projectName=(id:string)=>id?projects.find(p=>sameReference(id,p))?.name??id:'المقر'
  const refAsset=(id:string):RefCell=>{const a=assets.find(x=>sameReference(id,x));return {kind:'ref',field:'asset',label:(a?.name ?? id) || '—',code:a?.code}}
  const refProject=(id:string):RefCell=>{const p=projects.find(x=>sameReference(id,x));return {kind:'ref',field:'proj',label:(p?.name ?? id) || 'المقر',code:p?.code}}
  const assetRef=(id:string)=>{const a=assets.find(x=>sameReference(id,x));return a?`${a.name} (${a.code})`:id||'—'}
  const driverRef=(id:string)=>{const d=drivers.find(x=>String(x.id??'')===id||String(x.code??'')===id);return d?`${String(d.name??'')} (${String(d.code??'')})`:id||'—'}
  const assetName=(id:string)=>id?assets.find(a=>sameReference(id,a))?.name??id:'—'
  const fmt=(n:unknown)=>new Intl.NumberFormat('ar-EG',{maximumFractionDigits:1}).format(Number(n||0))
  const plans=moduleData.plans??[]
  const oils=moduleData.oils??[]
  const tires=moduleData.tireOps??[]
  const inventory=moduleData.inventory??[]
  const invoices=moduleData.invoices??[]
  const purchases=moduleData.purchases??[]
  const charging=moduleData.charging??[]
  const drivers=moduleData.drivers??[]

  if(kind==='all'){
    const rows=assets.filter(assetOk).map(a=>{const cost=costForAsset(a,workOrders,fuelOps,operations,moduleData,filters);return [refAsset(a.id),a.cat,a.type,a.own,refProject(a.proj??''),a.status,fmt(cost.hours),fmt(cost.km),fmt(cost.fuel),fmt(cost.maint),fmt(cost.rental),fmt(cost.dep),fmt(cost.total),fmt(cost.charging),fmt(cost.charging-cost.total)]})
    return {title:'التقرير الشامل لجميع الأصول',subtitle:'تشغيل وتكلفة واستخدام الأصول خلال الفترة المحددة',columns:['الأصل','الفئة','النوع','الملكية','المشروع','الحالة','ساعات الفترة','مسافة الفترة','وقود','صيانة','إيجار مستحق','إهلاك','إجمالي التكلفة','التحميل الداخلي','الفارق'],rows}
  }
  if(kind==='owned'){
    const rows=assets.filter(a=>assetOk(a)&&a.own==='مملوك').map(a=>{const cost=costForAsset(a,workOrders,fuelOps,operations,moduleData,filters);const acc=accDep(a);const nbv=Math.max(0,Number(a.capex||0)-acc);return [refAsset(a.id),a.cat,a.status,fmt(a.capex),fmt(acc),fmt(nbv),fmt(cost.total),refProject(a.proj??'')]})
    return {title:'الأصول المملوكة والإهلاك والقيمة الدفترية',subtitle:'القيمة الرأسمالية ومجمع الإهلاك وصافي القيمة الدفترية',columns:['الأصل','الفئة','الحالة','القيمة الرأسمالية','مجمع الإهلاك','صافي القيمة الدفترية','تكلفة الفترة','المشروع'],rows}
  }
  if(kind==='rented'){
    const contracts=moduleData.contracts??[]
    const rows=assets.filter(a=>assetOk(a)&&a.own==='مستأجر').map(a=>{const c=contracts.find(x=>includesAsset(x.assets,a.id));const usage=costForAsset(a,workOrders,fuelOps,operations,moduleData,filters);return [refAsset(a.id),String(c?.lessor??'—'),String(c?.number??'—'),String(c?.end??'—'),daysLeft(String(c?.end??'')),`${fmt(c?.rate)} / ${String(c?.unit??'—')}`,String(c?.fuelT??'—'),String(c?.operT??'—'),fmt(usage.hours||usage.km),fmt(usage.rental),fmt(usage.fuel)]})
    return {title:'الأصول المستأجرة والعقود',subtitle:'العقد والاستخدام والإيجار والوقود المحمل على الشركة',columns:['الأصل','المؤجر','العقد','نهاية العقد','المتبقي يوم','القيمة/الوحدة','شروط الوقود','المشغل','الاستخدام','إيجار مستحق','وقود'],rows}
  }
  if(kind==='veh'){
    const rows=assets.filter(a=>assetOk(a)&&(a.cat==='سيارات خفيفة'||a.cat==='مركبات نقل')).map(a=>{const c=costForAsset(a,workOrders,fuelOps,operations,moduleData,filters);const actual=c.km?c.qty/c.km*100:null;const dev=actual!==null&&a.std?((actual-a.std)/a.std*100):null;return [refAsset(a.id),a.plate??'—',refProject(a.proj??''),fmt(a.meter),fmt(c.km),fmt(c.qty),actual===null?'—':`${fmt(actual)} ل/100كم`,fmt(a.std),dev===null?'—':`${fmt(dev)}%`,fmt(c.total)]})
    return {title:'السيارات والمركبات مع الاستهلاك',subtitle:'الاستخدام واستهلاك الوقود والانحراف عن المعياري والتكلفة',columns:['الأصل','اللوحة','المشروع','العداد','مسافة الفترة','وقود لتر','استهلاك فعلي','المعياري','الانحراف','إجمالي التكلفة'],rows}
  }
  if(kind==='eq'){
    const rows=assets.filter(a=>assetOk(a)&&['معدات ثقيلة','مولدات','معدات خفيفة'].includes(a.cat)).map(a=>{const c=costForAsset(a,workOrders,fuelOps,operations,moduleData,filters);const ch=charging.filter(r=>String(r.asset??'')===a.id&&inRange(r.date)).reduce((s,r)=>s+Number(r.amount??0),0);return [refAsset(a.id),a.type,refProject(a.proj??''),fmt(a.meter),fmt(c.hours),fmt(c.down),fmt(c.qty),fmt(c.total),c.hours?fmt(c.total/c.hours):'—',fmt(ch)]})
    return {title:'المعدات والمولدات مع تكلفة الساعة',subtitle:'ساعات التشغيل والتوقف والوقود والتكلفة والتحميل الداخلي',columns:['الأصل','النوع','المشروع','العداد التراكمي','ساعات الفترة','التوقف','وقود لتر','إجمالي التكلفة','تكلفة الساعة','التحميل'],rows}
  }
  if(kind==='contracts'){
    const contracts=moduleData.contracts??[]
    const rows=contracts.map(c=>{const end=String(c.end??'');const invCount=invoices.filter(i=>String(i.link??'').includes(String(c.number??''))).length;const assetIds=String(c.assets??'').split(',').map(x=>x.trim()).filter(Boolean);const assetLabels=assetIds.map(assetRef).join('، ');return [String(c.number??''),String(c.lessor??''),assetLabels,String(c.start??''),end,daysLeft(end),`${fmt(c.rate)} / ${String(c.unit??'')}`,String(c.minimum??'—'),String(c.fuelT??'—'),String(c.operT??'—'),String(c.status??''),invCount]})
    return {title:'عقود الإيجار',subtitle:'العقود والأصول المرتبطة وشروط التشغيل والفواتير',columns:['العقد','المؤجر','الأصول','البداية','النهاية','المتبقي','القيمة/الوحدة','الحد الأدنى','الوقود','المشغل','الحالة','فواتير العقد'],rows}
  }
  if(kind==='due'){
    const rows:ReportCell[][]=[]
    for(const p of plans){const a=assets.find(x=>x.id===String(p.asset??'')||x.code===String(p.asset??''));if(!a||!assetOk(a))continue;rows.push(['صيانة',refAsset(a.id),String(p.name??'—'),ruleText(p),String(p.lastDate??'—'),dueText(p,a)])}
    for(const p of oils){const a=assets.find(x=>x.id===String(p.asset??'')||x.code===String(p.asset??''));if(!a||!assetOk(a))continue;rows.push(['زيوت وفلاتر',refAsset(a.id),String(p.item??'—'),ruleText(p),String(p.lastDate??'—'),dueText(p,a)])}
    return {title:'الاستحقاقات: الصيانة والزيوت',subtitle:'قواعد الاستحقاق وآخر تنفيذ والاستحقاق القادم',columns:['النوع','الأصل','الخطة/المادة','قاعدة الاستحقاق','آخر تنفيذ','الاستحقاق القادم'],rows}
  }
  if(kind==='unbilled'){
    const rows=trips.filter(t=>t.status==='received'&&t.is_billable&&!t.invoice_id&&(!filters.proj||t.to_project_id===filters.proj)&&inRange(t.scheduled_start)).map(t=>[String(t.trip_number),String(t.scheduled_start??'').slice(0,10)||'—',refProject(t.to_project_id??''),refAsset(t.truck_asset_id),driverRef(t.driver_id),String(t.cargo_description||'—'),fmt(t.total_charge)])
    return {title:'النقل غير المفوتر',subtitle:'عمليات نقل مكتملة الاستلام وقابلة للفوترة ولم تُربط بفاتورة بعد',columns:['رقم النقل','التاريخ','المشروع','الشاحنة','السائق','الحمولة','قيمة النقل'],rows}
  }
  if(kind==='trip-profitability'){
    const rows=trips.filter(t=>(!filters.proj||t.to_project_id===filters.proj)&&inRange(t.scheduled_start)).map(t=>{const direct=tripCosts.filter(c=>c.trip_id===t.id).reduce((s,c)=>s+Number(c.amount||0),0); const fuel=fuelOps.filter(f=>String((f as unknown as {trip_id?:string}).trip_id??'')===t.id).reduce((s,f)=>s+Number(f.total||0),0); const total=direct+fuel; const charge=Number(t.total_charge||0); return [String(t.trip_number),TRIP_STATUS_LABELS_SAFE(t.status),refAsset(t.truck_asset_id),String(t.cargo_description||'—'),fmt(charge),fmt(total),fmt(charge-total),charge?`${fmt((charge-total)/charge*100)}%`:'—']})
    return {title:'ربحية عمليات النقل',subtitle:'المبلغ المحمل مقابل الوقود وتكاليف النقل المسجلة والهامش',columns:['رقم النقل','الحالة','الشاحنة','الحمولة','قيمة النقل','التكلفة','الهامش','الهامش %'],rows}
  }
  if(kind==='fuel'){
    const rows=assets.filter(assetOk).map(a=>{const c=costForAsset(a,workOrders,fuelOps,operations,moduleData,filters);const actual=a.mt==='كم'?(c.km?fmt(c.qty/c.km*100)+' ل/100كم':'—'):(c.hours?fmt(c.qty/c.hours)+' ل/س':'—');return [refAsset(a.id),fmt(c.qty),fmt(c.fuel),a.mt==='كم'?`${fmt(c.km)} كم`:`${fmt(c.hours)} ساعة`,actual,a.std?fmt(a.std):'—']})
    return {title:'الوقود: الاستهلاك والتكلفة',subtitle:'الكميات والتكلفة والاستخدام والاستهلاك الفعلي والمعياري',columns:['الأصل','كمية لتر','تكلفة الوقود','الاستخدام','الاستهلاك الفعلي','المعياري'],rows}
  }
  if(kind==='drivers'){
    const rows=drivers.filter(d=>!filters.proj||true).map(d=>{
      const id=String(d.id??'')
      const tripsFor=trips.filter(t=>t.driver_id===id && inRange(t.scheduled_start))
      const opsFor=operations.filter(o=>String(o.drv??'')===id && String(o.status??'')==='معتمد' && inRange(o.date))
      const charge=tripsFor.reduce((s,t)=>s+Number(t.total_charge||0),0)
      const tripCostsTotal=tripsFor.reduce((s,t)=>s+tripCosts.filter(c=>c.trip_id===t.id).reduce((x,c)=>x+Number(c.amount||0),0),0)
      const hours=opsFor.reduce((s,o)=>s+Number(o.hours||0),0)
      const distance=tripsFor.reduce((s,t)=>s+Number(t.distance_km||0),0)
      return [String(d.name??d.code??id),String(d.code??'—'),tripsFor.length,opsFor.length,fmt(hours),fmt(distance),fmt(charge),fmt(tripCostsTotal),charge?`${fmt((charge-tripCostsTotal)/charge*100)}%`:'—']
    }).filter(r=>Number(r[2])>0||Number(r[3])>0)
    return {title:'أداء السائقين والمشغلين',subtitle:'عدد عمليات النقل والتشغيل والمسافات وقيمة النقل والتكاليف المسجلة خلال الفترة',columns:['السائق/المشغل','الكود','عمليات النقل','سجلات التشغيل','ساعات التشغيل','كم النقل','قيمة النقل','تكاليف النقل','الهامش %'],rows}
  }
  if(kind==='invn'){
    const rows=inventory.map(i=>{const qty=Number(i.qty??0),min=Number(i.min??0),cost=Number(i.cost??0);return [{kind:'ref' as const,field:'item' as const,label:String(i.name??'—'),code:String(i.code??'')},String(i.cat??''),String(i.unit??''),fmt(qty),fmt(min),qty<min?'إعادة طلب':'طبيعي',fmt(cost),fmt(qty*cost)]})
    return {title:'المخزون وقطع الغيار',subtitle:'الرصيد والحد الأدنى وقيمة الرصيد',columns:['الصنف','التصنيف','الوحدة','الرصيد','الحد الأدنى','الحالة','تكلفة الوحدة','قيمة الرصيد'],rows}
  }
  const rows:ReportCell[][]=[]
  for(const r of moduleData.requests??[]){const s=String(r.status??'');if(['بانتظار الاعتماد','مقدمة','معتمد من مدير المشروع'].some(x=>s.includes(x)))rows.push(['طلب معدات',String(r.number??r.id??''),String(r.req??'—'),String(r.date??'—'),s,ageDays(String(r.date??''))])}
  for(const r of moduleData.operations??[]){if(String(r.status??'')==='مقدمة')rows.push(['سجل تشغيل',assetRef(String(r.assetId??'')),String(r.drv??'—'),String(r.date??'—'),'مقدمة',ageDays(String(r.date??''))])}
  for(const w of workOrders){if(String(w.status)==='بانتظار الاعتماد')rows.push(['أمر عمل',w.desc||w.id,'—',w.opened,w.status,ageDays(w.opened)])}
  for(const r of invoices){if(['مسجلة','بانتظار مراجعة'].includes(String(r.status??'')))rows.push(['فاتورة',String(r.number??''),String(r.party??'—'),String(r.date??'—'),String(r.status??''),ageDays(String(r.date??''))])}
  return {title:'الموافقات المعلقة',subtitle:'المعاملات التي تنتظر مراجعة أو اعتماد من صاحب الصلاحية',columns:['النوع','المرجع','الجهة/المستخدم','التاريخ','الحالة','معلق منذ يوم'],rows}
}

function TRIP_STATUS_LABELS_SAFE(status:string){const map:Record<string,string>={draft:'مسودة',assigned:'مجدولة',dispatched:'انطلقت',in_transit:'في الطريق',delivered:'تم التسليم',received:'تم الاستلام',invoiced:'مفوترة',paid:'مدفوعة',cancelled:'ملغاة'};return map[status]??status}

function costForAsset(a:Asset,workOrders:WorkOrder[],fuelOps:FuelOperation[],operations:Operation[],moduleData:Record<string,Record<string,unknown>[]>,filters:Filters){
 const inRange=(d:unknown)=>{const s=String(d??'');return !!s&&(!filters.from||s>=filters.from)&&(!filters.to||s<=filters.to)}
 const hours=operations.filter(o=>sameReference(o.assetId,a)&&inRange(o.date)&&o.status==='معتمد').reduce((s,o)=>s+Number(o.hours||0),0)
 const meterOps=operations.filter(o=>sameReference(o.assetId,a)&&inRange(o.date)&&o.status==='معتمد').sort((x,y)=>String(x.date).localeCompare(String(y.date))); const km=meterOps.reduce((s,o,i)=>s+(i?Math.max(0,Number(o.meter||0)-Number(meterOps[i-1].meter||0)):0),0)
 const fs=fuelOps.filter(f=>sameReference(f.assetId,a)&&inRange(f.date)&&f.type!=='استلام'&&f.status==='معتمد')
 const fuel=fs.reduce((s,f)=>s+Number(f.total||0),0),qty=fs.reduce((s,f)=>s+Number(f.qty||0),0)
 const maint=workOrders.filter(w=>sameReference(w.asset,a)&&inRange(w.opened)&&['معتمد','جارٍ التنفيذ','مكتمل','بانتظار قطع غيار'].includes(w.status)).reduce((s,w)=>s+Number(w.laborCost||0)+Number(w.partsCost||0)+Number(w.vendorCost||0),0)
 const oils=(moduleData.oilChanges??[]).filter(r=>sameReference(r.asset,a)&&inRange(r.date)).reduce((s,r)=>s+Number(r.materialCost??r.cost??0)+Number(r.laborCost??0),0)
 const tires=(moduleData.tireOps??[]).filter(r=>sameReference(r.asset,a)&&inRange(r.date)).reduce((s,r)=>s+Number(r.cost??0),0)
 const contracts=moduleData.contracts??[]; const c=contracts.find(r=>includesAsset(r.assets,a.id)||includesAsset(r.assets,a.code));
 const rental=a.own==='مستأجر'&&c?Number(c.rate||0)*Math.max(0,unitsInRange(String(c.unit??''),hours,km,filters.from,filters.to)):0
 const dep=a.own==='مملوك' ? depreciation(a,filters.from,filters.to) : 0
 const charging=(moduleData.charging??[]).filter(r=>sameReference(r.asset,a)&&inRange(r.date)&&String(r.status??'')==='معتمد').reduce((s,r)=>s+Number(r.amount||0),0)
 return {hours,km,fuel,qty,maint:maint+oils+tires,rental,dep,total:fuel+maint+oils+tires+rental+dep,charging,down:operations.filter(o=>sameReference(o.assetId,a)&&inRange(o.date)).reduce((s,o)=>s+Number(o.down||0),0)}
}

function unitsInRange(unit:string,hours:number,km:number,from:string,to:string){if(unit.includes('ساعة'))return hours;if(unit.includes('كم'))return km;const start=from?new Date(from):new Date();const end=to?new Date(to):new Date();return Math.max(1,Math.ceil((end.getTime()-start.getTime())/86400000)+1)}
function depreciation(a:Asset,from:string,to:string){if(!a.capex||!a.life)return 0;const days=Math.max(1,Math.ceil(((new Date(to||new Date()).getTime())-(new Date(from||new Date()).getTime()))/86400000)+1);return Math.max(0,((a.capex-(a.resid||0))/(a.life*365))*days)}
function accDep(a:Asset){if(!a.capex||!a.life||!a.buy)return 0;const days=Math.max(0,Math.ceil((Date.now()-new Date(a.buy).getTime())/86400000));return Math.min(Math.max(0,a.capex-(a.resid||0)),((a.capex-(a.resid||0))/(a.life*365))*days)}
function includesAsset(raw:unknown,id:string){return Array.isArray(raw)?raw.map(String).includes(id):String(raw??'').split(',').map(x=>x.trim()).includes(id)}
function daysLeft(date:string){if(!date)return '—';const n=Math.ceil((new Date(date).getTime()-Date.now())/86400000);return n}
function ageDays(date:string){if(!date)return 0;return Math.max(0,Math.ceil((Date.now()-new Date(date).getTime())/86400000))}
function ruleText(r:Record<string,unknown>){const x=[Number(r.everyKm||0)>0?`${r.everyKm} كم`:'',Number(r.everyHours||0)>0?`${r.everyHours} س`:'',Number(r.everyDays||0)>0?`${r.everyDays} يوم`:'' ].filter(Boolean);return x.length?x.join(' / '):'—'}
function dueText(r:Record<string,unknown>,a:Asset){const meter=Number(a.meter||0),last=Number(r.lastMeter||0),everyKm=Number(r.everyKm||0),everyH=Number(r.everyHours||0),lastDate=String(r.lastDate??'');const candidates:string[]=[];if(everyKm)candidates.push(`عداد: ${new Intl.NumberFormat('ar-EG').format(last+everyKm)}`);if(everyH)candidates.push(`ساعات: ${new Intl.NumberFormat('ar-EG').format(last+everyH)}`);if(r.everyDays&&lastDate){const d=new Date(lastDate);d.setDate(d.getDate()+Number(r.everyDays));candidates.push(`تاريخ: ${d.toISOString().slice(0,10)}`)}if(everyKm&&meter>=last+everyKm)return 'مستحق الآن';if(everyH&&meter>=last+everyH)return 'مستحق الآن';return candidates.join(' • ')||'حسب الجدول'}
function normalizeNumberText(value:string){const arabic='٠١٢٣٤٥٦٧٨٩';let out=value;for(let i=0;i<arabic.length;i++)out=out.replaceAll(arabic[i],String(i));return Number(out.replaceAll('٬','').replaceAll(',','').replaceAll('،','').trim())||0}
function toCsv(columns:string[],rows:ReportCell[][]){const text=(v:ReportCell)=>typeof v==='object'&&'kind' in v?(v.code&&v.label!==v.code?`${v.label} (${v.code})`:v.label):String(v??'');return [columns,...rows].map(row=>row.map(v=>`"${text(v).replaceAll('"','""')}"`).join(',')).join('\n')}
