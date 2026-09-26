import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, Boxes, CircleCheckBig, ClipboardCheck, Fuel, Gauge, ShieldCheck, Truck, Wrench } from 'lucide-react'
import type { Asset, FuelOperation, Operation, Project, WorkOrder } from '../types/tfms'
import { Button, Card, ChartShell, AnalyticsDonut, AnalyticsLineChart, MetricCard, StatusBadge } from '../components/ui'
import { sameReference } from '../utils/referenceLabels'
import { useCurrency } from '../features/settings'
import { APP_LOCALE } from '../shared/formatters/locale'
import '../styles/dashboard-home.css'

type DashboardPeriod = 30 | 90 | 180

export function DashboardPage({ assets, projects, workOrders, fuelOps, operations, onRoute }: { assets: Asset[]; projects: Project[]; workOrders: WorkOrder[]; fuelOps: FuelOperation[]; operations: Operation[]; onRoute: (route: string) => void }) {
  const { formatMoney } = useCurrency()
  const [period, setPeriod] = useState<DashboardPeriod>(30)

  const dashboard = useMemo(() => buildDashboardSnapshot(assets, fuelOps, workOrders, operations, projects, period), [assets, fuelOps, workOrders, operations, projects, period])
  const available = dashboard.available
  const expiring = dashboard.expiring
  const openWo = dashboard.openWo
  const pendingOps = dashboard.pendingOps

  return <div className="dashboard-page dashboard-page--executive dashboard-page--marketing">
    <header className="dashboard-hero dashboard-marketing-hero">
      <div className="dashboard-hero-main">
        <div className="dashboard-hero-header">
          <span className="dashboard-hero-kicker"><Gauge size={15} /> KEMEX · مركز القيادة والتشغيل</span>
          <span className="dashboard-hero-badge">{fmt(dashboard.readiness)}%</span>
        </div>
        <h2>إدارة أذكى .. تشغيل أقوى</h2>
        <p>كل ما تحتاجه لإدارة أسطولك وأصولك وعملياتك وتكاليفك من منصة واحدة، مع صورة تشغيلية واضحة في الوقت الفعلي.</p>
        <div className="dashboard-hero-actions">
          <Button icon={<Truck size={16} />} onClick={() => onRoute('assets')}>استكشف الأصول</Button>
          <Button variant="secondary" icon={<Gauge size={16} />} onClick={() => onRoute('operations-center')}>مركز التحكم</Button>
        </div>
        <div className="dashboard-hero-progress"><span style={{ width: `${Math.max(0, Math.min(100, dashboard.readiness))}%` }} /></div>
        <div className="dashboard-hero-footer">
          <span>جاهزية الموارد</span>
          <strong>{fmt(dashboard.readiness)}%</strong>
          <small>{fmt(dashboard.totalAssets)} أصل · {fmt(dashboard.activeProjects)} مشروع نشط</small>
        </div>
      </div>

      <div className="dashboard-mini-stats">
        <article className="dashboard-mini-stat dashboard-mini-stat--blue"><span>أصول تعمل الآن</span><strong>{fmt(dashboard.activeCount)}</strong><small>{fmt(available)} متاحة</small></article>
        <article className="dashboard-mini-stat dashboard-mini-stat--green"><span>أوامر عمل مفتوحة</span><strong>{fmt(openWo)}</strong><small>{fmt(dashboard.urgentWorkOrders)} عاجلة</small></article>
        <article className="dashboard-mini-stat dashboard-mini-stat--amber"><span>استحقاقات خلال 30 يوم</span><strong>{fmt(expiring)}</strong><small>تحتاج متابعة</small></article>
        <article className="dashboard-mini-stat dashboard-mini-stat--navy"><span>عمليات في الفترة</span><strong>{fmt(dashboard.workOrderCount + dashboard.fuelEntries)}</strong><small>{periodLabelShort(period)}</small></article>
      </div>
    </header>

    <section className={`dashboard-command-strip dashboard-command-strip--premium ${dashboard.priorityCount > 0 ? 'is-alert' : 'is-clear'}`} aria-label="الحالة التشغيلية والأوامر السريعة">
      <div className="dashboard-command-lead">
        <span className="dashboard-command-kicker"><ShieldCheck size={14} /> حالة التشغيل</span>
        <strong>{dashboard.priorityCount > 0 ? `${fmt(dashboard.priorityCount)} نقطة تحتاج متابعة` : 'الوضع التشغيلي مستقر'}</strong>
        <small>{dashboard.priorityCount > 0 ? 'راجع الأولويات قبل بدء دورة التشغيل التالية.' : 'لا توجد استثناءات حرجة في البيانات الحالية.'}</small>
      </div>
      <div className="dashboard-command-signal">
        {dashboard.priorityCount > 0 ? <AlertTriangle size={15} /> : <CircleCheckBig size={15} />}
        <span>{dashboard.priorityCount > 0 ? 'يحتاج متابعة' : 'جاهز للتشغيل'}</span>
      </div>
      <button type="button" className="dashboard-command-link" onClick={() => onRoute('alerts')}>عرض التنبيهات <ArrowLeft size={14} /></button>
    </section>

    <section className="dashboard-quick-actions" aria-label="العمليات السريعة">
      <div className="dashboard-section-heading">
        <div><span>الوصول السريع</span><h2>العمليات السريعة</h2><p>نفّذ أكثر المهام استخدامًا مباشرة من الصفحة الرئيسية.</p></div>
      </div>
      <div className="dashboard-quick-grid">
        <button type="button" className="dashboard-quick-card dashboard-quick-card--blue" onClick={() => onRoute('assets')}><span className="dashboard-quick-icon"><Truck size={21} /></span><span><strong>الأصول والأسطول</strong><small>عرض الأصول وحالتها وتخصيصاتها</small></span><ArrowLeft size={17} /></button>
        <button type="button" className="dashboard-quick-card dashboard-quick-card--teal" onClick={() => onRoute('operations')}><span className="dashboard-quick-icon"><Gauge size={21} /></span><span><strong>التشغيل اليومي</strong><small>متابعة العمليات والاعتمادات</small></span><ArrowLeft size={17} /></button>
        <button type="button" className="dashboard-quick-card dashboard-quick-card--amber" onClick={() => onRoute('maintenance')}><span className="dashboard-quick-icon"><Wrench size={21} /></span><span><strong>الصيانة</strong><small>أوامر العمل والأعمال المفتوحة</small></span><ArrowLeft size={17} /></button>
        <button type="button" className="dashboard-quick-card dashboard-quick-card--purple" onClick={() => onRoute('reports')}><span className="dashboard-quick-icon"><ClipboardCheck size={21} /></span><span><strong>التقارير والتحليلات</strong><small>التكلفة والاستخدام والمؤشرات</small></span><ArrowLeft size={17} /></button>
      </div>
    </section>

    <section className="dashboard-details-block" aria-label="تفاصيل التشغيل">
      <div className="dashboard-section-heading dashboard-section-heading--details">
        <div><span>البيانات الحية</span><h2>تفاصيل التشغيل</h2><p>المؤشرات والتكلفة وحالة الموارد في قراءة واحدة.</p></div>
        <div className="dashboard-period-switch" role="group" aria-label="نطاق المؤشرات">
          {([30, 90, 180] as const).map(value => <button key={value} type="button" className={period === value ? 'active' : ''} aria-pressed={period === value} onClick={() => setPeriod(value)}>{value === 30 ? '30 يوم' : value === 90 ? '90 يوم' : '6 أشهر'}</button>)}
        </div>
      </div>

      <section className="dashboard-kpi-grid" aria-label="المؤشرات التنفيذية">
        <MetricCard label="جاهزية الأسطول" value={`${fmt(dashboard.readiness)}%`} meta={`${fmt(dashboard.totalAssets)} أصل`} icon={CircleCheckBig} tone="green" />
        <MetricCard label="أصول تعمل الآن" value={fmt(dashboard.activeCount)} meta={`${fmt(available)} متاحة`} icon={Boxes} tone="teal" />
        <MetricCard label="أوامر عمل مفتوحة" value={fmt(openWo)} meta={`${fmt(dashboard.urgentWorkOrders)} عاجلة`} icon={ClipboardCheck} tone="rose" />
        <MetricCard label="استحقاقات خلال 30 يوم" value={fmt(expiring)} meta="تحتاج متابعة" icon={ShieldCheck} tone="blue" />
        <MetricCard label={`تكلفة الوقود · ${periodLabelShort(period)}`} value={formatMoney(dashboard.fuelCost)} meta={`${fmt(dashboard.fuelEntries)} عملية معتمدة`} icon={Fuel} tone="amber" />
      </section>

      <section className="dashboard-executive-grid">
        <ChartShell title="اتجاه تكلفة التشغيل" description={period === 30 ? 'آخر 30 يومًا' : period === 90 ? 'آخر 90 يومًا' : 'آخر 6 أشهر'} action={<Button variant="ghost" size="sm" onClick={() => onRoute('reports')}>التفاصيل</Button>}>
          <AnalyticsLineChart points={dashboard.monthlyCost} valueSuffix=" ج.م" secondarySuffix=" ج.م" primaryLabel="الوقود" secondaryLabel="الصيانة" height={225} />
          <div className="dashboard-chart-summary">
            <div><span>الوقود</span><strong>{formatMoney(dashboard.fuelCost)}</strong></div>
            <div><span>الصيانة</span><strong>{formatMoney(dashboard.maintenanceCost)}</strong></div>
          </div>
        </ChartShell>

        <Card title="الأولويات الآن" description={dashboard.priorityCount ? 'العناصر التي تحتاج تدخلًا قبل تشغيل الدورة القادمة' : 'الوضع الحالي مستقر'} action={<AlertTriangle size={18} className="warning-icon" />}>
          <div className="dashboard-decision-list">
            {dashboard.watchlist.slice(0, 4).map(item => <button key={item.id} type="button" onClick={() => onRoute(item.route)} className="dashboard-decision-row">
              <span className={`priority-icon ${item.tone}`}><item.icon size={16} /></span>
              <span className="dashboard-watch-copy"><strong>{item.name}</strong><small>{item.reason}{item.code ? ` · ${item.code}` : ''}</small></span>
              <StatusBadge tone={item.tone === 'red' ? 'red' : item.tone === 'amber' ? 'amber' : 'blue'}>{item.status}</StatusBadge>
            </button>)}
            {pendingOps > 0 && <button type="button" onClick={() => onRoute('operations')} className="dashboard-decision-row"><span className="priority-icon blue"><Gauge size={16} /></span><span className="dashboard-watch-copy"><strong>{fmt(pendingOps)} سجل تشغيلي</strong><small>بانتظار الاعتماد</small></span><StatusBadge tone="blue">اعتماد</StatusBadge></button>}
            {!dashboard.priorityCount && <div className="dashboard-clear-state"><CircleCheckBig size={22} /><div><strong>لا توجد نقاط حرجة</strong><small>لا يوجد شيء يحتاج تدخّلًا فوريًا في البيانات الحالية.</small></div></div>}
          </div>
        </Card>
      </section>

      <section className="dashboard-status-grid">
        <Card title="حالة الأصول" description="توزيع مختصر للحالة الحالية" action={<Button variant="ghost" size="sm" onClick={() => onRoute('assets')}>فتح الأصول</Button>}>
          <AnalyticsDonut segments={dashboard.healthSegments} centerValue={fmt(dashboard.totalAssets)} centerLabel="إجمالي أصل" />
        </Card>
        <Card title="مؤشر الفترة" description="قراءة سريعة للأداء التشغيلي" action={<Button variant="ghost" size="sm" onClick={() => onRoute('operations')}>مركز التشغيل</Button>}>
          <div className="dashboard-period-summary">
            <div><span>المشروعات النشطة</span><strong>{fmt(dashboard.activeProjects)}</strong></div>
            <div><span>ساعات التشغيل</span><strong>{fmt(dashboard.hours)}</strong></div>
            <div><span>ساعات التوقف</span><strong>{fmt(dashboard.downtime)}</strong></div>
          </div>
        </Card>
      </section>
    </section>
  </div>
}

