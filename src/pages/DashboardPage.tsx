import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  BellRing,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Fuel,
  Gauge,
  MapPinned,
  PackageCheck,
  Plus,
  Radio,
  Settings2,
  ShieldAlert,
  Truck,
  UserRound,
  Wrench,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Asset, FuelOperation, Operation, Project, WorkOrder } from '../types/tfms'
import { Button, Card, ChartShell, AnalyticsBarChart, AnalyticsDonut, AnalyticsLineChart, StatusBadge } from '../components/ui'
import { sameReference } from '../utils/referenceLabels'
import { useCurrency } from '../features/settings'
import { APP_LOCALE } from '../shared/formatters/locale'
import '../styles/dashboard-home.css'

type DashboardPeriod = 30 | 90 | 180

type Props = {
  assets: Asset[]
  projects: Project[]
  workOrders: WorkOrder[]
  fuelOps: FuelOperation[]
  operations: Operation[]
  notifications?: unknown[]
  notificationUnreadCount?: number
  onRoute: (route: string) => void
}

export function DashboardPage({ assets, projects, workOrders, fuelOps, operations, notificationUnreadCount = 0, onRoute }: Props) {
  const { formatMoney } = useCurrency()
  const [period, setPeriod] = useState<DashboardPeriod>(30)

  const dashboard = useMemo(
    () => buildDashboardSnapshot(assets, fuelOps, workOrders, operations, projects, period),
    [assets, fuelOps, workOrders, operations, projects, period],
  )

  const alertTotal = dashboard.priorityCount + Math.max(0, Number(notificationUnreadCount || 0))

  return (
    <div className="dashboard-page dashboard-home" dir="rtl">
      <section className={`dashboard-home__status ${dashboard.priorityCount > 0 ? 'is-alert' : 'is-clear'}`}>
        <div className="dashboard-status-main">
          {dashboard.priorityCount > 0 ? <ShieldAlert size={18} /> : <CheckCircle2 size={18} />}
          <div>
            <strong>{dashboard.priorityCount > 0 ? `${fmt(dashboard.priorityCount)} بنود تشغيلية تحتاج متابعة` : 'الحالة التشغيلية مستقرة'}</strong>
            <span>{dashboard.priorityCount > 0 ? 'راجع الاستحقاقات وأوامر العمل والعناصر العاجلة قبل بدء دورة التشغيل التالية.' : 'لا توجد أوامر عمل عاجلة أو استحقاقات قريبة ضمن البيانات الحالية.'}</span>
          </div>
        </div>
        <button type="button" onClick={() => onRoute(dashboard.priorityCount > 0 ? 'maintenance' : 'operations')}>
          {dashboard.priorityCount > 0 ? 'عرض ما يحتاج متابعة' : 'فتح التشغيل'} <ArrowLeft size={14} />
        </button>
      </section>

      <section className="dashboard-kpis dashboard-home__kpis" aria-label="مؤشرات الأداء">
        <KpiCard tone="blue" icon={Truck} label="إجمالي الأصول" value={fmt(dashboard.totalAssets)} meta={`${fmt(dashboard.activeCount)} تعمل أو مخصصة`} helper={`${fmt(dashboard.readiness)}% جاهزية`} />
        <KpiCard tone="green" icon={Radio} label="متاحة للتشغيل" value={fmt(dashboard.available)} meta="جاهزة للتخصيص" helper={`${fmt(dashboard.readiness)}% جاهزية`} />
        <KpiCard tone="amber" icon={Wrench} label="تحت الصيانة" value={fmt(dashboard.maintenance)} meta={`${fmt(dashboard.urgentWorkOrders)} أمر عاجل`} helper={`${fmt(dashboard.openWo)} أمر مفتوح`} />
        <KpiCard tone="purple" icon={Gauge} label="ساعات التشغيل" value={fmt(dashboard.hours)} meta={`خلال ${periodLabelShort(period)}`} helper={`${fmt(dashboard.downtime)} ساعة توقف`} />
        <KpiCard tone="teal" icon={CalendarClock} label="مشروعات نشطة" value={fmt(dashboard.activeProjects)} meta="مشروع مرتبط بالأصول" helper={`${fmt(dashboard.projectRows.length)} مشروع ظاهر`} />
        <KpiCard tone="red" icon={BellRing} label="تنبيهات ومتابعات" value={fmt(alertTotal)} meta={`${fmt(dashboard.pendingOps)} تشغيل بانتظار اعتماد`} helper={notificationUnreadCount ? `${fmt(notificationUnreadCount)} إشعار غير مقروء` : 'لا توجد إشعارات غير مقروءة'} />
      </section>

      <section className="dashboard-quick-actions" aria-label="العمليات السريعة">
        <div className="dashboard-section-intro">
          <span className="dashboard-section-kicker">اختصارات التشغيل</span>
          <h2>العمليات السريعة</h2>
          <p>أنشئ الطلب أو السجل مباشرة من الصفحة الرئيسية بدون العودة إلى قوائم الوحدات.</p>
          <button type="button" className="dashboard-intro-link" onClick={() => onRoute('requests')}>
            عرض جميع الطلبات <ArrowLeft size={13} />
          </button>
        </div>
        <div className="dashboard-quick-actions__grid">
          <QuickAction icon={Truck} tone="blue" title="طلب نقل" description="إنشاء رحلة وحمولة" onClick={() => onRoute('trips/new')} />
          <QuickAction icon={AlertTriangle} tone="red" title="تسجيل عطل" description="فتح بلاغ عطل جديد" badge={dashboard.maintenance} onClick={() => onRoute('breakdowns/new')} />
          <QuickAction icon={ClipboardCheck} tone="amber" title="طلب تخصيص" description="تخصيص أصل لمشروع" onClick={() => onRoute('assignments/new')} />
          <QuickAction icon={Gauge} tone="purple" title="تسجيل تشغيل" description="عداد وساعات تشغيل" onClick={() => onRoute('operations/new')} />
          <QuickAction icon={PackageCheck} tone="teal" title="طلب معدات" description="فتح طلب معدات جديد" onClick={() => onRoute('requests/new')} />
          <QuickAction icon={MapPinned} tone="green" title="متابعة الأسطول" description="المواقع وحالة GPS" onClick={() => onRoute('tracking')} />
        </div>
      </section>

      <section className="dashboard-live-strip" aria-label="ملخص التشغيل اليوم">
        <LiveMetric icon={Truck} label="في التشغيل / التخصيص" value={dashboard.activeCount} tone="blue" />
        <LiveMetric icon={Radio} label="جاهزة" value={dashboard.available} tone="green" />
        <LiveMetric icon={Wrench} label="في الصيانة" value={dashboard.maintenance} tone="amber" />
        <LiveMetric icon={Gauge} label="ساعات تشغيل" value={dashboard.hours} tone="purple" suffix="ساعة" />
        <LiveMetric icon={Fuel} label="حركة وقود معتمدة" value={dashboard.fuelEntries} tone="teal" />
        <LiveMetric icon={BellRing} label="متابعات" value={alertTotal} tone="red" />
      </section>

      <section className="dashboard-main-grid">
        <ChartShell
          className="dashboard-panel dashboard-panel--cost"
          title="التكلفة التشغيلية"
          description={`الوقود مقابل الصيانة خلال ${periodLabelShort(period)}`}
          action={
            <div className="dashboard-period-control dashboard-period-control--compact" aria-label="الفترة الزمنية">
              {([30, 90, 180] as DashboardPeriod[]).map(value => (
                <button key={value} type="button" className={period === value ? 'active' : ''} onClick={() => setPeriod(value)}>
                  {value === 180 ? '6 أشهر' : `${fmt(value)} يوم`}
                </button>
              ))}
            </div>
          }
        >
          <div className="dashboard-cost-summary">
            <CostMetric label="الوقود" value={formatMoney(dashboard.fuelCost)} caption={`${fmt(dashboard.fuelEntries)} حركة معتمدة`} tone="blue" />
            <CostMetric label="الصيانة" value={formatMoney(dashboard.maintenanceCost)} caption={`${fmt(dashboard.workOrderCount)} أمر ضمن الفترة`} tone="amber" />
            <CostMetric label="الإجمالي" value={formatMoney(dashboard.fuelCost + dashboard.maintenanceCost)} caption="الوقود + الصيانة" tone="teal" />
          </div>
          <AnalyticsLineChart
            points={dashboard.monthlyCost}
            height={250}
            primaryLabel="الوقود"
            secondaryLabel="الصيانة"
            valueSuffix=" جنيه"
            secondarySuffix=" جنيه"
          />
        </ChartShell>

        <ChartShell
          className="dashboard-panel dashboard-panel--health"
          title="حالة الأسطول"
          description="توزيع الأصول حسب الحالة الحالية"
          action={<button type="button" className="dashboard-inline-link" onClick={() => onRoute('assets')}>كل الأصول <ArrowLeft size={13} /></button>}
        >
          <AnalyticsDonut segments={dashboard.healthSegments} centerValue={fmt(dashboard.totalAssets)} centerLabel="أصل" />
          <div className="dashboard-health-foot">
            <HealthStat label="يعمل / مخصص" value={dashboard.activeCount} tone="blue" />
            <HealthStat label="متاح" value={dashboard.available} tone="green" />
            <HealthStat label="صيانة" value={dashboard.maintenance} tone="amber" />
            <HealthStat label="أخرى" value={Math.max(0, dashboard.totalAssets - dashboard.activeCount - dashboard.available - dashboard.maintenance)} tone="purple" />
          </div>
        </ChartShell>
      </section>

      <section className="dashboard-secondary-grid">
        <Card className="dashboard-panel" title="مركز المتابعة" description="عناصر تحتاج تدخلاً أو مراجعة" action={<Button variant="ghost" size="sm" onClick={() => onRoute('maintenance')}>عرض الكل</Button>}>
          <div className="dashboard-watch-head"><span>العنصر</span><span>السبب</span><span>الحالة</span></div>
          <div className="dashboard-watchlist">
            {dashboard.watchlist.map(item => {
              const Icon = item.icon
              return (
                <button type="button" className="dashboard-watch-row" key={item.id} onClick={() => onRoute(item.route)}>
                  <span className={`dashboard-watch-icon tone-${item.tone}`}><Icon size={16} /></span>
                  <span className="dashboard-watch-copy"><strong>{item.name}</strong><small>{item.code || 'بدون كود'}</small></span>
                  <span className="dashboard-watch-reason">{item.reason}</span>
                  <StatusBadge tone={item.tone === 'red' ? 'red' : item.tone === 'amber' ? 'amber' : 'blue'}>{item.status}</StatusBadge>
                </button>
              )
            })}
            {!dashboard.watchlist.length && <EmptyState icon={CheckCircle2} title="لا توجد بنود حرجة" description="لا توجد استحقاقات قريبة أو أوامر عمل عاجلة حاليًا." />}
          </div>
        </Card>

        <Card className="dashboard-panel" title="المشروعات النشطة" description="الأصول المرتبطة بكل مشروع" action={<Button variant="ghost" size="sm" onClick={() => onRoute('projects')}>المشروعات</Button>}>
          {dashboard.projectRows.length ? (
            <div className="dashboard-projects">
              {dashboard.projectRows.slice(0, 6).map(project => (
                <button type="button" className="dashboard-project-row" key={project.id} onClick={() => onRoute('projects')}>
                  <span className="dashboard-project-icon"><Truck size={15} /></span>
                  <span className="dashboard-project-copy"><strong>{project.name}</strong><small>{project.code || 'بدون رمز'} · {project.status || '—'}</small></span>
                  <span className="dashboard-project-progress"><i style={{ width: `${Math.min(100, dashboard.totalAssets ? (project.count / dashboard.totalAssets) * 100 : 0)}%` }} /></span>
                  <span className="dashboard-project-number">{fmt(project.count)}<small>أصل</small></span>
                </button>
              ))}
            </div>
          ) : <EmptyState icon={Truck} title="لا توجد مشروعات مرتبطة" description="عند ربط الأصول بالمشروعات ستظهر هنا التوزيعات التشغيلية." />}
        </Card>

        <Card className="dashboard-panel" title="الأصول الأكثر تشغيلًا" description={`حسب ساعات التشغيل خلال ${periodLabelShort(period)}`} action={<Button variant="ghost" size="sm" onClick={() => onRoute('operations')}>التشغيل</Button>}>
          <AnalyticsBarChart points={dashboard.assetUsage.map(item => ({ label: item.label, value: item.hours }))} valueSuffix=" س" limit={6} />
          {!dashboard.assetUsage.length && <EmptyState icon={Gauge} title="لا توجد سجلات تشغيل للفترة" description="سجلات التشغيل المعتمدة ستظهر هنا تلقائيًا." />}
        </Card>
      </section>

      <section className="dashboard-bottom-grid">
        <Card className="dashboard-panel dashboard-ops-panel" title="آخر عمليات التشغيل" description="أحدث السجلات المعتمدة والمقدمة" action={<Button variant="ghost" size="sm" onClick={() => onRoute('operations')}>كل السجلات</Button>}>
          <div className="dashboard-ops-list">
            {dashboard.recentOps.map(item => (
              <button type="button" className="dashboard-op-row" key={item.id} onClick={() => onRoute('operations')}>
                <span className="dashboard-op-icon"><Gauge size={15} /></span>
                <span className="dashboard-op-copy"><strong>{item.assetName}</strong><small>{item.projectName} · {formatDate(item.date)}</small></span>
                <span className="dashboard-op-hours">{fmt(item.hours)}<small>ساعة</small></span>
                <StatusBadge tone={item.status === 'معتمد' ? 'emerald' : 'blue'}>{item.status || '—'}</StatusBadge>
              </button>
            ))}
            {!dashboard.recentOps.length && <EmptyState icon={Gauge} title="لا توجد عمليات حديثة" description="عند تسجيل التشغيل ستظهر آخر العمليات هنا." />}
          </div>
        </Card>

        <Card className="dashboard-panel dashboard-map-panel" title="خريطة التشغيل" description="نظرة سريعة على توزيع الأصول" action={<Button variant="ghost" size="sm" onClick={() => onRoute('tracking')}>فتح التتبع</Button>}>
          <button type="button" className="dashboard-map-preview" onClick={() => onRoute('tracking')} aria-label="فتح صفحة تتبع المركبات">
            <div className="dashboard-map-grid" />
            <div className="dashboard-map-road dashboard-map-road--one" />
            <div className="dashboard-map-road dashboard-map-road--two" />
            <div className="dashboard-map-road dashboard-map-road--three" />
            <div className="dashboard-map-route" />
            <MapPinDot x="22%" y="68%" tone="blue" label={fmt(dashboard.available)} />
            <MapPinDot x="53%" y="34%" tone="green" label={fmt(dashboard.activeCount)} />
            <MapPinDot x="77%" y="63%" tone="amber" label={fmt(dashboard.maintenance)} />
            <div className="dashboard-map-center"><MapPinned size={20} /><strong>{fmt(dashboard.totalAssets)}</strong><span>إجمالي الأصول على الخريطة</span></div>
            <span className="dashboard-map-cta"><Radio size={13} /> فتح التتبع المباشر</span>
          </button>
          <div className="dashboard-map-stats">
            <span><i className="dot blue" /> {fmt(dashboard.available)} متاح</span>
            <span><i className="dot green" /> {fmt(dashboard.activeCount)} يعمل</span>
            <span><i className="dot amber" /> {fmt(dashboard.maintenance)} صيانة</span>
          </div>
        </Card>
      </section>

      <section className="dashboard-footer-actions" aria-label="الوصول إلى الوحدات">
        <button type="button" onClick={() => onRoute('assets')}><Truck size={15} /> إدارة الأصول والأسطول <ArrowLeft size={13} /></button>
        <button type="button" onClick={() => onRoute('maintenance')}><Wrench size={15} /> أوامر العمل والصيانة <ArrowLeft size={13} /></button>
        <button type="button" onClick={() => onRoute('fuel')}><Fuel size={15} /> حركة الوقود <ArrowLeft size={13} /></button>
        <button type="button" onClick={() => onRoute('users')}><UserRound size={15} /> المستخدمون والصلاحيات <ArrowLeft size={13} /></button>
        <button type="button" onClick={() => onRoute('settings')}><Settings2 size={15} /> الإعدادات <ArrowLeft size={13} /></button>
      </section>
    </div>
  )
}

