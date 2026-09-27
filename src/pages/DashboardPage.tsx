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
      <DashboardMobileView
        dashboard={dashboard}
        period={period}
        alertTotal={alertTotal}
        notificationUnreadCount={notificationUnreadCount}
        formatMoney={formatMoney}
        onRoute={onRoute}
      />
      <div className="dashboard-desktop-view">
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
        <KpiCard tone="teal" icon={CalendarClock} label="مشروعات نشطة" value={fmt(dashboard.activeProjects)} meta={`${fmt(dashboard.projectRows.filter(project => project.count > 0).length)} مرتبط بالأصول`} helper={`${fmt(dashboard.projectRows.length)} مشروع نشط في القائمة`} />
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

      <section className="dashboard-action-queue" aria-label="المهام التي تحتاج إجراء">
        <div className="dashboard-action-queue__head">
          <div>
            <span className="dashboard-section-kicker">مركز القرار</span>
            <h2>مهام تحتاج إجراء</h2>
            <p>ملخص للعناصر المفتوحة التي تستحق المراجعة الآن.</p>
          </div>
          <button type="button" className="dashboard-intro-link" onClick={() => onRoute(dashboard.priorityCount ? 'maintenance' : 'operations')}>
            فتح المتابعة <ArrowLeft size={13} />
          </button>
        </div>
        <div className="dashboard-action-queue__grid">
          <QueueItem icon={AlertTriangle} tone="red" label="أوامر عاجلة" value={dashboard.urgentWorkOrders} route="maintenance" onRoute={onRoute} />
          <QueueItem icon={Wrench} tone="amber" label="أصول تحت الصيانة" value={dashboard.maintenance} route="maintenance" onRoute={onRoute} />
          <QueueItem icon={ClipboardCheck} tone="purple" label="أوامر عمل مفتوحة" value={dashboard.openWo} route="maintenance" onRoute={onRoute} />
          <QueueItem icon={CalendarClock} tone="blue" label="استحقاقات خلال 30 يوم" value={dashboard.expiring} route="assets" onRoute={onRoute} />
          <QueueItem icon={Gauge} tone="teal" label="تشغيل بانتظار اعتماد" value={dashboard.pendingOps} route="operations" onRoute={onRoute} />
          <QueueItem icon={BellRing} tone="red" label="إشعارات غير مقروءة" value={Number(notificationUnreadCount || 0)} route="alerts" onRoute={onRoute} />
        </div>
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
          {dashboard.hasCostData ? (
            <AnalyticsLineChart
              points={dashboard.monthlyCost}
              height={220}
              primaryLabel="الوقود"
              secondaryLabel="الصيانة"
              valueSuffix=" جنيه"
              secondarySuffix=" جنيه"
            />
          ) : (
            <DataEmptyState
              icon={Fuel}
              title="لا توجد حركة تكلفة كافية للرسم"
              description="ابدأ بتسجيل حركة وقود معتمدة أو أمر صيانة بقيمة مالية، وستتحول هذه المنطقة تلقائيًا إلى اتجاهات مقارنة."
              primaryLabel="فتح الوقود"
              primaryRoute="fuel"
              secondaryLabel="فتح الصيانة"
              secondaryRoute="maintenance"
              onRoute={onRoute}
            />
          )}
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
        <div className="dashboard-secondary-column">
          <Card className="dashboard-panel dashboard-secondary-card" title="المشروعات النشطة" description="الأصول المرتبطة بكل مشروع" action={<Button variant="ghost" size="sm" onClick={() => onRoute('projects')}>المشروعات</Button>}>
            {dashboard.projectRows.length ? (
              <div className="dashboard-projects">
                {dashboard.projectRows.slice(0, 6).map(project => (
                  <button type="button" className="dashboard-project-row" key={project.id} onClick={() => onRoute('projects')}>
                    <span className="dashboard-project-icon"><Truck size={15} /></span>
                    <span className="dashboard-project-copy"><strong>{project.name}</strong><small>{project.code || 'بدون رمز'} · {project.status || '—'}</small></span>
                    <span className={`dashboard-project-state ${project.count > 0 ? 'has-assets' : 'no-assets'}`}>{project.count > 0 ? `${fmt(project.count)} أصل مرتبط` : 'بدون أصول مرتبطة'}</span>
                    <span className="dashboard-project-progress"><i style={{ width: `${Math.min(100, dashboard.totalAssets ? (project.count / dashboard.totalAssets) * 100 : 0)}%` }} /></span>
                    <ArrowLeft size={13} className="dashboard-row-arrow" />
                  </button>
                ))}
              </div>
            ) : <DataEmptyState icon={Truck} title="لا توجد مشروعات نشطة" description="أنشئ مشروعًا أو راجع حالة المشروعات الحالية، وستظهر هنا بمجرد وجود مشروع نشط." primaryLabel="فتح المشروعات" primaryRoute="projects" onRoute={onRoute} />}
          </Card>

          <Card className="dashboard-panel dashboard-secondary-card" title="الأصول الأكثر تشغيلًا" description={`حسب ساعات التشغيل خلال ${periodLabelShort(period)}`} action={<Button variant="ghost" size="sm" onClick={() => onRoute('operations')}>التشغيل</Button>}>
            {dashboard.assetUsage.length ? (
              <AnalyticsBarChart points={dashboard.assetUsage.map(item => ({ label: item.label, value: item.hours }))} valueSuffix=" س" limit={6} />
            ) : (
              <DataEmptyState
                icon={Gauge}
                title="لا توجد سجلات تشغيل للفترة"
                description="سجلات التشغيل المعتمدة ستظهر هنا تلقائيًا عند تسجيل التشغيل للأصول."
                primaryLabel="تسجيل تشغيل"
                primaryRoute="operations/new"
                secondaryLabel="عرض السجلات"
                secondaryRoute="operations"
                onRoute={onRoute}
              />
            )}
          </Card>
        </div>

        <div className="dashboard-secondary-column">
          <Card className="dashboard-panel dashboard-secondary-card" title="مركز المتابعة" description="عناصر تحتاج تدخلاً أو مراجعة" action={<Button variant="ghost" size="sm" onClick={() => onRoute('maintenance')}>عرض الكل</Button>}>
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
              {!dashboard.watchlist.length && (
                <DataEmptyState
                  icon={CheckCircle2}
                  title="لا توجد بنود حرجة الآن"
                  description="لا توجد استحقاقات قريبة أو أوامر عمل عاجلة ضمن البيانات الحالية."
                  primaryLabel="عرض الأصول"
                  primaryRoute="assets"
                  secondaryLabel="عرض الصيانة"
                  secondaryRoute="maintenance"
                  onRoute={onRoute}
                  compact
                />
              )}
            </div>
          </Card>

          <Card className="dashboard-panel dashboard-secondary-card" title="الطلبات والاستحقاقات" description="ملخص سريع للعناصر المفتوحة حاليًا">
            <div className="dashboard-followup-grid">
              <FollowUpMetric icon={ClipboardCheck} label="أوامر عمل مفتوحة" value={dashboard.openWo} tone="purple" route="maintenance" onRoute={onRoute} />
              <FollowUpMetric icon={AlertTriangle} label="أوامر عاجلة" value={dashboard.urgentWorkOrders} tone="red" route="maintenance" onRoute={onRoute} />
              <FollowUpMetric icon={CalendarClock} label="استحقاقات خلال 30 يوم" value={dashboard.expiring} tone="amber" route="assets" onRoute={onRoute} />
              <FollowUpMetric icon={Gauge} label="تشغيل بانتظار اعتماد" value={dashboard.pendingOps} tone="blue" route="operations" onRoute={onRoute} />
            </div>
            <div className="dashboard-followup-footer">
              <span>إجمالي الأولويات الحالية</span>
              <strong>{fmt(dashboard.priorityCount)}</strong>
              <button type="button" onClick={() => onRoute(dashboard.priorityCount ? 'maintenance' : 'operations')}>فتح المتابعة <ArrowLeft size={13} /></button>
            </div>
          </Card>
        </div>
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
            {!dashboard.recentOps.length && (
              <DataEmptyState
                icon={Gauge}
                title="لا توجد عمليات حديثة"
                description="أول سجل تشغيل معتمد سيظهر هنا مع الأصل والمشروع والتاريخ وعدد الساعات."
                primaryLabel="تسجيل تشغيل"
                primaryRoute="operations/new"
                onRoute={onRoute}
              />
            )}
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
    </div>
  )
}