type DashboardSnapshot = {
  totalAssets: number
  activeCount: number
  active: number
  available: number
  maintenance: number
  maintenanceCritical: number
  fuelCost: number
  fuelEntries: number
  openWo: number
  urgentWorkOrders: number
  pendingOps: number
  expiring: number
  readiness: number
  fuelEntriesInPeriod: number
  maintenanceCost: number
  hours: number
  downtime: number
  workOrderCount: number
  avgHours: number
  avgFuel: number
  activeProjects: number
  priorityCount: number
  monthlyCost: Array<{ label: string; value: number; secondary?: number }>
  healthSegments: Array<{ label: string; value: number }>
  projectRows: Array<Project & { count: number }>
  recentWo: WorkOrder[]
  assetUsage: Array<{ label: string; hours: number; down: number }>
  watchlist: Array<{ id: string; name: string; code?: string; reason: string; status: string; tone: 'amber' | 'purple' | 'red'; icon: typeof ShieldCheck; route: string }>
}

function buildDashboardSnapshot(assets: Asset[], fuelOps: FuelOperation[], workOrders: WorkOrder[], operations: Operation[], projects: Project[], period: DashboardPeriod): DashboardSnapshot {
  const totalAssets = assets.length
  const activeCount = assets.filter(asset => asset.status === 'يعمل' || asset.status === 'مخصص لمشروع').length
  const available = assets.filter(asset => asset.status === 'متاح').length
  const maintenance = assets.filter(asset => ['تحت الصيانة', 'بانتظار الإصلاح', 'بانتظار الفحص', 'خارج الخدمة'].includes(asset.status)).length
  const maintenanceCritical = assets.filter(asset => ['تحت الصيانة', 'بانتظار الإصلاح', 'بانتظار الفحص'].includes(asset.status)).length
  const recentFuel = fuelOps.filter(item => item.type === 'صرف' && withinDays(item.date, period)).filter(item => item.status === 'معتمد')
  const recentOperations = operations.filter(item => item.status === 'معتمد' && withinDays(item.date, period))
  const recentWorkOrders = workOrders.filter(item => withinDays(item.opened, period))
  const fuelCost = sum(recentFuel.map(item => Number(item.total || 0)))
  const maintenanceCost = sum(recentWorkOrders.map(item => Number(item.laborCost || 0) + Number(item.partsCost || 0) + Number(item.vendorCost || 0)))
  const hours = sum(recentOperations.map(item => Number(item.hours || 0)))
  const downtime = sum(recentOperations.map(item => Number(item.down || 0)))
  const openWo = workOrders.filter(item => !['مكتمل', 'ملغى'].includes(item.status)).length
  const urgentWorkOrders = workOrders.filter(item => !['مكتمل', 'ملغى'].includes(item.status) && item.prio === 'عاجلة').length
  const pendingOps = operations.filter(item => item.status === 'مقدمة').length
  const expiring = assets.filter(asset => asset.lic && daysTo(asset.lic) >= 0 && daysTo(asset.lic) <= 30).length
  const readiness = totalAssets ? Math.round(((activeCount + available) / totalAssets) * 100) : 0
  const avgHours = totalAssets ? hours / totalAssets : 0
  const avgFuel = activeCount ? fuelCost / activeCount : 0
  const activeProjects = projects.filter(project => project.status === 'نشط').length
  const priorityCount = expiring + maintenanceCritical + urgentWorkOrders + pendingOps
  const watchlist = assets.map(asset => {
    const expiry = asset.lic ? daysTo(asset.lic) : Infinity
    const urgentForAsset = workOrders.some(order => !['مكتمل', 'ملغى'].includes(order.status) && order.prio === 'عاجلة' && sameReference(order.asset, asset))
    if (expiry >= 0 && expiry <= 30) return { id: asset.id, name: asset.name, code: asset.code, reason: `استحقاق خلال ${Math.max(0, expiry)} يوم`, status: 'استحقاق', tone: 'amber' as const, icon: ShieldCheck, route: 'assets' }
    if (['تحت الصيانة', 'بانتظار الإصلاح', 'بانتظار الفحص'].includes(asset.status)) return { id: asset.id, name: asset.name, code: asset.code, reason: 'الأصل يحتاج متابعة صيانة', status: 'صيانة', tone: 'purple' as const, icon: Wrench, route: 'maintenance' }
    if (urgentForAsset) return { id: asset.id, name: asset.name, code: asset.code, reason: 'مرتبط بأمر عمل عاجل', status: 'عاجل', tone: 'red' as const, icon: ClipboardCheck, route: 'maintenance' }
    return null
  }).filter((item): item is NonNullable<typeof item> => Boolean(item)).slice(0, 5)

  const assetProjectCounts = new Map<string, number>()
  for (const asset of assets) {
    const key = String(asset.proj ?? '').trim()
    if (key) assetProjectCounts.set(key, (assetProjectCounts.get(key) ?? 0) + 1)
  }
  const projectRows = projects.map(project => ({ ...project, count: assetProjectCounts.get(String(project.id)) ?? assetProjectCounts.get(String(project.code ?? '')) ?? 0 })).filter(project => project.count > 0).sort((a, b) => b.count - a.count).slice(0, 7)
  const recentWo = [...workOrders].sort((a, b) => b.opened.localeCompare(a.opened)).slice(0, 6)
  const assetUsageIndex = new Map<string, { hours: number; down: number }>()
  for (const operation of recentOperations) {
    const key = String(operation.assetId ?? '').trim()
    if (!key) continue
    const current = assetUsageIndex.get(key) ?? { hours: 0, down: 0 }
    current.hours += Number(operation.hours || 0)
    current.down += Number(operation.down || 0)
    assetUsageIndex.set(key, current)
  }
  const assetUsage = assets.map(asset => {
    const current = assetUsageIndex.get(String(asset.id)) ?? { hours: 0, down: 0 }
    return { label: asset.name, hours: current.hours, down: current.down }
  }).filter(item => item.hours > 0 || item.down > 0).sort((a, b) => (b.hours + b.down) - (a.hours + a.down)).slice(0, 7)

  const monthlyCost = buildMonthlyCost(fuelOps, workOrders, period)

  return {
    totalAssets,
    activeCount,
    active: totalAssets ? Math.round((activeCount / totalAssets) * 100) : 0,
    available,
    maintenance,
    maintenanceCritical,
    fuelCost,
    fuelEntries: recentFuel.length,
    fuelEntriesInPeriod: recentFuel.length,
    openWo,
    urgentWorkOrders,
    pendingOps,
    expiring,
    readiness,
    maintenanceCost,
    hours,
    downtime,
    workOrderCount: recentWorkOrders.length,
    avgHours,
    avgFuel,
    activeProjects,
    priorityCount,
    monthlyCost,
    healthSegments: [
      { label: 'عاملة / مخصصة', value: activeCount },
      { label: 'متاحة', value: available },
      { label: 'تحت الصيانة', value: maintenance },
      { label: 'أخرى', value: Math.max(0, totalAssets - activeCount - available - maintenance) },
    ],
    projectRows,
    recentWo,
    assetUsage,
    watchlist,
  }
}

