import { useMemo, useState } from 'react'
import { BarChart3, CalendarClock, CheckCircle2, ClipboardCheck, Download, FileBarChart, Filter, Fuel, Gauge, PackageCheck, Printer, ReceiptText, RotateCcw, Search, Truck, Wrench, type LucideIcon } from 'lucide-react'
import type { Asset, FuelOperation, Operation, Project, WorkOrder } from '../types/tfms'
import { sameReference } from '../utils/referenceLabels'

type ReportKey = 'all'|'owned'|'rented'|'veh'|'eq'|'contracts'|'due'|'fuel'|'invn'|'appr'
type RefCell = { kind:'ref'; field:'asset'|'proj'|'item'; label:string; code?:string }
type ReportCell = string | number | RefCell
type ReportDef = { title:string; subtitle:string; columns:string[]; rows:ReportCell[][] }
type Filters = { from:string; to:string; cat:string; own:string; status:string; proj:string }

const emptyFilters:Filters={from:'',to:'',cat:'',own:'',status:'',proj:''}

export function ReportsPage({assets,projects,workOrders,fuelOps,operations,moduleData}:{assets:Asset[];projects:Project[];workOrders:WorkOrder[];fuelOps:FuelOperation[];operations:Operation[];moduleData:Record<string,Record<string,unknown>[]>}) {
  const [kind,setKind]=useState<ReportKey>('all')
  const [filters,setFilters]=useState<Filters>(emptyFilters)
  const [ran,setRan]=useState(false)
  const data=useMemo(()=>build(kind,assets,projects,workOrders,fuelOps,operations,moduleData,filters),[kind,assets,projects,workOrders,fuelOps,operations,moduleData,filters])
  const categories=useMemo(()=>Array.from(new Set(assets.map(a=>a.cat).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'ar')),[assets])
  const statuses=useMemo(()=>Array.from(new Set(assets.map(a=>a.status).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'ar')),[assets])
  const selectedReport=REPORTS.find(x=>x.key===kind)??REPORTS[0]
  const totalCost=useMemo(()=>sumNumericColumn(data,'إجمالي التكلفة'),[data])
  const totalFuel=useMemo(()=>sumNumericColumn(data,'تكلفة الوقود')||sumNumericColumn(data,'وقود'),[data])
  function download(){
    const csv=toCsv(data.columns,data.rows)
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([`\ufeff${csv}`],{type:'text/csv;charset=utf-8'}));a.download=`KEMEX-${kind}-${new Date().toISOString().slice(0,10)}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),700)
  }
  return <div className="report-page">
    <div className="page-head report-page-head">
      <div><div className="eyebrow"><BarChart3 size={14}/> مركز التحليلات والتقارير</div><h1>مركز التقارير</h1><p>تقارير تشغيلية ومالية بواجهة واضحة، مع مرشحات دقيقة وتنسيق مهيأ للطباعة والتصدير.</p></div>
      <div className="page-actions"><button className="secondary-button" onClick={()=>window.print()}><Printer size={16}/> طباعة التقرير</button><button className="primary-button" onClick={download} disabled={!ran||!data.rows.length}><Download size={16}/> تصدير CSV</button></div>
    </div>
    <section className="report-selection panel">
      <div className="report-section-head"><div><span className="kicker">01</span><div><h2>اختر التقرير</h2><p>كل تقرير له غرض واضح ويعرض بياناته بالشكل المناسب.</p></div></div><span className="report-count-badge">{REPORTS.length} تقارير</span></div>
      <div className="report-card-grid">{REPORTS.map(r=>{const Icon=r.icon;return <button key={r.key} type="button" className={`report-choice ${r.key===kind?'active':''}`} onClick={()=>{setKind(r.key);setRan(false)}}><span className="report-choice-icon"><Icon size={18}/></span><span><strong>{r.title}</strong><small>{r.subtitle}</small></span>{r.key===kind&&<CheckCircle2 size={16} className="report-choice-check"/>}</button>})}</div>
    </section>
    <section className="report-filter-panel panel">
      <div className="report-section-head"><div><span className="kicker">02</span><div><h2>مرشحات التقرير</h2><p>حدد الفترة والمشروع والملكية والحالة قبل اعتماد النتيجة.</p></div></div><button className="text-button" type="button" onClick={()=>{setFilters(emptyFilters);setRan(false)}}><RotateCcw size={14}/> إعادة الضبط</button></div>
      <div className="form-grid report-filter-grid">
        <label className="field"><span>من تاريخ</span><input type="date" value={filters.from} onChange={e=>setFilters(f=>({...f,from:e.target.value}))}/></label>
        <label className="field"><span>إلى تاريخ</span><input type="date" value={filters.to} onChange={e=>setFilters(f=>({...f,to:e.target.value}))}/></label>
        <label className="field"><span>الفئة</span><select value={filters.cat} onChange={e=>setFilters(f=>({...f,cat:e.target.value}))}><option value="">كل الفئات</option>{categories.map(x=><option key={x}>{x}</option>)}</select></label>
        <label className="field"><span>الملكية</span><select value={filters.own} onChange={e=>setFilters(f=>({...f,own:e.target.value}))}><option value="">الكل</option><option value="مملوك">مملوك</option><option value="مستأجر">مستأجر</option></select></label>
        <label className="field"><span>حالة الأصل</span><select value={filters.status} onChange={e=>setFilters(f=>({...f,status:e.target.value}))}><option value="">كل الحالات</option>{statuses.map(x=><option key={x}>{x}</option>)}</select></label>
        <label className="field"><span>المشروع</span><select value={filters.proj} onChange={e=>setFilters(f=>({...f,proj:e.target.value}))}><option value="">كل المشروعات</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name} — {p.code}</option>)}</select></label>
        <div className="report-run"><button className="primary-button large" onClick={()=>setRan(true)}><ClipboardCheck size={16}/> تشغيل التقرير</button><div className="report-filter-note"><Filter size={13}/> النتيجة تتحدث حسب المرشحات الحالية</div></div>
      </div>
    </section>
    <section className="report-dashboard-grid">
      <article className="report-hero panel"><div className="report-hero-top"><span className="report-hero-icon"><ReportIcon kind={kind}/></span><span className="badge blue">RPT-{String(REPORTS.findIndex(x=>x.key===kind)+1).padStart(2,'0')}</span></div><div><h2>{selectedReport.title}</h2><p>{data.subtitle}</p></div><div className="report-active-filters"><span>{filters.from||'بداية البيانات'}</span><i>←</i><span>{filters.to||'اليوم'}</span><span className="dot"/><span>{filters.proj?projects.find(p=>p.id===filters.proj)?.name??'مشروع محدد':'كل المشروعات'}</span></div></article>
      <div className="report-kpis">
        <article className="report-kpi panel"><span className="report-kpi-icon teal"><Search size={17}/></span><div><small>السجلات الناتجة</small><strong>{new Intl.NumberFormat('ar-EG').format(data.rows.length)}</strong></div></article>
        <article className="report-kpi panel"><span className="report-kpi-icon blue"><Truck size={17}/></span><div><small>الأصول المعنية</small><strong>{new Intl.NumberFormat('ar-EG').format(assets.filter(a=>!filters.proj||a.proj===filters.proj).length)}</strong></div></article>
        <article className="report-kpi panel"><span className="report-kpi-icon amber"><Fuel size={17}/></span><div><small>تكلفة الوقود</small><strong>{fmt(totalFuel)} ج.م</strong></div></article>
        <article className="report-kpi panel"><span className="report-kpi-icon rose"><Gauge size={17}/></span><div><small>إجمالي التكلفة</small><strong>{fmt(totalCost)} ج.م</strong></div></article>
      </div>
    </section>
    <section className="panel report-result-panel">
      <div className="report-result-head"><div><span className="kicker">03</span><div><h2>نتيجة التقرير</h2><p>{ran?'تم تشغيل التقرير ويمكن تصديره أو طباعته.':'راجع المعاينة ثم شغّل التقرير لاعتماد النتيجة قبل التصدير.'}</p></div></div><span className={`report-state ${ran?'ready':'draft'}`}>{ran?'جاهز للتصدير':'مسودة نتيجة'}</span></div>
      <div className="report-table-meta"><span>{data.columns.length} أعمدة</span><span>{new Intl.NumberFormat('ar-EG').format(data.rows.length)} سجل</span><span>{filters.cat||'كل الفئات'}</span><span>{filters.own||'كل الملكيات'}</span><span>{filters.status||'كل الحالات'}</span></div>
      <div className="table-wrap report-table-wrap"><table className="report-table"><thead><tr>{data.columns.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{data.rows.map((r,i)=><tr key={i}>{r.map((v,j)=><td key={j}>{renderReportCell(v)}</td>)}</tr>)}</tbody></table>{!data.rows.length&&<div className="empty"><FileBarChart size={24}/>لا توجد بيانات مطابقة للمرشحات الحالية.</div>}</div>
      {!ran&&<div className="report-hint"><ClipboardCheck size={15}/> البيانات أعلاه للمعاينة؛ اضغط «تشغيل التقرير» قبل التصدير.</div>}
    </section>
  </div>
}

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
  {key:'appr',title:'الموافقات المعلقة',subtitle:'السجلات التي تحتاج إجراء',icon:ClipboardCheck},
]

function build(kind:ReportKey,assets:Asset[],projects:Project[],workOrders:WorkOrder[],fuelOps:FuelOperation[],operations:Operation[],moduleData:Record<string,Record<string,unknown>[]>,filters:Filters):ReportDef {
  const assetOk=(a:Asset)=>!filters.cat||a.cat===filters.cat
    ? (!filters.own||a.own===filters.own) && (!filters.status||a.status===filters.status) && (!filters.proj||sameReference(a.proj, projects.find(p=>sameReference(filters.proj,p))??{}))
    : false
  const inRange=(d:unknown)=>{const s=String(d??'');return !!s&&(!filters.from||s>=filters.from)&&(!filters.to||s<=filters.to)}
  const projectName=(id:string)=>id?projects.find(p=>sameReference(id,p))?.name??id:'المقر'
  const refAsset=(id:string):RefCell=>{const a=assets.find(x=>sameReference(id,x));return {kind:'ref',field:'asset',label:(a?.name ?? id) || '—',code:a?.code}}
  const refProject=(id:string):RefCell=>{const p=projects.find(x=>sameReference(id,x));return {kind:'ref',field:'proj',label:(p?.name ?? id) || 'المقر',code:p?.code}}
  const assetRef=(id:string)=>{const a=assets.find(x=>sameReference(id,x));return a?`${a.name} (${a.code})`:id||'—'}
  const assetName=(id:string)=>id?assets.find(a=>sameReference(id,a))?.name??id:'—'
  const fmt=(n:unknown)=>new Intl.NumberFormat('ar-EG',{maximumFractionDigits:1}).format(Number(n||0))
  const plans=moduleData.plans??[]
  const oils=moduleData.oils??[]
  const tires=moduleData.tireOps??[]
  const inventory=moduleData.inventory??[]
  const invoices=moduleData.invoices??[]
  const purchases=moduleData.purchases??[]
  const charging=moduleData.charging??[]

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
  if(kind==='fuel'){
    const rows=assets.filter(assetOk).map(a=>{const c=costForAsset(a,workOrders,fuelOps,operations,moduleData,filters);const actual=a.mt==='كم'?(c.km?fmt(c.qty/c.km*100)+' ل/100كم':'—'):(c.hours?fmt(c.qty/c.hours)+' ل/س':'—');return [refAsset(a.id),fmt(c.qty),fmt(c.fuel),a.mt==='كم'?`${fmt(c.km)} كم`:`${fmt(c.hours)} ساعة`,actual,a.std?fmt(a.std):'—']})
    return {title:'الوقود: الاستهلاك والتكلفة',subtitle:'الكميات والتكلفة والاستخدام والاستهلاك الفعلي والمعياري',columns:['الأصل','كمية لتر','تكلفة الوقود','الاستخدام','الاستهلاك الفعلي','المعياري'],rows}
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