function DashboardMobileView({ dashboard, period, alertTotal, formatMoney, onRoute }: {
  dashboard: DashboardSnapshot
  period: DashboardPeriod
  alertTotal: number
  notificationUnreadCount: number
  formatMoney: (value: number) => string
  onRoute: (route: string) => void
}) {
  const focusItems = [
    { label: 'أوامر عاجلة', value: dashboard.urgentWorkOrders, icon: AlertTriangle, tone: 'red', route: 'maintenance' },
    { label: 'تحت الصيانة', value: dashboard.maintenance, icon: Wrench, tone: 'amber', route: 'maintenance' },
    { label: 'استحقاقات قريبة', value: dashboard.expiring, icon: CalendarClock, tone: 'blue', route: 'assets' },
    { label: 'تشغيل بانتظار اعتماد', value: dashboard.pendingOps, icon: Gauge, tone: 'teal', route: 'operations' },
  ] as const

  return (
    <div className="dashboard-mobile-view">
      <section className={`dashboard-mobile-hero ${dashboard.priorityCount > 0 ? 'is-alert' : 'is-clear'}`}>
        <div className="dashboard-mobile-hero__main">
          <span className="dashboard-mobile-hero__eyebrow">KEMEX · التشغيل اليومي</span>
          <h1>ملخص التشغيل</h1>
          <p>{dashboard.priorityCount > 0 ? 'هناك عناصر تحتاج إجراء الآن.' : 'كل المؤشرات الأساسية مستقرة ضمن البيانات الحالية.'}</p>
        </div>
        <button type="button" className="dashboard-mobile-hero__status" onClick={() => onRoute(dashboard.priorityCount > 0 ? 'maintenance' : 'operations')}>
          <span className="dashboard-mobile-live-dot" />
          <strong>{dashboard.priorityCount > 0 ? fmt(dashboard.priorityCount) : 'جيد'}</strong>
          <small>{dashboard.priorityCount > 0 ? 'للمتابعة' : 'الحالة الآن'}</small>
        </button>
      </section>

      <section className="dashboard-mobile-kpis" aria-label="المؤشرات الأساسية">
        <MobileKpi icon={Truck} tone="blue" label="إجمالي الأصول" value={fmt(dashboard.totalAssets)} detail={`${fmt(dashboard.readiness)}% جاهزية`} />
        <MobileKpi icon={Radio} tone="green" label="متاحة للتشغيل" value={fmt(dashboard.available)} detail="جاهزة للتخصيص" />
        <MobileKpi icon={Wrench} tone="amber" label="تحت الصيانة" value={fmt(dashboard.maintenance)} detail={`${fmt(dashboard.openWo)} أمر مفتوح`} />
        <MobileKpi icon={Gauge} tone="violet" label="ساعات التشغيل" value={fmt(dashboard.hours)} detail={`خلال ${periodLabelShort(period)}`} />
      </section>

      <section className="dashboard-mobile-secondary-stats" aria-label="مؤشرات ثانوية">
        <button type="button" onClick={() => onRoute('projects')}>
          <span className="dashboard-mobile-stat-icon blue"><CalendarClock size={16} /></span>
          <span><small>مشروعات نشطة</small><strong>{fmt(dashboard.activeProjects)}</strong></span>
          <ArrowLeft size={13} />
        </button>
        <button type="button" onClick={() => onRoute('alerts')}>
          <span className="dashboard-mobile-stat-icon red"><BellRing size={16} /></span>
          <span><small>تنبيهات ومتابعات</small><strong>{fmt(alertTotal)}</strong></span>
          <ArrowLeft size={13} />
        </button>
      </section>

      <section className="dashboard-mobile-section dashboard-mobile-actions">
        <div className="dashboard-mobile-section-head">
          <div><span>تشغيل</span><h2>العمليات السريعة</h2></div>
          <button type="button" onClick={() => onRoute('requests')}>كل الطلبات <ArrowLeft size={13} /></button>
        </div>
        <div className="dashboard-mobile-actions-grid">
          <MobileQuickAction icon={Truck} title="طلب نقل" description="إنشاء رحلة" tone="blue" onClick={() => onRoute('trips/new')} />
          <MobileQuickAction icon={AlertTriangle} title="تسجيل عطل" description="فتح بلاغ" tone="red" badge={dashboard.maintenance} onClick={() => onRoute('breakdowns/new')} />
          <MobileQuickAction icon={ClipboardCheck} title="طلب تخصيص" description="ربط أصل بمشروع" tone="amber" onClick={() => onRoute('assignments/new')} />
          <MobileQuickAction icon={Gauge} title="تسجيل تشغيل" description="عداد وساعات" tone="violet" onClick={() => onRoute('operations/new')} />
          <MobileQuickAction icon={PackageCheck} title="طلب معدات" description="فتح طلب جديد" tone="teal" onClick={() => onRoute('requests/new')} />
          <MobileQuickAction icon={MapPinned} title="متابعة الأسطول" description="GPS والمواقع" tone="green" onClick={() => onRoute('tracking')} />
        </div>
      </section>

      <section className="dashboard-mobile-section dashboard-mobile-focus">
        <div className="dashboard-mobile-section-head">
          <div><span>مركز القرار</span><h2>يحتاج إجراء</h2></div>
          <span className="dashboard-mobile-count-badge">{fmt(dashboard.priorityCount)}</span>
        </div>
        <div className="dashboard-mobile-focus-grid">
          {focusItems.map(item => <MobileFocusItem key={item.label} {...item} onClick={() => onRoute(item.route)} />)}
        </div>
      </section>

      <section className="dashboard-mobile-section dashboard-mobile-fleet">
        <div className="dashboard-mobile-section-head">
          <div><span>حالة الأسطول</span><h2>جاهزية التشغيل</h2></div>
          <button type="button" onClick={() => onRoute('assets')}>كل الأصول <ArrowLeft size={13} /></button>
        </div>
        <div className="dashboard-mobile-readiness">
          <div className="dashboard-mobile-readiness__ring" style={{ ['--readiness' as string]: `${Math.max(0, Math.min(100, dashboard.readiness))}%` }}>
            <strong>{fmt(dashboard.readiness)}%</strong><small>جاهزية</small>
          </div>
          <div className="dashboard-mobile-readiness__copy">
            <div><span>يعمل / مخصص</span><strong>{fmt(dashboard.activeCount)}</strong></div>
            <div><span>متاح</span><strong>{fmt(dashboard.available)}</strong></div>
            <div><span>صيانة</span><strong>{fmt(dashboard.maintenance)}</strong></div>
          </div>
        </div>
        <button type="button" className="dashboard-mobile-track-card" onClick={() => onRoute('tracking')}>
          <span className="dashboard-mobile-track-icon"><MapPinned size={18} /></span>
          <span><strong>متابعة الأسطول</strong><small>آخر مواقع GPS وحالة الأصول</small></span>
          <ArrowLeft size={15} />
        </button>
      </section>

      <section className="dashboard-mobile-section dashboard-mobile-list-card">
        <div className="dashboard-mobile-section-head">
          <div><span>التشغيل</span><h2>آخر عمليات التشغيل</h2></div>
          <button type="button" onClick={() => onRoute('operations')}>كل السجلات <ArrowLeft size={13} /></button>
        </div>
        {dashboard.recentOps.length ? (
          <div className="dashboard-mobile-list">
            {dashboard.recentOps.slice(0, 4).map(item => (
              <button key={item.id} type="button" className="dashboard-mobile-list-row" onClick={() => onRoute('operations')}>
                <span className="dashboard-mobile-list-icon"><Gauge size={15} /></span>
                <span className="dashboard-mobile-list-copy"><strong>{item.assetName}</strong><small>{item.projectName} · {formatDate(item.date)}</small></span>
                <span className="dashboard-mobile-list-value">{fmt(item.hours)}<small>ساعة</small></span>
              </button>
            ))}
          </div>
        ) : (
          <div className="dashboard-mobile-empty">
            <Gauge size={18} /><strong>لا توجد عمليات حديثة</strong><small>سجّل أول تشغيل ليظهر هنا.</small>
            <button type="button" onClick={() => onRoute('operations/new')}>تسجيل تشغيل <ArrowLeft size={12} /></button>
          </div>
        )}
      </section>

      <section className="dashboard-mobile-section dashboard-mobile-list-card">
        <div className="dashboard-mobile-section-head">
          <div><span>المشروعات</span><h2>المشروعات النشطة</h2></div>
          <button type="button" onClick={() => onRoute('projects')}>كل المشروعات <ArrowLeft size={13} /></button>
        </div>
        {dashboard.projectRows.length ? (
          <div className="dashboard-mobile-project-list">
            {dashboard.projectRows.slice(0, 4).map(project => (
              <button key={project.id} type="button" className="dashboard-mobile-project-row" onClick={() => onRoute(`project/${project.id}`)}>
                <span className="dashboard-mobile-project-mark"><Truck size={15} /></span>
                <span><strong>{project.name}</strong><small>{fmt(project.count)} أصل مرتبط</small></span>
                <ArrowLeft size={14} />
              </button>
            ))}
          </div>
        ) : (
          <div className="dashboard-mobile-empty">
            <Truck size={18} /><strong>لا توجد مشروعات نشطة</strong><small>ستظهر المشروعات فور تسجيلها كحالة نشطة.</small>
            <button type="button" onClick={() => onRoute('projects')}>عرض المشروعات <ArrowLeft size={12} /></button>
          </div>
        )}
      </section>

      <section className="dashboard-mobile-section dashboard-mobile-cost-card">
        <div className="dashboard-mobile-section-head">
          <div><span>التكلفة</span><h2>آخر وضع مالي</h2></div>
          <button type="button" onClick={() => onRoute('true-cost')}>تحليل التكلفة <ArrowLeft size={13} /></button>
        </div>
        <div className="dashboard-mobile-cost-grid">
          <MobileCostMetric label="الوقود" value={formatMoney(dashboard.fuelCost)} tone="blue" />
          <MobileCostMetric label="الصيانة" value={formatMoney(dashboard.maintenanceCost)} tone="amber" />
          <MobileCostMetric label="الإجمالي" value={formatMoney(dashboard.fuelCost + dashboard.maintenanceCost)} tone="teal" />
        </div>
        {!dashboard.hasCostData && <p className="dashboard-mobile-cost-note"><Fuel size={14} /> لا توجد حركة تكلفة كافية لإظهار اتجاهات مقارنة بعد.</p>}
      </section>
    </div>
  )
}

