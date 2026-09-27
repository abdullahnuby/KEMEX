import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Bell,
  Boxes,
  ChevronLeft,
  CircleAlert,
  CircleCheck,
  MapPin,
  Truck,
  Wrench,
} from 'lucide-react'
import type { Asset, FuelOperation, Operation, Project, WorkOrder } from '../types/tfms'
import type { AppNotification } from '../features/notifications/types'
import type { GpsPosition } from '../features/gpsTracking/types'
import { gpsTrackingService } from '../features/gpsTracking/service'
import { GpsTrackingMap } from '../components/GpsTrackingMap'
import { APP_LOCALE } from '../shared/formatters/locale'
import '../styles/dashboard-home.css'

type DashboardProps = {
  assets: Asset[]
  projects: Project[]
  workOrders: WorkOrder[]
  fuelOps: FuelOperation[]
  operations: Operation[]
  notifications?: AppNotification[]
  notificationUnreadCount?: number
  onRoute: (route: string) => void
}

type CostPoint = {
  label: string
  fuel: number
  maintenance: number
  total: number
}

type AssetHealthSegment = {
  label: string
  value: number
  color: 'blue' | 'green' | 'yellow' | 'gray'
}

const numberFormatter = new Intl.NumberFormat(APP_LOCALE, {
  maximumFractionDigits: 0,
  numberingSystem: 'latn',
})

const percentFormatter = new Intl.NumberFormat(APP_LOCALE, {
  maximumFractionDigits: 0,
  numberingSystem: 'latn',
})

const formatNumber = (value: number) => numberFormatter.format(Math.max(0, Math.round(Number(value) || 0)))
const formatPercent = (value: number) => `${percentFormatter.format(Math.round(Number(value) || 0))}%`