function KpiCard({ tone, icon: Icon, label, value, meta, helper }: { tone: string; icon: LucideIcon; label: string; value: string; meta: string; helper: string }) {
  return (
    <article className={`dashboard-kpi dashboard-kpi--${tone}`}>
      <span className="dashboard-kpi__icon"><Icon size={19} /></span>
      <div className="dashboard-kpi__copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{meta}</small>
      </div>
      <em>{helper}</em>
    </article>
  )
}

function QuickAction({ icon: Icon, tone, title, description, badge, onClick }: { icon: LucideIcon; tone: string; title: string; description: string; badge?: number; onClick: () => void }) {
  return (
    <button type="button" className={`dashboard-quick-card dashboard-quick-card--${tone}`} onClick={onClick}>
      <span className="dashboard-quick-card__icon"><Icon size={19} /></span>
      <span className="dashboard-quick-card__copy"><strong>{title}</strong><small>{description}</small></span>
      {typeof badge === 'number' && badge > 0 ? <span className="dashboard-quick-card__badge">{fmt(badge)}</span> : null}
      <Plus size={15} className="dashboard-quick-card__plus" />
    </button>
  )
}

function LiveMetric({ icon: Icon, label, value, tone, suffix }: { icon: LucideIcon; label: string; value: number; tone: string; suffix?: string }) {
  return (
    <div className={`dashboard-live-metric dashboard-live-metric--${tone}`}>
      <span><Icon size={15} /></span>
      <div><strong>{fmt(value)}</strong><small>{suffix ? `${label} · ${suffix}` : label}</small></div>
    </div>
  )
}