function MobileKpi({ icon: Icon, tone, label, value, detail }: { icon: LucideIcon; tone: string; label: string; value: string; detail: string }) {
  return <article className={`dashboard-mobile-kpi dashboard-mobile-kpi--${tone}`}>
    <span className="dashboard-mobile-kpi__icon"><Icon size={17} /></span>
    <span className="dashboard-mobile-kpi__copy"><small>{label}</small><strong>{value}</strong><em>{detail}</em></span>
  </article>
}

function MobileQuickAction({ icon: Icon, title, description, tone, badge, onClick }: { icon: LucideIcon; title: string; description: string; tone: string; badge?: number; onClick: () => void }) {
  return <button type="button" className={`dashboard-mobile-action dashboard-mobile-action--${tone}`} onClick={onClick}>
    <span className="dashboard-mobile-action__icon"><Icon size={18} /></span>
    <span className="dashboard-mobile-action__copy"><strong>{title}</strong><small>{description}</small></span>
    {badge && badge > 0 ? <b>{fmt(badge)}</b> : <ArrowLeft size={13} className="dashboard-mobile-action__arrow" />}
  </button>
}

function MobileFocusItem({ icon: Icon, tone, label, value, onClick }: { icon: LucideIcon; tone: string; label: string; value: number; onClick: () => void }) {
  return <button type="button" className={`dashboard-mobile-focus-item dashboard-mobile-focus-item--${tone}`} onClick={onClick}>
    <span className="dashboard-mobile-focus-icon"><Icon size={15} /></span>
    <span><small>{label}</small><strong>{fmt(value)}</strong></span>
    <ArrowLeft size={12} />
  </button>
}

