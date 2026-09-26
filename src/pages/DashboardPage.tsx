import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, Boxes, CircleCheckBig, ClipboardCheck, Fuel, Gauge, ShieldCheck, Truck, Wrench } from 'lucide-react'
import type { Asset, FuelOperation, Operation, Project, WorkOrder } from '../types/tfms'
import { Button, Card, ChartShell, AnalyticsDonut, AnalyticsLineChart, StatusBadge } from '../components/ui'
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

  return <div className="dashboard-page dashboard-page--executive dashboard-page--adlike">
    <section className="dashboard-ad-hero" aria-label="KEMEX الرئيسية">
      <div className="dashboard-ad-copy">
        <span className="dashboard-ad-kicker">KEMEX · منصة إدارة اللوجستيات والعمليات</span>
        <h1>إدارة أذكى ..<br /><em>تشغيل أقوى</em></h1>
        <p>كل ما تحتاجه لإدارة أسطولك وأصولك وعملياتك وتكاليفك في منصة واحدة، برؤية تشغيلية واضحة وسريعة.</p>
        <div className="dashboard-ad-actions">
          <Button icon={<Truck size={17} />} onClick={() => onRoute('assets')}>الأسطول والأصول</Button>
          <Button variant="secondary" icon={<Gauge size={17} />} onClick={() => onRoute('operations-center')}>مركز التحكم</Button>
        </div>
        <div className="dashboard-ad-trust">
          <span><ShieldCheck size={15} /> تحكم متكامل</span>
          <span><CircleCheckBig size={15} /> بيانات تشغيلية مباشرة</span>
        </div>
      </div>

      <div className="dashboard-device-preview" aria-label="ملخص تشغيلي مباشر">
        <div className="dashboard-device-topbar">
          <div><strong>لوحة القيادة</strong><small>KEMEX Operations</small></div>
          <span className="dashboard-live-dot"><i /> مباشر</span>
        </div>
        <div className="dashboard-preview-kpis">
          <article><span>الأصول</span><strong>{fmt(dashboard.totalAssets)}</strong><small>{fmt(dashboard.activeCount)} تعمل</small></article>
          <article><span>الجاهزية</span><strong>{fmt(dashboard.readiness)}%</strong><small>{fmt(available)} متاحة</small></article>
          <article><span>الرحلات</span><strong>{fmt(dashboard.pendingOps)}</strong><small>تشغيل/اعتماد</small></article>
          <article><span>الصيانة</span><strong>{fmt(openWo)}</strong><small>{fmt(dashboard.urgentWorkOrders)} عاجلة</small></article>
        </div>
        <div className="dashboard-preview-panels">
          <div className="dashboard-preview-chart">
            <div className="dashboard-preview-panel-head"><span>اتجاه التشغيل والتكلفة</span><small>{periodLabelShort(period)}</small></div>
            <AnalyticsLineChart points={dashboard.monthlyCost} height={150} primaryLabel="الوقود" secondaryLabel="الصيانة" />
          </div>
          <div className="dashboard-preview-health">
            <div className="dashboard-preview-panel-head"><span>حالة الأسطول</span><small>اليوم</small></div>
            <AnalyticsDonut segments={dashboard.healthSegments} centerValue={fmt(dashboard.totalAssets)} centerLabel="أصل" />
          </div>
        </div>
      </div>

      <div className="dashboard-ad-glow dashboard-ad-glow--one" />
      <div className="dashboard-ad-glow dashboard-ad-glow--two" />
      <div className="dashboard-ad-diagonal" />
    </section>

    <section className="dashboard-quick-strip" aria-label="العمليات السريعة">
      <div className="dashboard-quick-strip__title">
        <span>ابدأ من هنا</span>
        <h2>العمليات السريعة</h2>
        <p>الوصول المباشر لأكثر المهام استخدامًا.</p>
      </div>
      <div className="dashboard-quick-strip__grid">
        <button type="button" onClick={() => onRoute('assets')}><span><Truck size={21} /></span><strong>الأسطول والأصول</strong><small>المتابعة والتخصيص</small></button>
        <button type="button" onClick={() => onRoute('operations')}><span><Gauge size={21} /></span><strong>التشغيل والرحلات</strong><small>العمليات والاعتمادات</small></button>
        <button type="button" onClick={() => onRoute('maintenance')}><span><Wrench size={21} /></span><strong>الصيانة</strong><small>الأعطال وأوامر العمل</small></button>
        <button type="button" onClick={() => onRoute('reports')}><span><ClipboardCheck size={21} /></span><strong>التقارير والتحليلات</strong><small>التكلفة والأداء</small></button>
      </div>
      <button type="button" className="dashboard-quick-cta" onClick={() => onRoute('operations-center')}>افتح مركز التحكم <ArrowLeft size={17} /></button>
    </section>

    <section className="dashboard-details" aria-label="تفاصيل التشغيل">
      <div className="dashboard-details-head">
        <div><span>تفاصيل التشغيل</span><h2>الصورة الكاملة لعملياتك</h2><p>قراءة مختصرة للتكلفة وحالة الموارد والأولويات.</p></div>
        <div className="dashboard-period-switch" role="group" aria-label="نطاق المؤشرات">
          {([30, 90, 180] as const).map(value => <button key={value} type="button" className={period === value ? 'active' : ''} aria-pressed={period === value} onClick={() => setPeriod(value)}>{value === 30 ? '30 يوم' : value === 90 ? '90 يوم' : '6 أشهر'}</button>)}
        </div>
      </div>

      <div className="dashboard-detail-grid">
        <ChartShell title="اتجاه تكلفة التشغيل" description={period === 30 ? 'آخر 30 يومًا' : period === 90 ? 'آخر 90 يومًا' : 'آخر 6 أشهر'} action={<Button variant="ghost" size="sm" onClick={() => onRoute('reports')}>التفاصيل</Button>}>
          <AnalyticsLineChart points={dashboard.monthlyCost} valueSuffix=" ج.م" secondarySuffix=" ج.م" primaryLabel="الوقود" secondaryLabel="الصيانة" height={230} />
          <div className="dashboard-cost-summary"><div><span>الوقود</span><strong>{formatMoney(dashboard.fuelCost)}</strong></div><div><span>الصيانة</span><strong>{formatMoney(dashboard.maintenanceCost)}</strong></div></div>
        </ChartShell>

        <Card title="حالة الأصول" description="التوزيع الحالي للموارد" action={<Button variant="ghost" size="sm" onClick={() => onRoute('assets')}>فتح الأصول</Button>}>
          <AnalyticsDonut segments={dashboard.healthSegments} centerValue={fmt(dashboard.totalAssets)} centerLabel="إجمالي أصل" />
        </Card>

        <Card title="الأولويات الآن" description={dashboard.priorityCount ? 'العناصر التي تحتاج متابعة' : 'الوضع الحالي مستقر'} action={<AlertTriangle size={18} className="warning-icon" />}>
          <div className="dashboard-priority-list">
            {dashboard.watchlist.slice(0, 4).map(item => <button key={item.id} type="button" onClick={() => onRoute(item.route)} className="dashboard-priority-row">
              <span className={`priority-icon ${item.tone}`}><item.icon size={16} /></span>
              <span><strong>{item.name}</strong><small>{item.reason}{item.code ? ` · ${item.code}` : ''}</small></span>
              <StatusBadge tone={item.tone === 'red' ? 'red' : item.tone === 'amber' ? 'amber' : 'blue'}>{item.status}</StatusBadge>
            </button>)}
            {pendingOps > 0 && <button type="button" onClick={() => onRoute('operations')} className="dashboard-priority-row"><span className="priority-icon blue"><Gauge size={16} /></span><span><strong>{fmt(pendingOps)} سجل تشغيلي</strong><small>بانتظار الاعتماد</small></span><StatusBadge tone="blue">اعتماد</StatusBadge></button>}
            {!dashboard.priorityCount && <div className="dashboard-clear-state"><CircleCheckBig size={22} /><div><strong>لا توجد نقاط حرجة</strong><small>كل شيء مستقر في البيانات الحالية.</small></div></div>}
          </div>
        </Card>
      </div>

      <div className="dashboard-bottom-strip">
        <div><span>المشروعات النشطة</span><strong>{fmt(dashboard.activeProjects)}</strong></div>
        <div><span>ساعات التشغيل</span><strong>{fmt(dashboard.hours)}</strong></div>
        <div><span>ساعات التوقف</span><strong>{fmt(dashboard.downtime)}</strong></div>
        <div><span>استحقاقات قريبة</span><strong>{fmt(expiring)}</strong></div>
      </div>
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