function CostMetric({ label, value, caption, tone }: { label: string; value: string; caption: string; tone: string }) {
  return <div className={`dashboard-cost-metric dashboard-cost-metric--${tone}`}><span>{label}</span><strong>{value}</strong><small>{caption}</small></div>
}

function HealthStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className="dashboard-health-stat"><i className={`dot ${tone}`} /><span>{label}</span><strong>{fmt(value)}</strong></div>
}

function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return <div className="dashboard-empty"><span><Icon size={17} /></span><div><strong>{title}</strong><small>{description}</small></div></div>
}

function MapPinDot({ x, y, tone, label }: { x: string; y: string; tone: string; label: string }) {
  return <span className={`dashboard-map-pin dashboard-map-pin--${tone}`} style={{ insetInlineStart: x, insetBlockStart: y }}><i /><b>{label}</b></span>
}

type DashboardSnapshot = {
  totalAssets: number
  activeCount: number
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
  maintenanceCost: number
  hours: number
  downtime: number
  workOrderCount: number
  activeProjects: number
  priorityCount: number
  monthlyCost: Array<{ label: string; value: number; secondary?: number }>
  healthSegments: Array<{ label: string; value: number }>
  projectRows: Array<Project & { count: number }>
  recentOps: Array<{ id: string; assetName: string; projectName: string; date: string; hours: number; status: string }>
  watchlist: Array<{ id: string; name: string; code?: string; reason: string; status: string; tone: 'amber' | 'purple' | 'red'; icon: typeof Wrench; route: string }>
  assetUsage: Array<{ label: string; hours: number; down: number }>
}