function MobileCostMetric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return <div className={`dashboard-mobile-cost-metric dashboard-mobile-cost-metric--${tone}`}><small>{label}</small><strong>{value}</strong></div>
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

function FollowUpMetric({ icon: Icon, label, value, tone, route, onRoute }: { icon: LucideIcon; label: string; value: number; tone: string; route: string; onRoute: (route: string) => void }) {
  return (
    <button type="button" className={`dashboard-followup-metric dashboard-followup-metric--${tone}`} onClick={() => onRoute(route)}>
      <span className="dashboard-followup-metric__icon"><Icon size={16} /></span>
      <span className="dashboard-followup-metric__copy"><small>{label}</small><strong>{fmt(value)}</strong></span>
      <ArrowLeft size={13} className="dashboard-followup-metric__arrow" />
    </button>
  )
}

function QuickAction({ icon: Icon, tone, title, description, badge, onClick }: { icon: LucideIcon; tone: string; title: string; description: string; badge?: number; onClick: () => void }) {
  return (
    <button type="button" className={`dashboard-quick-card dashboard-quick-card--${tone}`} onClick={onClick}>
      <span className="dashboard-quick-card__icon"><Icon size={19} /></span>
      <span className="dashboard-quick-card__copy"><strong>{title}</strong><small>{description}</small></span>
      {typeof badge === 'number' && badge > 0 ? <span className="dashboard-quick-card__badge">{fmt(badge)}</span> : null}
      <ArrowLeft size={14} className="dashboard-quick-card__arrow" />
    </button>
  )
}

