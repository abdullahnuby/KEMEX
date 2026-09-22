import { useMemo } from 'react'
import { AlertTriangle, Boxes, CircleCheckBig, ClipboardCheck, Fuel, Gauge, Settings, Truck, Wrench } from 'lucide-react'
import type { Asset, FuelOperation, Operation, Project, WorkOrder } from '../types/tfms'
import { Button, Card, ChartShell, AnalyticsBarChart, AnalyticsDonut, AnalyticsDualBars, AnalyticsLineChart, MetricCard, PageHeader, StatusBadge, DataTable } from '../components/ui'
import { ReferenceValue } from '../components/ReferenceValue'
import { sameReference } from '../utils/referenceLabels'
import { useCurrency } from '../features/settings'

export function DashboardPage({assets, projects, workOrders, fuelOps, operations, onRoute}: {assets:Asset[]; projects:Project[]; workOrders:WorkOrder[]; fuelOps:FuelOperation[]; operations:Operation[]; onRoute:(r:string)=>void}) {
  const {formatMoney} = useCurrency()
  const active = assets.filter(a => a.status === 'يعمل' || a.status === 'مخصص لمشروع').length
  const maintenance = assets.filter(a => ['تحت الصيانة','بانتظار الإصلاح','بانتظار الفحص'].includes(a.status)).length
  const available = assets.filter(a => a.status === 'متاح').length
  const fuel30 = fuelOps.filter(x => x.type === 'صرف' && daysFrom(x.date) <= 30).reduce((sum,x) => sum + Number(x.total || 0),0)
  const openWo = workOrders.filter(x => !['مكتمل','ملغى'].includes(x.status)).length
  const pendingOps = operations.filter(x => x.status === 'مقدمة').length
  const expiring = assets.filter(a => a.lic && daysTo(a.lic) <= 30).length
  const projectRows = useMemo(() => projects.map(p => ({...p,count:assets.filter(a=>sameReference(a.proj,p)).length})).sort((a,b)=>b.count-a.count).slice(0,7), [assets, projects])
  const recentWo = useMemo(() => [...workOrders].sort((a,b)=>b.opened.localeCompare(a.opened)).slice(0,6), [workOrders])
  const analytics = useMemo(() => buildDashboardAnalytics(assets, fuelOps, workOrders, operations, projects), [assets, fuelOps, workOrders, operations, projects])
  const healthSegments = [
    {label:'عاملة / مخصصة', value: active},
    {label:'متاحة', value: available},
    {label:'تحت الصيانة', value: maintenance},
    {label:'أخرى', value: Math.max(0, assets.length - active - available - maintenance)},
  ]
  const utilization = assets.length ? operations.reduce((s,o)=>s+Number(o.hours||0),0) / assets.length : 0
  const avgFuel = fuel30 && assets.length ? fuel30 / Math.max(active || assets.length, 1) : 0
  const activeProjects = projects.filter(p=>p.status==='نشط').length

  return <div className="space-y-5">
    <PageHeader
      title="لوحة المعلومات"
      description="مركز قيادة تشغيلي يوضح حالة الأصول والتكاليف والوقود والصيانة في نظرة واحدة."
      meta={<div className="eyebrow"><Gauge size={14}/> مركز التشغيل والتحليل</div>}
      action={<div className="reference-header-actions"><Button variant="secondary" icon={<Truck size={16} />} onClick={() => onRoute('assets')}>عرض الأصول</Button><Button icon={<Settings size={16}/>} onClick={() => onRoute('reports')}>مركز التقارير</Button></div>}
    />

    <div className="metric-grid">
      <MetricCard label="إجمالي الأصول" value={assets.length} meta={`متاح ${available}`} icon={Boxes}/>
      <MetricCard label="أصول عاملة" value={active} meta={`${assets.length ? Math.round((active/assets.length)*100) : 0}% من الأصول`} icon={CircleCheckBig} tone="green"/>
      <MetricCard label="تحت الصيانة" value={maintenance} meta="تحتاج متابعة" icon={Wrench} tone="purple"/>
      <MetricCard label="وقود آخر 30 يوم" value={formatMoney(fuel30)} meta="مصروفات الوقود المعتمدة" icon={Fuel} tone="amber"/>
      <MetricCard label="أوامر عمل مفتوحة" value={openWo} meta="غير مكتملة" icon={ClipboardCheck} tone="rose"/>
      <MetricCard label="تشغيل معلّق" value={pendingOps} meta="بانتظار المراجعة" icon={Gauge} tone="blue"/>
    </div>

    <div className="dashboard-analytics-grid">
      <ChartShell title="اتجاه التكلفة والوقود" description="آخر 6 أشهر من السجلات المتاحة — يعرض قيمة الوقود وصيانة أوامر العمل شهريًا">
        <AnalyticsLineChart points={analytics.monthlyCost} valueSuffix=" ج.م" height={250}/>
        <div className="analytics-insight-strip">
          <div><span>إجمالي الوقود</span><strong>{formatMoney(analytics.totalFuel)}</strong></div>
          <div><span>تكلفة الصيانة</span><strong>{formatMoney(analytics.totalMaintenance)}</strong></div>
          <div><span>ساعات التشغيل</span><strong>{fmt(analytics.totalHours)}</strong></div>
          <div><span>طلبات العمل</span><strong>{fmt(analytics.totalWorkOrders)}</strong></div>
        </div>
      </ChartShell>
      <ChartShell title="حالة الأسطول" description="توزيع الأصول حسب الحالة الحالية">
        <AnalyticsDonut segments={healthSegments} centerValue={fmt(assets.length)} centerLabel="إجمالي أصل"/>
      </ChartShell>
    </div>

    <div className="dashboard-secondary-grid">
      <ChartShell title="الأصول حسب المشروع" description="أعلى المشروعات من حيث حجم الأصول المخصصة لها" action={<Button variant="ghost" size="sm" onClick={()=>onRoute('projects')}>كل المشروعات</Button>}>
        <AnalyticsBarChart points={projectRows.map(p=>({label:p.name,value:p.count}))} valueSuffix=" أصل" limit={7}/>
      </ChartShell>
      <ChartShell title="الاستخدام مقابل التوقف" description="مقارنة ساعات التشغيل والتوقف للأصول ذات السجلات المعتمدة">
        <AnalyticsDualBars
          points={analytics.assetUsage.map(x=>({label:x.label,value:x.hours,secondary:x.down}))}
          firstLabel="ساعات التشغيل"
          secondLabel="ساعات التوقف"
        />
      </ChartShell>
    </div>

    <div className="dashboard-grid gap-4">
      <Card title="التنبيهات والإجراءات" description="الأمور التي تستحق المتابعة الآن" action={<AlertTriangle size={18} className="warning-icon"/>}>
        <div className="alert-list">
          {expiring > 0 && <button onClick={()=>onRoute('assets')} className="alert-row"><span className="alert-dot amber"/><div><strong>{expiring} أصل</strong><small>رخصة ستنتهي خلال 30 يوم</small></div><StatusBadge tone="amber">مراجعة</StatusBadge></button>}
          {maintenance > 0 && <button onClick={()=>onRoute('maintenance')} className="alert-row"><span className="alert-dot purple"/><div><strong>{maintenance} أصل</strong><small>في حالة صيانة أو إصلاح</small></div><StatusBadge tone="blue">صيانة</StatusBadge></button>}
          {pendingOps > 0 && <button onClick={()=>onRoute('operations')} className="alert-row"><span className="alert-dot"/><div><strong>{pendingOps} سجل تشغيل</strong><small>بانتظار مراجعة المدير</small></div><StatusBadge tone="blue">اعتماد</StatusBadge></button>}
          {!expiring && !maintenance && !pendingOps && <div className="empty"><CircleCheckBig size={22}/> لا توجد تنبيهات حرجة</div>}
        </div>
      </Card>
      <Card span2 title="مؤشرات التشغيل" description="ملخص تنفيذي مبني على البيانات الحالية" action={<Settings size={18} className="muted-icon"/>}>
        <div className="dashboard-insight-list">
          <div className="dashboard-insight"><span>المشروعات النشطة</span><strong>{fmt(activeProjects)}</strong><small>مشروعًا ظاهرًا في النظام</small></div>
          <div className="dashboard-insight"><span>متوسط ساعات التشغيل لكل أصل</span><strong>{fmt(utilization)}</strong><small>اعتمادًا على سجلات التشغيل</small></div>
          <div className="dashboard-insight"><span>متوسط تكلفة الوقود لكل أصل عامل</span><strong>{formatMoney(avgFuel)}</strong><small>خلال آخر 30 يومًا</small></div>
          <div className="dashboard-insight"><span>نسبة الأصول العاملة</span><strong>{assets.length ? `${Math.round(active/assets.length*100)}%` : '0%'}</strong><small>من إجمالي الأصول</small></div>
        </div>
      </Card>
      <Card title="آخر أوامر العمل" description="أحدث السجلات" action={<Button variant="ghost" size="sm" onClick={()=>onRoute('maintenance')}>فتح الوحدة</Button>} noPadding>
        <DataTable
          rows={recentWo}
          columns={[
            { id:'asset', header:'الأصل', sortValue:w=>String(w.asset??''), render:w=><ReferenceValue field="asset" value={w.asset} lookups={{assets}}/> },
            { id:'project', header:'المشروع', sortValue:w=>String(w.proj??''), render:w=><ReferenceValue field="proj" value={w.proj} lookups={{projects}}/> },
            { id:'type', header:'نوع العمل', sortValue:w=>w.type, render:w=>w.type },
            { id:'status', header:'الحالة', sortValue:w=>w.status, render:w=><StatusBadge dot>{w.status}</StatusBadge> },
            { id:'opened', header:'التاريخ', sortValue:w=>w.opened, render:w=>fmtDate(w.opened) },
          ]}
          rowKey={w=>w.id}
          pageSize={6}
          searchPlaceholder="بحث في أوامر العمل..."
        />
      </Card>
    </div>
  </div>
}