function buildDashboardSnapshot(assets: Asset[], fuelOps: FuelOperation[], workOrders: WorkOrder[], operations: Operation[], projects: Project[], period: DashboardPeriod): DashboardSnapshot {
  const totalAssets = assets.length
  const activeCount = assets.filter(asset => asset.status === 'يعمل' || asset.status === 'مخصص لمشروع').length
  const available = assets.filter(asset => asset.status === 'متاح').length
  const maintenance = assets.filter(asset => ['تحت الصيانة', 'بانتظار الإصلاح', 'بانتظار الفحص', 'خارج الخدمة'].includes(asset.status)).length
  const maintenanceCritical = assets.filter(asset => ['تحت الصيانة', 'بانتظار الإصلاح', 'بانتظار الفحص'].includes(asset.status)).length
  const recentFuel = fuelOps.filter(item => item.type === 'صرف' && withinDays(item.date, period) && item.status === 'معتمد')
  const recentOperations = operations.filter(item => withinDays(item.date, period) && ['معتمد', 'مقدمة'].includes(item.status))
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
  const activeProjects = projects.filter(project => project.status === 'نشط').length
  const priorityCount = expiring + maintenanceCritical + urgentWorkOrders + pendingOps

  const watchlist = assets.map(asset => {
    const expiry = asset.lic ? daysTo(asset.lic) : Infinity
    const urgentForAsset = workOrders.some(order => !['مكتمل', 'ملغى'].includes(order.status) && order.prio === 'عاجلة' && sameReference(order.asset, asset))
    if (expiry >= 0 && expiry <= 30) return { id: asset.id, name: asset.name, code: asset.code, reason: `استحقاق خلال ${Math.max(0, expiry)} يوم`, status: 'استحقاق', tone: 'amber' as const, icon: CalendarClock, route: 'assets' }
    if (['تحت الصيانة', 'بانتظار الإصلاح', 'بانتظار الفحص'].includes(asset.status)) return { id: asset.id, name: asset.name, code: asset.code, reason: 'الأصل يحتاج متابعة صيانة', status: 'صيانة', tone: 'purple' as const, icon: Wrench, route: 'maintenance' }
    if (urgentForAsset) return { id: asset.id, name: asset.name, code: asset.code, reason: 'مرتبط بأمر عمل عاجل', status: 'عاجل', tone: 'red' as const, icon: ClipboardCheck, route: 'maintenance' }
    return null
  }).filter((item): item is NonNullable<typeof item> => Boolean(item)).slice(0, 6)

  const assetProjectCounts = new Map<string, number>()
  for (const asset of assets) {
    const key = String(asset.proj ?? '').trim()
    if (key) assetProjectCounts.set(key, (assetProjectCounts.get(key) ?? 0) + 1)
  }
  const projectRows = projects
    .map(project => ({ ...project, count: assetProjectCounts.get(String(project.id)) ?? assetProjectCounts.get(String(project.code ?? '')) ?? 0 }))
    .filter(project => project.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 7)

  const assetNames = new Map<string, string>(assets.map(asset => [String(asset.id), asset.name]))
  const projectNames = new Map<string, string>()
  for (const project of projects) {
    projectNames.set(String(project.id), project.name)
    if (project.code) projectNames.set(String(project.code), project.name)
  }
  const recentOps = [...operations]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6)
    .map(item => ({
      id: item.id,
      assetName: assetNames.get(String(item.assetId)) ?? String(item.assetId || 'أصل غير محدد'),
      projectName: projectNames.get(String(item.proj ?? '')) ?? String(item.proj || 'المقر / بدون مشروع'),
      date: item.date,
      hours: Number(item.hours || 0),
      status: String(item.status || '—'),
    }))

  const assetUsageIndex = new Map<string, { hours: number; down: number }>()
  for (const operation of recentOperations) {
    const key = String(operation.assetId ?? '').trim()
    if (!key) continue
    const current = assetUsageIndex.get(key) ?? { hours: 0, down: 0 }
    current.hours += Number(operation.hours || 0)
    current.down += Number(operation.down || 0)
    assetUsageIndex.set(key, current)
  }
  const assetUsage = assets
    .map(asset => {
      const current = assetUsageIndex.get(String(asset.id)) ?? { hours: 0, down: 0 }
      return { label: asset.name, hours: current.hours, down: current.down }
    })
    .filter(item => item.hours > 0 || item.down > 0)
    .sort((a, b) => (b.hours + b.down) - (a.hours + a.down))
    .slice(0, 7)

  return {
    totalAssets,
    activeCount,
    available,
    maintenance,
    maintenanceCritical,
    fuelCost,
    fuelEntries: recentFuel.length,
    openWo,
    urgentWorkOrders,
    pendingOps,
    expiring,
    readiness,
    maintenanceCost,
    hours,
    downtime,
    workOrderCount: recentWorkOrders.length,
    activeProjects,
    priorityCount,
    monthlyCost: buildMonthlyCost(fuelOps, workOrders, period),
    healthSegments: [
      { label: 'عاملة / مخصصة', value: activeCount },
      { label: 'متاحة', value: available },
      { label: 'تحت الصيانة', value: maintenance },
      { label: 'أخرى', value: Math.max(0, totalAssets - activeCount - available - maintenance) },
    ],
    projectRows,
    recentOps,
    assetUsage,
    watchlist,
  }
}

