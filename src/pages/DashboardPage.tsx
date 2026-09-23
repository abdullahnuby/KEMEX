import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, Boxes, CircleCheckBig, ClipboardCheck, Fuel, Gauge, ShieldCheck, Settings, Truck, Wrench } from 'lucide-react'
import type { Asset, FuelOperation, Operation, Project, WorkOrder } from '../types/tfms'
import { Button, Card, ChartShell, AnalyticsBarChart, AnalyticsDonut, AnalyticsDualBars, AnalyticsLineChart, MetricCard, PageHeader, StatusBadge, DataTable } from '../components/ui'
import { ReferenceValue } from '../components/ReferenceValue'
import { sameReference } from '../utils/referenceLabels'
import { useCurrency } from '../features/settings'

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
    <PageHeader
      title="لوحة المعلومات"
      description="مركز القيادة التشغيلي لحالة الأصول والصيانة والوقود والتوقف والتكاليف والتنبيهات."
      meta={<div className="eyebrow"><Gauge size={14} /> مركز التشغيل والتحليل</div>}
      action={<div className="reference-header-actions dashboard-header-actions"><div className="dashboard-period-switch" aria-label="الفترة التحليلية">{([30, 90, 180] as const).map(value => <button key={value} className={period === value ? 'active' : ''} onClick={() => setPeriod(value)}>{value === 30 ? '30 يوم' : value === 90 ? '90 يوم' : '6 أشهر'}</button>)}</div><Button variant="secondary" icon={<Truck size={16} />} onClick={() => onRoute('assets')}>عرض الأصول</Button><Button icon={<Settings size={16} />} onClick={() => onRoute('reports')}>مركز التقارير</Button></div>}
    />

    <section className="dashboard-command-strip" aria-label="ملخص الحالة التشغيلية">
      <div className="dashboard-command-lead">
        <span className="dashboard-command-kicker"><ShieldCheck size={14} /> قراءة تشغيلية</span>
        <strong>{dashboard.totalAssets ? `${dashboard.readiness}% من الأصول في حالة تشغيل أو جاهزية` : 'لا توجد أصول كافية لإعداد مؤشر الجاهزية'}</strong>
        <small>{periodLabel(period)} · يعتمد المؤشر على الحالة الحالية للأصول وسجلات التشغيل والصيانة المتاحة.</small>
      </div>
      <div className={`dashboard-signal ${dashboard.priorityCount > 0 ? 'is-alert' : 'is-clear'}`}>
        {dashboard.priorityCount > 0 ? <AlertTriangle size={17} /> : <CircleCheckBig size={17} />}
        <span>{dashboard.priorityCount > 0 ? `${dashboard.priorityCount} أولوية تشغيلية` : 'لا توجد أولوية حرجة'}</span>
      </div>
      <button className="dashboard-command-link" onClick={() => onRoute('alerts')}>فتح التنبيهات <ArrowLeft size={15} /></button>
    </section>

    <div className="metric-grid dashboard-metrics">
      <MetricCard label="إجمالي الأصول" value={fmt(dashboard.totalAssets)} meta={`عاملة ${fmt(active)} · متاحة ${fmt(available)}`} icon={Boxes} />
      <MetricCard label="الأصول العاملة" value={`${fmt(active)}%`} meta={`${fmt(dashboard.activeCount)} أصل يعمل الآن`} icon={CircleCheckBig} tone="green" />
      <MetricCard label="تحت الصيانة" value={fmt(maintenance)} meta={`${fmt(dashboard.maintenanceCritical)} حالة تحتاج متابعة`} icon={Wrench} tone="purple" />
      <MetricCard label={`وقود آخر ${periodLabelShort(period)}`} value={formatMoney(dashboard.fuelCost)} meta={`${fmt(dashboard.fuelEntries)} عملية صرف`} icon={Fuel} tone="amber" />
      <MetricCard label="أوامر العمل المفتوحة" value={fmt(openWo)} meta={`${fmt(dashboard.urgentWorkOrders)} حالة عاجلة`} icon={ClipboardCheck} tone="rose" />
      <MetricCard label="استحقاقات قريبة" value={fmt(expiring)} meta="رخص / مستندات خلال 30 يومًا" icon={Gauge} tone="blue" />
    </div>

    <div className="dashboard-analytics-grid">
      <ChartShell title="تكلفة الوقود والصيانة" description="القيم الشهرية في آخر 6 أشهر من السجلات المتاحة">
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
      <Card title="الأولويات الآن" description="إشارات تستحق الإجراء قبل متابعة التشغيل" action={<AlertTriangle size={18} className="warning-icon" />}>
        <div className="dashboard-priority-list">
          {expiring > 0 && <button onClick={() => onRoute('assets')} className="dashboard-priority-row"><span className="priority-icon amber"><ShieldCheck size={16} /></span><span><strong>{fmt(expiring)} أصل</strong><small>رخصة أو مستند ينتهي خلال 30 يومًا</small></span><StatusBadge tone="amber">مراجعة</StatusBadge></button>}
          {dashboard.maintenanceCritical > 0 && <button onClick={() => onRoute('maintenance')} className="dashboard-priority-row"><span className="priority-icon purple"><Wrench size={16} /></span><span><strong>{fmt(dashboard.maintenanceCritical)} أصل</strong><small>تحت الصيانة أو بانتظار إصلاح / فحص</small></span><StatusBadge tone="blue">صيانة</StatusBadge></button>}
          {dashboard.urgentWorkOrders > 0 && <button onClick={() => onRoute('maintenance')} className="dashboard-priority-row"><span className="priority-icon red"><ClipboardCheck size={16} /></span><span><strong>{fmt(dashboard.urgentWorkOrders)} أمر عمل</strong><small>بحاجة إلى متابعة عاجلة</small></span><StatusBadge tone="rose">عاجل</StatusBadge></button>}
          {pendingOps > 0 && <button onClick={() => onRoute('operations')} className="dashboard-priority-row"><span className="priority-icon blue"><Gauge size={16} /></span><span><strong>{fmt(pendingOps)} سجل تشغيل</strong><small>بانتظار اعتماد أو مراجعة</small></span><StatusBadge tone="blue">اعتماد</StatusBadge></button>}
          {!dashboard.priorityCount && <div className="dashboard-clear-state"><CircleCheckBig size={22} /><div><strong>العمليات مستقرة</strong><small>لا توجد أولوية حرجة ضمن البيانات الحالية.</small></div></div>}
        </div>
      </Card>

      <Card title="مؤشرات التشغيل" description={`ملخص تنفيذي للفترة المحددة: ${periodLabel(period)}`} span2 action={<Settings size={18} className="muted-icon" />}>
        <div className="dashboard-insight-list dashboard-insight-list-rich">
          <div className="dashboard-insight"><span>نسبة الجاهزية</span><strong>{fmt(dashboard.readiness)}%</strong><small>تشغيل + متاح من إجمالي الأصول</small></div>
          <div className="dashboard-insight"><span>متوسط ساعات التشغيل لكل أصل</span><strong>{fmt(dashboard.avgHours)}</strong><small>خلال الفترة التحليلية</small></div>
          <div className="dashboard-insight"><span>تكلفة الوقود لكل أصل عامل</span><strong>{formatMoney(dashboard.avgFuel)}</strong><small>اعتمادًا على المصروفات المعتمدة</small></div>
          <div className="dashboard-insight"><span>إجمالي التوقف</span><strong>{fmt(dashboard.downtime)}</strong><small>ساعات مسجلة ضمن التشغيل المعتمد</small></div>
          <div className="dashboard-insight"><span>المشروعات النشطة</span><strong>{fmt(dashboard.activeProjects)}</strong><small>مشروعًا ظاهرًا في النظام</small></div>
          <div className="dashboard-insight"><span>أوامر العمل في الفترة</span><strong>{fmt(dashboard.workOrderCount)}</strong><small>بما في ذلك المكتمل والمفتوح</small></div>
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

  const monthlyCost = buildMonthlyCost(fuelOps, workOrders)

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
  }
}

