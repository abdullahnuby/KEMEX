import { AlertTriangle, Boxes, CircleCheckBig, ClipboardCheck, Fuel, Gauge, Settings, Truck, Wrench } from 'lucide-react'
import type { Asset, FuelOperation, Operation, Project, WorkOrder } from '../types/tfms'
import { MetricCard } from '../components/MetricCard'
import { StatusBadge } from '../components/StatusBadge'
import { ReferenceValue } from '../components/ReferenceValue'
import { sameReference } from '../utils/referenceLabels'

export function DashboardPage({assets, projects, workOrders, fuelOps, operations, onRoute}: {assets:Asset[]; projects:Project[]; workOrders:WorkOrder[]; fuelOps:FuelOperation[]; operations:Operation[]; onRoute:(r:string)=>void}) {
  const active = assets.filter(a => a.status === 'يعمل' || a.status === 'مخصص لمشروع').length
  const maintenance = assets.filter(a => ['تحت الصيانة','بانتظار الإصلاح','بانتظار الفحص'].includes(a.status)).length
  const fuel30 = fuelOps.filter(x => x.type === 'صرف' && daysFrom(x.date) <= 30).reduce((sum,x) => sum + Number(x.total || 0),0)
  const openWo = workOrders.filter(x => !['مكتمل','ملغى'].includes(x.status)).length
  const pendingOps = operations.filter(x => x.status === 'مقدمة').length
  const expiring = assets.filter(a => a.lic && daysTo(a.lic) <= 30).length
  const topProjects = projects.map(p => ({...p,count:assets.filter(a=>sameReference(a.proj,p)).length})).sort((a,b)=>b.count-a.count).slice(0,5)
  const recentWo = [...workOrders].sort((a,b)=>b.opened.localeCompare(a.opened)).slice(0,5)
  const avgUtil = assets.length ? Math.round((operations.reduce((s,o)=>s+Number(o.hours||0),0) / Math.max(operations.length,1)) * 10) / 10 : 0

  return <div>
    <div className="page-head"><div><h1>لوحة المعلومات</h1><p>نظرة تشغيلية سريعة على الأسطول والمعدات والصيانة والوقود.</p></div><button className="secondary-button" onClick={() => onRoute('assets')}><Truck size={16}/> عرض الأصول</button></div>
    <div className="metric-grid">
      <MetricCard label="إجمالي الأصول" value={assets.length} meta={`متاح ${assets.filter(a=>a.status==='متاح').length}`} icon={Boxes}/>
      <MetricCard label="أصول عاملة" value={active} meta={`${Math.round((active/Math.max(assets.length,1))*100)}% من الأصول`} icon={CircleCheckBig} tone="green"/>
      <MetricCard label="تحت الصيانة" value={maintenance} meta="تحتاج متابعة" icon={Wrench} tone="purple"/>
      <MetricCard label="وقود آخر 30 يوم" value={`${fmt(fuel30)} ج.م`} meta="حركات الصرف" icon={Fuel} tone="amber"/>
      <MetricCard label="أوامر عمل مفتوحة" value={openWo} meta="غير مكتملة" icon={ClipboardCheck} tone="rose"/>
      <MetricCard label="تشغيل معلّق" value={pendingOps} meta="بانتظار المراجعة" icon={Gauge} tone="blue"/>
    </div>

    <div className="dashboard-grid">
      <section className="panel span-2"><div className="panel-head"><div><h2>الأصول حسب المشروع</h2><p>التوزيع الحالي</p></div><button className="text-button" onClick={()=>onRoute('projects')}>كل المشروعات</button></div><div className="project-bars">{topProjects.map((p)=> <div className="bar-row" key={p.id}><div className="bar-label"><span>{p.name}</span><b>{p.count}</b></div><div className="bar-track"><div className="bar-fill" style={{width:`${Math.max(8,(p.count/Math.max(assets.length,1))*100)}%`}} /></div></div>)}</div></section>
      <section className="panel"><div className="panel-head"><div><h2>التنبيهات</h2><p>استحقاقات تحتاج انتباه</p></div><AlertTriangle size={18} className="warning-icon"/></div><div className="alert-list">
        {expiring > 0 && <button onClick={()=>onRoute('assets')} className="alert-row"><span className="alert-dot amber"/><div><strong>{expiring} أصل</strong><small>رخصة ستنتهي خلال 30 يوم</small></div></button>}
        {maintenance > 0 && <button onClick={()=>onRoute('maintenance')} className="alert-row"><span className="alert-dot purple"/><div><strong>{maintenance} أصل</strong><small>في حالة صيانة أو إصلاح</small></div></button>}
        {!expiring && !maintenance && <div className="empty"><CircleCheckBig size={20}/> لا توجد تنبيهات حرجة</div>}
      </div></section>
      <section className="panel"><div className="panel-head"><div><h2>مؤشرات التشغيل</h2><p>من البيانات الحالية</p></div><Settings size={18} className="muted-icon"/></div><div className="mini-stats"><div><span>متوسط ساعات السجل</span><strong>{fmt(avgUtil)}</strong></div><div><span>المشروعات النشطة</span><strong>{projects.filter(p=>p.status==='نشط').length}</strong></div><div><span>أصول للإيجار</span><strong>{assets.filter(a=>a.own==='مستأجر').length}</strong></div></div></section>
      <section className="panel span-2"><div className="panel-head"><div><h2>آخر أوامر العمل</h2><p>أحدث السجلات</p></div><button className="text-button" onClick={()=>onRoute('maintenance')}>فتح الوحدة</button></div><div className="table-wrap"><table><thead><tr><th>الأصل</th><th>المشروع</th><th>نوع العمل</th><th>الأولوية</th><th>الحالة</th><th>التاريخ</th></tr></thead><tbody>{recentWo.map(w=><tr key={w.id}><td><ReferenceValue field="asset" value={w.asset} lookups={{assets}}/></td><td><ReferenceValue field="proj" value={w.proj} lookups={{projects}}/></td><td>{w.type}</td><td>{w.prio}</td><td><StatusBadge>{w.status}</StatusBadge></td><td>{fmtDate(w.opened)}</td></tr>)}</tbody></table></div></section>
    </div>
  </div>
}

const fmt=(n:number)=>new Intl.NumberFormat('ar-EG',{maximumFractionDigits:0}).format(n)
const fmtDate=(v:string)=>v?new Intl.DateTimeFormat('ar-EG',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(v)): '—'
const daysFrom=(v:string)=>Math.ceil((Date.now()-new Date(v).getTime())/86400000)
const daysTo=(v:string)=>Math.ceil((new Date(v).getTime()-Date.now())/86400000)