function buildMonthlyCost(fuelOps: FuelOperation[], workOrders: WorkOrder[], period: DashboardPeriod) {
  const now = new Date()
  const mode = period === 30 ? 'week' : period === 90 ? 'half' : 'month'
  const bucketCount = period === 30 ? 5 : 6
  const bucketDays = period === 30 ? 6 : period === 90 ? 15 : 30
  const makeLabel = (date: Date) => new Intl.DateTimeFormat(APP_LOCALE, mode === 'month' ? { month: 'short' } : { day: '2-digit', month: 'short' }).format(date)
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const end = new Date(now)
    end.setHours(23, 59, 59, 999)
    end.setDate(end.getDate() - ((bucketCount - 1 - index) * bucketDays))
    const start = new Date(end)
    start.setDate(start.getDate() - (bucketDays - 1))
    if (index === bucketCount - 1) end.setTime(now.getTime())
    return { start, end, label: makeLabel(start) }
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
const withinDays = (value: string, days: number) => { const time = new Date(value).getTime(); const diff = (Date.now() - time) / 86400000; return Number.isFinite(time) && diff >= 0 && diff <= days }
const daysTo = (value: string) => Math.ceil((new Date(value).getTime() - Date.now()) / 86400000)
const fmt = (value: number) => new Intl.NumberFormat(APP_LOCALE, { maximumFractionDigits: 1, numberingSystem: 'latn' }).format(Number(value || 0))
const formatDate = (value: string) => { const date = new Date(value); return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(APP_LOCALE, { day: '2-digit', month: 'short' }).format(date) : '—' }
const periodLabelShort = (period: DashboardPeriod) => period === 30 ? '30 يوم' : period === 90 ? '90 يوم' : '6 أشهر'