export function DashboardPage({
  assets,
  projects,
  workOrders,
  fuelOps,
  operations,
  notifications = [],
  notificationUnreadCount = 0,
  onRoute,
}: DashboardProps) {
  const [gpsPositions, setGpsPositions] = useState<GpsPosition[]>([])
  const [gpsLoading, setGpsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setGpsLoading(true)

    void gpsTrackingService.listLatestPositions()
      .then(positions => {
        if (!cancelled) setGpsPositions(positions.filter(isValidGpsPosition))
      })
      .catch(() => {
        if (!cancelled) setGpsPositions([])
      })
      .finally(() => {
        if (!cancelled) setGpsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const openMaintenanceRequests = useMemo(
    () => workOrders.filter(order => !['مكتمل', 'ملغى'].includes(String(order.status).trim())).length,
    [workOrders],
  )

  const unreadAlerts = Math.max(0, Number(notificationUnreadCount) || 0)

  const healthSegments = useMemo<AssetHealthSegment[]>(() => {
    const working = assets.filter(asset => ['يعمل', 'مخصص لمشروع'].includes(asset.status)).length
    const available = assets.filter(asset => asset.status === 'متاح').length
    const maintenance = assets.filter(asset => ['تحت الصيانة', 'بانتظار الإصلاح', 'بانتظار الفحص', 'خارج الخدمة'].includes(asset.status)).length
    const other = Math.max(0, assets.length - working - available - maintenance)

    return [
      { label: 'تعمل', value: working, color: 'blue' },
      { label: 'متاحة', value: available, color: 'green' },
      { label: 'صيانة', value: maintenance, color: 'yellow' },
      { label: 'أخرى', value: other, color: 'gray' },
    ]
  }, [assets])

  const costPoints = useMemo(() => buildWeeklyCosts(fuelOps, workOrders, 8), [fuelOps, workOrders])
  const mapPoints = useMemo(
    () => buildMapPoints(gpsPositions),
    [gpsPositions],
  )
  const recentNotifications = useMemo(
    () => [...notifications]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 4),
    [notifications],
  )

  const totalAssets = assets.length

  return (
    <main className="kemex-dashboard" dir="rtl">
      <header className="kemex-dashboard__header">
        <div>
          <span className="kemex-dashboard__eyebrow">الرئيسية</span>
          <h1>نظرة عامة</h1>
          <p>متابعة سريعة للأصول والمشروعات والصيانة والتنبيهات الحالية.</p>
        </div>
        <span className="kemex-dashboard__status">بيانات تشغيلية مباشرة</span>
      </header>

      <section className="dashboard-kpis" aria-label="المؤشرات الرئيسية">
        <KpiCard
          tone="blue"
          icon={<Boxes size={21} />}
          label="الأصول"
          value={formatNumber(totalAssets)}
        />
        <KpiCard
          tone="green"
          icon={<Truck size={21} />}
          label="المشروعات"
          value={formatNumber(projects.length)}
        />
        <KpiCard
          tone="yellow"
          icon={<Wrench size={21} />}
          label="طلبات الصيانة"
          value={formatNumber(openMaintenanceRequests)}
        />
        <KpiCard
          tone="red"
          icon={<Bell size={21} />}
          label="التنبيهات"
          value={formatNumber(unreadAlerts)}
        />
      </section>

      <section className="dashboard-grid dashboard-grid--top">
        <section className="dashboard-card dashboard-card--chart">
          <DashboardCardHeader
            title="إجمالي التكلفة"
            subtitle="تكلفة الوقود والصيانة"
            action="آخر 8 أسابيع"
          />
          <div className="cost-chart-wrap">
            <CostBarChart points={costPoints} />
          </div>
          <div className="cost-chart-footer">
            <span><i className="dashboard-legend-dot dashboard-legend-dot--blue" /> الوقود</span>
            <span><i className="dashboard-legend-dot dashboard-legend-dot--gray" /> الصيانة</span>
          </div>
        </section>

        <section className="dashboard-card dashboard-card--health">
          <DashboardCardHeader title="حالة الأصول" subtitle="التوزيع الحالي" />
          <AssetHealthDonut segments={healthSegments} total={totalAssets} />
        </section>
      </section>

      <section className="dashboard-grid dashboard-grid--bottom">
        <section className="dashboard-card dashboard-card--map">
          <DashboardCardHeader
            title="الأصول في الموقع"
            subtitle={gpsLoading ? 'جارٍ تحميل آخر مواقع GPS...' : `${formatNumber(mapPoints.length)} أصل ظاهر على الخريطة`}
            action="التتبع"
            onAction={() => onRoute('tracking')}
          />
          <div className="dashboard-home-map">
            <GpsTrackingMap
              points={mapPoints}
              track={[]}
            />
            {!gpsLoading && !mapPoints.length && (
              <div className="dashboard-map-empty" role="status">
                <MapPin size={17} />
                <span>لا توجد مواقع GPS حالية متاحة.</span>
              </div>
            )}
          </div>
        </section>

        <section className="dashboard-card dashboard-card--alerts">
          <DashboardCardHeader
            title="آخر التنبيهات"
            subtitle="أحدث الإشعارات المسجلة"
            action="عرض الكل"
            onAction={() => onRoute('alerts')}
          />
          <div className="dashboard-alert-list">
            {recentNotifications.map(notification => (
              <button
                key={notification.id}
                type="button"
                className={`dashboard-alert-row ${notification.read_at ? '' : 'is-unread'}`}
                onClick={() => notification.link && onRoute(notification.link.replace(/^\//, ''))}
              >
                <span className={`dashboard-alert-icon dashboard-alert-icon--${notificationTone(notification.event_type)}`}>
                  <CircleAlert size={16} />
                </span>
                <span className="dashboard-alert-copy">
                  <strong>{notification.title || 'تنبيه'}</strong>
                  <small>{notification.body || 'يوجد تحديث يحتاج إلى مراجعة.'}</small>
                </span>
                <time dateTime={notification.created_at}>{relativeTime(notification.created_at)}</time>
              </button>
            ))}

            {!recentNotifications.length && (
              <div className="dashboard-alert-empty">
                <CircleCheck size={18} />
                <div>
                  <strong>لا توجد تنبيهات حديثة</strong>
                  <span>ستظهر هنا آخر الإشعارات بمجرد تسجيلها.</span>
                </div>
              </div>
            )}
          </div>
        </section>
      </section>

    </main>
  )
}

function KpiCard({ tone, icon, label, value }: { tone: 'blue' | 'green' | 'yellow' | 'red'; icon: ReactNode; label: string; value: string }) {
  return (
    <article className={`dashboard-kpi dashboard-kpi--${tone}`}>
      <span className="dashboard-kpi__icon">{icon}</span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  )
}

function DashboardCardHeader({
  title,
  subtitle,
  action,
  onAction,
}: {
  title: string
  subtitle?: string
  action?: string
  onAction?: () => void
}) {
  return (
    <header className="dashboard-card__header">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action && (
        <button type="button" onClick={onAction} disabled={!onAction}>
          {action}
          {onAction && <ChevronLeft size={13} />}
        </button>
      )}
    </header>
  )
}

function CostBarChart({ points }: { points: CostPoint[] }) {
  const max = Math.max(1, ...points.map(point => point.total))

  return (
    <div className="cost-chart" role="img" aria-label="مخطط إجمالي التكلفة للوقود والصيانة">
      <div className="cost-chart__y-axis" aria-hidden="true">
        <span>{formatNumber(max)}</span>
        <span>{formatNumber(max * .75)}</span>
        <span>{formatNumber(max * .5)}</span>
        <span>{formatNumber(max * .25)}</span>
        <span>0</span>
      </div>
      <div className="cost-chart__plot">
        <div className="cost-chart__grid" aria-hidden="true">
          <i /><i /><i /><i /><i />
        </div>
        <div className="cost-chart__columns">
          {points.map(point => {
            const totalHeight = point.total ? Math.max(4, (point.total / max) * 100) : 0
            const fuelHeight = point.total ? (point.fuel / point.total) * totalHeight : 0
            const maintenanceHeight = Math.max(0, totalHeight - fuelHeight)
            return (
              <div className="cost-column" key={point.label}>
                <div className="cost-column__bar">
                  <span className="cost-column__segment cost-column__segment--maintenance" style={{ height: `${maintenanceHeight}%` }} title={`الصيانة: ${formatNumber(point.maintenance)}`} />
                  <span className="cost-column__segment cost-column__segment--fuel" style={{ height: `${fuelHeight}%` }} title={`الوقود: ${formatNumber(point.fuel)}`} />
                </div>
                <small>{point.label}</small>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function AssetHealthDonut({ segments, total }: { segments: AssetHealthSegment[]; total: number }) {
  const stops = buildConicStops(segments, total)
  const percentages = segments.map(segment => ({
    ...segment,
    percentage: total ? (segment.value / total) * 100 : 0,
  }))

  return (
    <div className="asset-health">
      <div
        className="asset-health__donut"
        style={{ background: stops }}
        aria-label={`إجمالي الأصول ${formatNumber(total)}`}
      >
        <div className="asset-health__center">
          <strong>{formatNumber(total)}</strong>
          <span>أصل</span>
        </div>
      </div>
      <div className="asset-health__legend">
        {percentages.map(segment => (
          <div key={segment.label}>
            <span><i className={`dashboard-legend-dot dashboard-legend-dot--${segment.color}`} />{segment.label}</span>
            <strong>{formatPercent(segment.percentage)}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

function buildConicStops(segments: AssetHealthSegment[], total: number) {
  const colorMap: Record<AssetHealthSegment['color'], string> = {
    blue: '#1698d8',
    green: '#28b97d',
    yellow: '#f2b84b',
    gray: '#cbd5dc',
  }
  if (!total) return '#edf2f5'

  let cursor = 0
  const stops: string[] = []
  for (const segment of segments) {
    const value = (segment.value / total) * 100
    const start = cursor
    cursor += value
    stops.push(`${colorMap[segment.color]} ${start}% ${cursor}%`)
  }
  return `conic-gradient(from -18deg, ${stops.join(', ')})`
}

function buildWeeklyCosts(fuelOps: FuelOperation[], workOrders: WorkOrder[], count: number): CostPoint[] {
  const now = new Date()
  return Array.from({ length: count }, (_, index) => {
    const end = new Date(now)
    end.setHours(23, 59, 59, 999)
    end.setDate(end.getDate() - ((count - 1 - index) * 7))
    const start = new Date(end)
    start.setDate(start.getDate() - 6)
    if (index === count - 1) end.setTime(now.getTime())

    const within = (dateValue: string) => {
      const time = new Date(dateValue).getTime()
      return Number.isFinite(time) && time >= start.getTime() && time <= end.getTime()
    }

    const fuel = fuelOps
      .filter(item => item.type === 'صرف' && item.status === 'معتمد' && within(item.date))
      .reduce((sum, item) => sum + Number(item.total || 0), 0)

    const maintenance = workOrders
      .filter(item => within(item.opened))
      .reduce((sum, item) => sum + Number(item.laborCost || 0) + Number(item.partsCost || 0) + Number(item.vendorCost || 0), 0)

    return {
      label: new Intl.DateTimeFormat(APP_LOCALE, { day: '2-digit', month: '2-digit' }).format(start),
      fuel,
      maintenance,
      total: fuel + maintenance,
    }
  })
}

function buildMapPoints(positions: GpsPosition[]) {
  const latestByAsset = new Map<string, GpsPosition>()
  for (const position of positions) {
    const current = latestByAsset.get(position.asset_id)
    if (!current || new Date(position.recorded_at).getTime() > new Date(current.recorded_at).getTime()) {
      latestByAsset.set(position.asset_id, position)
    }
  }

  return Array.from(latestByAsset.values()).map(position => ({
    id: position.asset_id,
    name: position.asset_name || position.asset_code || 'أصل',
    code: position.asset_code,
    latitude: Number(position.latitude),
    longitude: Number(position.longitude),
    speed: position.speed_kmh,
    status: position.asset_status || 'غير معروفة',
  })).filter(point => Number.isFinite(point.latitude) && Number.isFinite(point.longitude))
}

function isValidGpsPosition(position: GpsPosition) {
  return Number.isFinite(Number(position.latitude)) && Number.isFinite(Number(position.longitude))
}

function notificationTone(eventType: string) {
  const key = String(eventType).toLowerCase()
  if (key.includes('critical') || key.includes('urgent') || key.includes('breakdown') || key.includes('expiry')) return 'red'
  if (key.includes('warning') || key.includes('maintenance')) return 'yellow'
  return 'blue'
}

function relativeTime(value: string) {
  const delta = Date.now() - new Date(value).getTime()
  if (!Number.isFinite(delta)) return ''
  const minutes = Math.floor(delta / 60000)
  if (minutes < 1) return 'الآن'
  if (minutes < 60) return `منذ ${formatNumber(minutes)} د`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `منذ ${formatNumber(hours)} س`
  const days = Math.floor(hours / 24)
  return `منذ ${formatNumber(days)} يوم`
}