function buildMonthlyCost(fuelOps: FuelOperation[], workOrders: WorkOrder[], period: DashboardPeriod) {
  const now = new Date()
  const makeLabel = (date: Date, mode: 'week' | 'half' | 'month') => {
    if (mode === 'month') return new Intl.DateTimeFormat(APP_LOCALE, { month: 'short' }).format(date)
    if (mode === 'week') return new Intl.DateTimeFormat(APP_LOCALE, { day: '2-digit', month: 'short' }).format(date)
    return new Intl.DateTimeFormat(APP_LOCALE, { day: '2-digit', month: 'short' }).format(date)
  }
  const mode: 'week' | 'half' | 'month' = period === 30 ? 'week' : period === 90 ? 'half' : 'month'
  const bucketCount = period === 30 ? 5 : 6
  const bucketDays = period === 30 ? 6 : period === 90 ? 15 : 30
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const end = new Date(now)
    end.setHours(23, 59, 59, 999)
    end.setDate(end.getDate() - ((bucketCount - 1 - index) * bucketDays))
    const start = new Date(end)
    start.setDate(start.getDate() - (bucketDays - 1))
    if (index === bucketCount - 1) end.setTime(now.getTime())
    return { start, end, label: makeLabel(start, mode) }
  })
  const inBucket = (value: string, bucket: { start: Date; end: Date }) => {
    const time = new Date(value).getTime()
    return Number.isFinite(time) && time >= bucket.start.getTime() && time <= bucket.end.getTime()
  }
  return buckets.map(bucket => ({
    label: bucket.label,
    value: sum(fuelOps.filter(item => item.type === 'صرف' && item.status === 'معتمد' && inBucket(item.date, bucket)).map(item => Number(item.total || 0))),
    secondary: sum(workOrders.filter(item => inBucket(item.opened, bucket)).map(item => Number(item.laborCost || 0) + Number(item.partsCost || 0) + Number(item.vendorCost || 0))),
  }))
}

const sum = (values: number[]) => values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0)
const withinDays = (value: string, days: number) => { const time = new Date(value).getTime(); return Number.isFinite(time) && (Date.now() - time) / 86400000 >= 0 && (Date.now() - time) / 86400000 <= days }
const daysTo = (value: string) => Math.ceil((new Date(value).getTime() - Date.now()) / 86400000)
const fmt = (value: number) => new Intl.NumberFormat(APP_LOCALE, { maximumFractionDigits: 1, numberingSystem: 'latn' }).format(Number(value || 0))
const periodLabelShort = (period: DashboardPeriod) => period === 30 ? '30 يوم' : period === 90 ? '90 يوم' : '6 أشهر'