type DashboardAnalytics = { monthlyCost: {label:string;value:number}[]; totalFuel:number; totalMaintenance:number; totalHours:number; totalWorkOrders:number; assetUsage:{label:string;hours:number;down:number}[] }

function buildDashboardAnalytics(assets:Asset[], fuelOps:FuelOperation[], workOrders:WorkOrder[], operations:Operation[], projects:Project[]): DashboardAnalytics {
  const sourceDates = [...fuelOps.map(x=>x.date), ...workOrders.map(x=>x.opened), ...operations.map(x=>x.date)].filter(Boolean).map(x=>new Date(x).getTime()).filter(Number.isFinite)
  const anchor = new Date(Math.max(Date.now(), ...(sourceDates.length ? sourceDates : [Date.now()])))
  const months = Array.from({length:6}, (_, i) => {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() - (5-i), 1)
    return {key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, label:new Intl.DateTimeFormat('ar-EG',{month:'short'}).format(d)}
  })
  const monthCost = months.map(m=>{
    const fuel = fuelOps.filter(x=>monthKey(x.date)===m.key && x.type==='صرف').reduce((s,x)=>s+Number(x.total||0),0)
    const maint = workOrders.filter(x=>monthKey(x.opened)===m.key).reduce((s,x)=>s+Number(x.laborCost||0)+Number(x.partsCost||0)+Number(x.vendorCost||0),0)
    return {label:m.label,value:fuel+maint}
  })
  const assetUsage = assets.map(a=>({
    label:a.name,
    hours:operations.filter(o=>sameReference(o.assetId,a)&&o.status==='معتمد').reduce((s,o)=>s+Number(o.hours||0),0),
    down:operations.filter(o=>sameReference(o.assetId,a)&&o.status==='معتمد').reduce((s,o)=>s+Number(o.down||0),0),
  })).filter(x=>x.hours>0 || x.down>0).sort((a,b)=>(b.hours+b.down)-(a.hours+a.down)).slice(0,7)
  return {
    monthlyCost:monthCost,
    totalFuel:fuelOps.filter(x=>x.type==='صرف' && daysFrom(x.date)<=30).reduce((s,x)=>s+Number(x.total||0),0),
    totalMaintenance:workOrders.filter(x=>daysFrom(x.opened)<=30).reduce((s,x)=>s+Number(x.laborCost||0)+Number(x.partsCost||0)+Number(x.vendorCost||0),0),
    totalHours:operations.filter(x=>x.status==='معتمد' && daysFrom(x.date)<=30).reduce((s,x)=>s+Number(x.hours||0),0),
    totalWorkOrders:workOrders.filter(x=>daysFrom(x.opened)<=30).length,
    assetUsage,
  }
}

const monthKey=(value:string)=>{const d=new Date(value);return Number.isNaN(d.getTime())?'':`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
const fmt=(n:number)=>new Intl.NumberFormat('ar-EG',{maximumFractionDigits:1}).format(Number(n||0))
const fmtDate=(v:string)=>v?new Intl.DateTimeFormat('ar-EG',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(v)): '—'
const daysFrom=(v:string)=>Math.ceil((Date.now()-new Date(v).getTime())/86400000)
const daysTo=(v:string)=>Math.ceil((new Date(v).getTime()-Date.now())/86400000)