function QueueItem({ icon: Icon, tone, label, value, route, onRoute }: { icon: LucideIcon; tone: string; label: string; value: number; route: string; onRoute: (route: string) => void }) {
  return (
    <button type="button" className={`dashboard-queue-item dashboard-queue-item--${tone}`} onClick={() => onRoute(route)}>
      <span className="dashboard-queue-item__icon"><Icon size={15} /></span>
      <span className="dashboard-queue-item__copy"><small>{label}</small><strong>{fmt(value)}</strong></span>
      <ArrowLeft size={12} className="dashboard-row-arrow" />
    </button>
  )
}

function DataEmptyState({ icon: Icon, title, description, primaryLabel, primaryRoute, secondaryLabel, secondaryRoute, onRoute, compact = false }: { icon: LucideIcon; title: string; description: string; primaryLabel: string; primaryRoute: string; secondaryLabel?: string; secondaryRoute?: string; onRoute: (route: string) => void; compact?: boolean }) {
  return (
    <div className={`dashboard-data-empty ${compact ? 'is-compact' : ''}`}>
      <div className="dashboard-data-empty__icon"><Icon size={18} /></div>
      <strong>{title}</strong>
      <p>{description}</p>
      <div className="dashboard-data-empty__actions">
        <button type="button" onClick={() => onRoute(primaryRoute)}>{primaryLabel} <ArrowLeft size={12} /></button>
        {secondaryLabel && secondaryRoute ? <button type="button" className="secondary" onClick={() => onRoute(secondaryRoute)}>{secondaryLabel}</button> : null}
      </div>
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
  hasCostData: boolean
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
    .filter(project => project.status === 'نشط')
    .map(project => ({ ...project, count: assetProjectCounts.get(String(project.id)) ?? assetProjectCounts.get(String(project.code ?? '')) ?? 0 }))
    .sort((a, b) => b.count - a.count || String(a.name || '').localeCompare(String(b.name || ''), 'ar'))
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
    hasCostData: recentFuel.length > 0 || recentWorkOrders.some(item => Number(item.laborCost || 0) + Number(item.partsCost || 0) + Number(item.vendorCost || 0) > 0),
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