function buildMonthlyCost(fuelOps: FuelOperation[], workOrders: WorkOrder[]) {
  const months = Array.from({ length: 6 }, (_, index) => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - (5 - index))
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: new Intl.DateTimeFormat('ar-EG', { month: 'short' }).format(d) }
  })
  return months.map(month => ({
    label: month.label,
    value: sum(fuelOps.filter(item => item.type === 'صرف' && item.status === 'معتمد' && monthKey(item.date) === month.key).map(item => Number(item.total || 0))),
    secondary: sum(workOrders.filter(item => monthKey(item.opened) === month.key).map(item => Number(item.laborCost || 0) + Number(item.partsCost || 0) + Number(item.vendorCost || 0))),
  }))
}

function DashboardEmpty({ message, action, onRoute }: { message: string; action: string; onRoute: () => void }) {
  return <div className="dashboard-empty-action"><strong>{message}</strong><Button variant="secondary" size="sm" onClick={onRoute}>{action}</Button></div>
}

const sum = (values: number[]) => values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0)
const monthKey = (value: string) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` }
const withinDays = (value: string, days: number) => { const time = new Date(value).getTime(); return Number.isFinite(time) && (Date.now() - time) / 86400000 >= 0 && (Date.now() - time) / 86400000 <= days }
const daysTo = (value: string) => Math.ceil((new Date(value).getTime() - Date.now()) / 86400000)
const fmt = (value: number) => new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 1 }).format(Number(value || 0))
const fmtDate = (value: string) => value ? new Intl.DateTimeFormat('ar-EG', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value)) : '—'
const periodLabel = (period: DashboardPeriod) => period === 30 ? 'آخر 30 يومًا' : period === 90 ? 'آخر 90 يومًا' : 'آخر 6 أشهر'
const periodLabelShort = (period: DashboardPeriod) => period === 30 ? '30 يوم' : period === 90 ? '90 يوم' : '6 أشهر'
