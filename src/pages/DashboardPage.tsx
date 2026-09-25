import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, Boxes, CircleCheckBig, ClipboardCheck, Fuel, Gauge, ShieldCheck, Settings, Truck, Wrench } from 'lucide-react'
import type { Asset, FuelOperation, Operation, Project, WorkOrder } from '../types/tfms'
import { Button, Card, ChartShell, AnalyticsBarChart, AnalyticsDonut, AnalyticsDualBars, AnalyticsLineChart, MetricCard, StatusBadge, DataTable } from '../components/ui'
import { ReferenceValue } from '../components/ReferenceValue'
import { sameReference } from '../utils/referenceLabels'
import { useCurrency } from '../features/settings'

import { APP_LOCALE } from '../shared/formatters/locale'
type DashboardPeriod = 30 | 90 | 180

export function DashboardPage({ assets, projects, workOrders, fuelOps, operations, onRoute }: { assets: Asset[]; projects: Project[]; workOrders: WorkOrder[]; fuelOps: FuelOperation[]; operations: Operation[]; onRoute: (route: string) => void }) {
  const { formatMoney } = useCurrency()
  const [period, setPeriod] = useState<DashboardPeriod>(30)

  const dashboard = useMemo(() => buildDashboardSnapshot(assets, fuelOps, workOrders, operations, projects, period), [assets, fuelOps, workOrders, operations, projects, period])
  const active = dashboard.active
  const maintenance = dashboard.maintenance
  const available = dashboard.available
  const expiring = dashboard.expiring
  const openWo = dashboard.openWo
  const pendingOps = dashboard.pendingOps

  return <div className="dashboard-page">
    <header className="dashboard-page-header">
      <div className="dashboard-page-header__copy">
        <div className="dashboard-page-header__eyebrow"><Gauge size={15} /> مركز التشغيل</div>
        <h1>لوحة المعلومات</h1>
        <p>ملخص تنفيذي لحالة الأسطول، الصيانة، التشغيل، الوقود، والمشروعات.</p>
      </div>
      <div className="dashboard-page-header__actions">
        <div className="dashboard-period-control" role="group" aria-label="نطاق المؤشرات">
          <span>النطاق</span>
          {([30, 90, 180] as const).map(value => <button key={value} type="button" className={period === value ? 'active' : ''} aria-pressed={period === value} onClick={() => setPeriod(value)}>{value === 30 ? '30 يوم' : value === 90 ? '90 يوم' : '6 أشهر'}</button>)}
        </div>
        <Button variant="secondary" icon={<Truck size={16} />} onClick={() => onRoute('assets')}>عرض الأصول</Button>
        <Button icon={<Settings size={16} />} onClick={() => onRoute('reports')}>مركز التقارير</Button>
      </div>
    </header>

    <section className="dashboard-command-strip" aria-label="ملخص الحالة التشغيلية">
      <div className="dashboard-command-lead">
        <span className="dashboard-command-kicker"><ShieldCheck size={14} /> قراءة تشغيلية</span>
        <strong>{dashboard.totalAssets ? `${dashboard.readiness}% جاهزية التشغيل` : 'لا توجد بيانات كافية'}</strong>
        <small>{periodLabel(period)} · الحالة الحالية للأصول والصيانة والوقود.</small>
      </div>
      <div className={`dashboard-signal ${dashboard.priorityCount > 0 ? 'is-alert' : 'is-clear'}`}>
        {dashboard.priorityCount > 0 ? <AlertTriangle size={17} /> : <CircleCheckBig size={17} />}
        <span>{dashboard.priorityCount > 0 ? `${dashboard.priorityCount} تحتاج متابعة` : 'مستقر'}</span>
      </div>
      <button className="dashboard-command-link" onClick={() => onRoute('alerts')}>التنبيهات <ArrowLeft size={15} /></button>
    </section>

    <section className="dashboard-hero" aria-label="ملخص الجاهزية">
      <div className="dashboard-hero-main">
        <div className="dashboard-hero-header">
          <span className="dashboard-hero-kicker">جاهزية التشغيل</span>
          <span className="dashboard-hero-badge">{dashboard.readiness}%</span>
        </div>
        <h3>{dashboard.totalAssets ? `نسبة جاهزية الأسطول ${dashboard.readiness}%` : 'لا توجد بيانات كافية'}</h3>
        <p>{dashboard.totalAssets ? `${fmt(dashboard.activeCount)} أصل يعمل الآن و${fmt(dashboard.available)} أصل متاح، مع ${fmt(dashboard.maintenance)} أصل قيد المتابعة.` : 'سيتوفر المؤشر فور توفر بيانات الأصول.'}</p>
        <div className="dashboard-hero-progress" aria-hidden="true">
          <span style={{ width: `${Math.max(6, Math.min(100, dashboard.readiness))}%` }} />
        </div>
      </div>
      <div className="dashboard-mini-stats">
        <div className="dashboard-mini-stat">
          <span>المشروعات النشطة</span>
          <strong>{fmt(dashboard.activeProjects)}</strong>
        </div>
        <div className="dashboard-mini-stat">
          <span>أوامر العمل المفتوحة</span>
          <strong>{fmt(openWo)}</strong>
        </div>
        <div className="dashboard-mini-stat">
          <span>تكلفة الوقود</span>
          <strong>{formatMoney(dashboard.fuelCost)}</strong>
        </div>
      </div>
    </section>

    <div className="metric-grid dashboard-metrics">
      <MetricCard label="الأصول" value={fmt(dashboard.totalAssets)} meta={`عاملة ${fmt(active)} · متاحة ${fmt(available)}`} icon={Boxes} />
      <MetricCard label="نسبة التشغيل" value={`${fmt(active)}%`} meta={`${fmt(dashboard.activeCount)} أصل يعمل الآن`} icon={CircleCheckBig} tone="green" />
      <MetricCard label="صيانة" value={fmt(maintenance)} meta={`${fmt(dashboard.maintenanceCritical)} متابعة`} icon={Wrench} tone="purple" />
      <MetricCard label={`صرف الوقود · ${periodLabelShort(period)}`} value={formatMoney(dashboard.fuelCost)} meta={`${fmt(dashboard.fuelEntries)} عملية معتمدة`} icon={Fuel} tone="amber" />
      <MetricCard label="أوامر مفتوحة" value={fmt(openWo)} meta={`${fmt(dashboard.urgentWorkOrders)} عاجلة`} icon={ClipboardCheck} tone="rose" />
      <MetricCard label="استحقاقات قريبة" value={fmt(expiring)} meta="خلال 30 يومًا" icon={Gauge} tone="blue" />
    </div>

    <div className="dashboard-analytics-grid">
      <ChartShell title="اتجاه التكلفة" description={period === 30 ? 'آخر 30 يومًا — مجمعة أسبوعيًا' : period === 90 ? 'آخر 90 يومًا — مجمعة نصف شهريًا' : 'آخر 6 أشهر — مجمعة شهريًا'}>
        <AnalyticsLineChart points={dashboard.monthlyCost} valueSuffix=" ج.م" secondarySuffix=" ج.م" primaryLabel="الوقود" secondaryLabel="الصيانة" height={260} />
        <div className="analytics-insight-strip">
          <div><span>إجمالي الوقود</span><strong>{formatMoney(dashboard.fuelCost)}</strong></div>
          <div><span>تكلفة الصيانة</span><strong>{formatMoney(dashboard.maintenanceCost)}</strong></div>
          <div><span>ساعات التشغيل</span><strong>{fmt(dashboard.hours)}</strong></div>
          <div><span>أوامر العمل</span><strong>{fmt(dashboard.workOrderCount)}</strong></div>
        </div>
      </ChartShell>
      <ChartShell title="جاهزية الأسطول" description="توزيع الأصول حسب الحالة الحالية">
        <AnalyticsDonut segments={dashboard.healthSegments} centerValue={fmt(dashboard.totalAssets)} centerLabel="إجمالي أصل" />
      </ChartShell>
    </div>

    <div className="dashboard-secondary-grid">
      <ChartShell title="الأصول حسب المشروع" description="المشروعات الأعلى في الأصول المرتبطة" action={<Button variant="ghost" size="sm" onClick={() => onRoute('projects')}>كل المشروعات</Button>}>
        {dashboard.projectRows.length ? <AnalyticsBarChart points={dashboard.projectRows.map(project => ({ label: project.name, value: project.count }))} valueSuffix=" أصل" limit={7} /> : <DashboardEmpty message="لا توجد بيانات مشروعات كافية للتحليل." onRoute={() => onRoute('projects')} action="فتح المشروعات" />}
      </ChartShell>
      <ChartShell title="الاستخدام مقابل التوقف" description="ساعات التشغيل والتوقف للأصول ذات السجلات المعتمدة">
        <AnalyticsDualBars points={dashboard.assetUsage.map(item => ({ label: item.label, value: item.hours, secondary: item.down }))} firstLabel="التشغيل" secondLabel="التوقف" />
      </ChartShell>
    </div>

    <div className="dashboard-operational-grid">
      <Card title="قائمة المتابعة" description={`${fmt(dashboard.priorityCount)} مؤشر يحتاج مراجعة`} action={<AlertTriangle size={18} className="warning-icon" />}>
        <div className="dashboard-watchlist">
          {dashboard.watchlist.map(item => <button key={item.id} type="button" onClick={() => onRoute(item.route)} className="dashboard-watch-row">
            <span className={`priority-icon ${item.tone}`}><item.icon size={16} /></span>
            <span className="dashboard-watch-copy"><strong>{item.name}</strong><small>{item.reason}{item.code ? ` · ${item.code}` : ''}</small></span>
            <StatusBadge tone={item.tone === 'red' ? 'red' : item.tone === 'amber' ? 'amber' : 'blue'}>{item.status}</StatusBadge>
          </button>)}
          {pendingOps > 0 && <button type="button" onClick={() => onRoute('operations')} className="dashboard-watch-row"><span className="priority-icon blue"><Gauge size={16} /></span><span className="dashboard-watch-copy"><strong>{fmt(pendingOps)} سجل تشغيلي</strong><small>بانتظار الاعتماد</small></span><StatusBadge tone="blue">اعتماد</StatusBadge></button>}
          {!dashboard.priorityCount && <div className="dashboard-clear-state"><CircleCheckBig size={22} /><div><strong>الحالة مستقرة</strong><small>لا توجد عناصر تحتاج متابعة عاجلة.</small></div></div>}
        </div>
      </Card>

      <Card title="مؤشرات التشغيل" description={periodLabel(period)} span2 action={<Settings size={18} className="muted-icon" />}>
        <div className="dashboard-insight-list dashboard-insight-list-rich">
          <div className="dashboard-insight"><span>جاهزية</span><strong>{fmt(dashboard.readiness)}%</strong><small>تشغيل + متاح</small></div>
          <div className="dashboard-insight"><span>ساعات التشغيل</span><strong>{fmt(dashboard.avgHours)}</strong><small>متوسط لكل أصل</small></div>
          <div className="dashboard-insight"><span>وقود / أصل</span><strong>{formatMoney(dashboard.avgFuel)}</strong><small>متوسط التكلفة</small></div>
          <div className="dashboard-insight"><span>توقف</span><strong>{fmt(dashboard.downtime)}</strong><small>ساعات مسجلة</small></div>
          <div className="dashboard-insight"><span>مشروعات</span><strong>{fmt(dashboard.activeProjects)}</strong><small>نشطة</small></div>
          <div className="dashboard-insight"><span>أوامر</span><strong>{fmt(dashboard.workOrderCount)}</strong><small>في الفترة</small></div>
        </div>
      </Card>

      <Card title="آخر أوامر العمل" description="أحدث السجلات المسجلة" action={<Button variant="ghost" size="sm" onClick={() => onRoute('maintenance')}>فتح الوحدة</Button>} noPadding>
        <DataTable
          rows={dashboard.recentWo}
          columns={[
            { id: 'asset', header: 'الأصل', sortValue: workOrder => String(workOrder.asset ?? ''), render: workOrder => <ReferenceValue field="asset" value={workOrder.asset} lookups={{ assets }} /> },
            { id: 'project', header: 'المشروع', sortValue: workOrder => String(workOrder.proj ?? ''), render: workOrder => <ReferenceValue field="proj" value={workOrder.proj} lookups={{ projects }} /> },
            { id: 'type', header: 'نوع العمل', sortValue: workOrder => workOrder.type, render: workOrder => workOrder.type },
            { id: 'status', header: 'الحالة', sortValue: workOrder => workOrder.status, render: workOrder => <StatusBadge dot>{workOrder.status}</StatusBadge> },
            { id: 'opened', header: 'التاريخ', sortValue: workOrder => workOrder.opened, render: workOrder => fmtDate(workOrder.opened) },
          ]}
          rowKey={workOrder => workOrder.id}
          pageSize={6}
          searchPlaceholder="بحث في أوامر العمل..."
        />
      </Card>
    </div>
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
    if (index === bucketCount - 1) {
      end.setTime(now.getTime())
    }
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

function DashboardEmpty({ message, action, onRoute }: { message: string; action: string; onRoute: () => void }) {
  return <div className="dashboard-empty-action"><strong>{message}</strong><Button variant="secondary" size="sm" onClick={onRoute}>{action}</Button></div>
}

const sum = (values: number[]) => values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0)
const withinDays = (value: string, days: number) => { const time = new Date(value).getTime(); return Number.isFinite(time) && (Date.now() - time) / 86400000 >= 0 && (Date.now() - time) / 86400000 <= days }
const daysTo = (value: string) => Math.ceil((new Date(value).getTime() - Date.now()) / 86400000)
const fmt = (value: number) => new Intl.NumberFormat(APP_LOCALE, { maximumFractionDigits: 1 }).format(Number(value || 0))
const fmtDate = (value: string) => value ? new Intl.DateTimeFormat(APP_LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value)) : '—'
const periodLabel = (period: DashboardPeriod) => period === 30 ? 'آخر 30 يومًا' : period === 90 ? 'آخر 90 يومًا' : 'آخر 6 أشهر'
const periodLabelShort = (period: DashboardPeriod) => period === 30 ? '30 يوم' : period === 90 ? '90 يوم' : '6 أشهر'
