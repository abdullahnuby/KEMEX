import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Activity,
  CheckCircle2,
  CircleSlash2,
  Clock3,
  MapPin,
  Radio,
  RefreshCw,
  Router,
  Satellite,
  Signal,
  Truck,
  WifiOff,
} from 'lucide-react'
import type { User } from '../types/tfms'
import { canAction } from '../config/app'
import { Button, Card, PageHeader } from '../components/ui'
import { GpsTrackingMap } from '../components/GpsTrackingMap'
import { gpsTrackingService } from '../features/gpsTracking/service'
import type {
  GpsAsset,
  GpsDevice,
  GpsHealth,
  GpsPosition,
} from '../features/gpsTracking/types'

const STALE_MS = 5 * 60 * 1000
const OFFLINE_MS = 20 * 60 * 1000

type Filter = 'all' | 'online' | 'stale' | 'offline'

type Props = {
  user: User
}

type TrackingRow = {
  asset: GpsAsset
  position: GpsPosition | null
  device: GpsDevice | null
  health: GpsHealth
}

export function GpsTrackingPage({ user }: Props) {
  const [assets, setAssets] = useState<GpsAsset[]>([])
  const [positions, setPositions] = useState<GpsPosition[]>([])
  const [devices, setDevices] = useState<GpsDevice[]>([])
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const [track, setTrack] = useState<GpsPosition[]>([])
  const [trackLoading, setTrackLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [clock, setClock] = useState(Date.now())
  const [showDeviceForm, setShowDeviceForm] = useState(false)
  const [deviceError, setDeviceError] = useState('')
  const [deviceForm, setDeviceForm] = useState({
    asset_id: '',
    provider: 'generic',
    external_device_id: '',
    label: '',
  })

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError('')

    try {
      const [nextAssets, nextPositions, nextDevices] = await Promise.all([
        gpsTrackingService.listAssets(),
        gpsTrackingService.listLatestPositions(),
        gpsTrackingService.listDevices(),
      ])

      setAssets(nextAssets)
      setPositions(nextPositions)
      setDevices(nextDevices)

      if (
        !selectedAssetId &&
        nextPositions.length > 0
      ) {
        setSelectedAssetId(nextPositions[0].asset_id)
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'تعذر تحميل بيانات تتبع المركبات.',
      )
    } finally {
      if (!silent) setLoading(false)
    }
  }, [selectedAssetId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const unsubscribe = gpsTrackingService.subscribeToPositions(position => {
      const asset = assets.find(item => item.id === position.asset_id)

      setPositions(current => {
        const enriched: GpsPosition = {
          ...position,
          asset_code: position.asset_code ?? asset?.code,
          asset_name: position.asset_name ?? asset?.name,
          asset_plate: position.asset_plate ?? asset?.plate_number,
          asset_status: position.asset_status ?? asset?.status,
          asset_type: position.asset_type ?? asset?.asset_type,
        }

        return [
          enriched,
          ...current.filter(item => item.asset_id !== position.asset_id),
        ]
      })

      if (selectedAssetId === position.asset_id) {
        setTrack(current => [...current, position].slice(-2000))
      }
    })

    const refreshTimer = window.setInterval(() => {
      void load(true)
    }, 30_000)

    const clockTimer = window.setInterval(
      () => setClock(Date.now()),
      30_000,
    )

    return () => {
      unsubscribe()
      window.clearInterval(refreshTimer)
      window.clearInterval(clockTimer)
    }
  }, [assets, load, selectedAssetId])

  const positionsByAsset = useMemo(
    () =>
      new Map(
        positions.map(position => [position.asset_id, position]),
      ),
    [positions],
  )

  const devicesByAsset = useMemo(
    () =>
      new Map(
        devices
          .filter(device => device.active)
          .map(device => [device.asset_id, device]),
      ),
    [devices],
  )

  const rows = useMemo<TrackingRow[]>(
    () =>
      assets.map(asset => {
        const position = positionsByAsset.get(asset.id) ?? null
        const device = devicesByAsset.get(asset.id) ?? null
        return {
          asset,
          position,
          device,
          health: getHealth(position, device, clock),
        }
      }),
    [assets, clock, devicesByAsset, positionsByAsset],
  )

  const filteredRows = useMemo(
    () =>
      filter === 'all'
        ? rows
        : rows.filter(row => row.health === filter),
    [filter, rows],
  )

  const mapPoints = useMemo(
    () =>
      filteredRows
        .filter(row => row.position)
        .map(row => ({
          id: row.asset.id,
          name: row.asset.name,
          code: row.asset.code,
          latitude: Number(row.position?.latitude),
          longitude: Number(row.position?.longitude),
          speed: row.position?.speed_kmh,
          status: healthLabel(row.health),
          selected: row.asset.id === selectedAssetId,
        })),
    [filteredRows, selectedAssetId],
  )

  const counts = useMemo(
    () => ({
      online: rows.filter(row => row.health === 'online').length,
      stale: rows.filter(row => row.health === 'stale').length,
      offline: rows.filter(row => row.health === 'offline').length,
      tracked: rows.filter(row => row.position).length,
    }),
    [rows],
  )

  const selectedRow =
    rows.find(row => row.asset.id === selectedAssetId) ?? null

  async function selectAsset(assetId: string) {
    setSelectedAssetId(assetId)
    setTrackLoading(true)
    setError('')

    try {
      setTrack(await gpsTrackingService.listTrack(assetId, 24))
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'تعذر تحميل مسار المركبة.',
      )
      setTrack([])
    } finally {
      setTrackLoading(false)
    }
  }

  async function registerDevice(event: FormEvent) {
    event.preventDefault()
    setDeviceError('')

    if (!deviceForm.asset_id) {
      setDeviceError('اختر الأصل المرتبط بجهاز GPS.')
      return
    }

    if (!deviceForm.external_device_id.trim()) {
      setDeviceError('معرّف جهاز GPS مطلوب.')
      return
    }

    setBusy(true)

    try {
      await gpsTrackingService.registerDevice(deviceForm)
      setDeviceForm({
        asset_id: '',
        provider: 'generic',
        external_device_id: '',
        label: '',
      })
      setShowDeviceForm(false)
      await load(true)
    } catch (e) {
      setDeviceError(
        e instanceof Error
          ? e.message
          : 'تعذر تسجيل جهاز GPS.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function toggleDevice(device: GpsDevice) {
    setBusy(true)
    setDeviceError('')

    try {
      await gpsTrackingService.setDeviceActive(
        device.id,
        !device.active,
      )
      await load(true)
    } catch (e) {
      setDeviceError(
        e instanceof Error
          ? e.message
          : 'تعذر تحديث جهاز GPS.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="تتبع المركبات"
        description="مراقبة آخر موقع معروف للمركبات، حالة اتصال جهاز GPS، ومسار المركبة التشغيلي."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              icon={<RefreshCw size={16} />}
              onClick={() => void load()}
              loading={loading}
            >
              تحديث
            </Button>
            {canAction('gps', 'manage_devices', user.role) && (
              <Button
                icon={<Satellite size={16} />}
                onClick={() => {
                  setDeviceError('')
                  setShowDeviceForm(value => !value)
                }}
              >
                {showDeviceForm ? 'إغلاق تسجيل الجهاز' : 'تسجيل جهاز GPS'}
              </Button>
            )}
          </div>
        }
      />

      {error && (
        <div
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}

      {deviceError && (
        <div
          className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900"
          role="alert"
        >
          {deviceError}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={<Activity size={20} />}
          label="متصل الآن"
          value={counts.online}
          note="آخر تحديث خلال خمس دقائق"
          tone="success"
        />
        <SummaryCard
          icon={<Clock3 size={20} />}
          label="متأخر"
          value={counts.stale}
          note="أكثر من خمس دقائق"
          tone="warning"
        />
        <SummaryCard
          icon={<WifiOff size={20} />}
          label="غير متصل"
          value={counts.offline}
          note="لا يوجد تحديث حديث"
          tone="danger"
        />
        <SummaryCard
          icon={<MapPin size={20} />}
          label="له موقع GPS"
          value={counts.tracked}
          note="مركبات لها آخر نقطة معروفة"
          tone="neutral"
        />
      </div>

      {showDeviceForm && canAction('gps', 'manage_devices', user.role) && (
        <Card>
          <div className="mb-4">
            <h2 className="text-lg font-black">تسجيل جهاز GPS</h2>
            <p className="mt-1 text-sm text-slate-500">
              اربط معرّف الجهاز القادم من مزود GPS بأصل KEMEX.
            </p>
          </div>

          <form
            className="grid gap-3 lg:grid-cols-4"
            onSubmit={registerDevice}
          >
            <label className="field">
              <span>المركبة / الأصل</span>
              <select
                required
                value={deviceForm.asset_id}
                onChange={event =>
                  setDeviceForm(current => ({
                    ...current,
                    asset_id: event.target.value,
                  }))
                }
              >
                <option value="">اختر الأصل</option>
                {assets.map(asset => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name} — {asset.code}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>مزود GPS</span>
              <input
                value={deviceForm.provider}
                onChange={event =>
                  setDeviceForm(current => ({
                    ...current,
                    provider: event.target.value,
                  }))
                }
                placeholder="generic"
              />
            </label>

            <label className="field">
              <span>معرّف الجهاز</span>
              <input
                required
                value={deviceForm.external_device_id}
                onChange={event =>
                  setDeviceForm(current => ({
                    ...current,
                    external_device_id: event.target.value,
                  }))
                }
                placeholder="IMEI / Device ID"
              />
            </label>

            <label className="field">
              <span>وصف الجهاز</span>
              <input
                value={deviceForm.label}
                onChange={event =>
                  setDeviceForm(current => ({
                    ...current,
                    label: event.target.value,
                  }))
                }
                placeholder="جهاز الشاحنة"
              />
            </label>

            <div className="lg:col-span-4 flex flex-wrap items-center gap-2">
              <Button
                type="submit"
                icon={<Router size={16} />}
                loading={busy}
              >
                حفظ جهاز GPS
              </Button>
              <span className="text-xs text-slate-500">
                بعد الربط، يستقبل Endpoint الخاص بـ KEMEX قراءات الجهاز
                ويضعها في سجل المواقع.
              </span>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">الخريطة التشغيلية</h2>
            <p className="mt-1 text-sm text-slate-500">
              التحديث المباشر يستخدم Supabase Realtime مع تحديث احتياطي كل
              ثلاثين ثانية.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(['all', 'online', 'stale', 'offline'] as Filter[]).map(key => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={[
                  'rounded-xl px-3 py-2 text-xs font-black',
                  filter === key
                    ? 'bg-slate-950 text-white'
                    : 'bg-slate-100 text-slate-600',
                ].join(' ')}
              >
                {filterLabel(key)}
              </button>
            ))}
          </div>
        </div>

        <GpsTrackingMap
          points={mapPoints}
          track={track}
          selectedAssetId={selectedAssetId}
        />
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <Card>
          <div className="mb-4">
            <h2 className="text-lg font-black">المركبات وأجهزة GPS</h2>
            <p className="mt-1 text-sm text-slate-500">
              اختر مركبة لعرض آخر نقطة ومسار الأربع والعشرين ساعة السابقة.
            </p>
          </div>

          {loading ? (
            <div className="py-10 text-center text-sm text-slate-500">
              جارٍ تحميل بيانات التتبع...
            </div>
          ) : filteredRows.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-2">
              {filteredRows.map(row => (
                <button
                  key={row.asset.id}
                  type="button"
                  onClick={() => void selectAsset(row.asset.id)}
                  className={[
                    'w-full rounded-2xl border p-4 text-right transition',
                    row.asset.id === selectedAssetId
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-200 bg-white hover:border-slate-300',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Truck size={18} className="shrink-0 text-slate-500" />
                        <strong className="truncate">
                          {row.asset.name}
                        </strong>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {row.asset.code}
                        {row.asset.plate_number
                          ? ` · ${row.asset.plate_number}`
                          : ''}
                      </p>
                    </div>

                    <HealthBadge health={row.health} />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <MiniMetric
                      label="السرعة"
                      value={
                        row.position?.speed_kmh == null
                          ? '—'
                          : `${Math.round(
                              Number(row.position.speed_kmh),
                            )} كم/س`
                      }
                    />
                    <MiniMetric
                      label="السائق"
                      value={
                        row.position?.driver_name ??
                        'غير مرتبط بالقراءة'
                      }
                    />
                    <MiniMetric
                      label="الرحلة"
                      value={row.position?.trip_number ?? '—'}
                    />
                    <MiniMetric
                      label="آخر تحديث"
                      value={formatRelative(
                        row.position?.recorded_at ??
                          row.device?.last_seen_at ??
                          null,
                      )}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-4">
            <h2 className="text-lg font-black">تفاصيل المركبة المختارة</h2>
            <p className="mt-1 text-sm text-slate-500">
              بيانات آخر نقطة معروفة وحالة جهاز GPS.
            </p>
          </div>

          {selectedRow ? (
            <div className="space-y-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <strong className="text-lg">
                      {selectedRow.asset.name}
                    </strong>
                    <p className="mt-1 text-xs text-slate-500">
                      {selectedRow.asset.code}
                    </p>
                  </div>
                  <HealthBadge health={selectedRow.health} />
                </div>
              </div>

              <DetailRow
                label="آخر إحداثيات"
                value={
                  selectedRow.position
                    ? `${Number(
                        selectedRow.position.latitude,
                      ).toFixed(6)}, ${Number(
                        selectedRow.position.longitude,
                      ).toFixed(6)}`
                    : 'لا توجد قراءة'
                }
              />

              <DetailRow
                label="الدقة"
                value={
                  selectedRow.position?.accuracy_m == null
                    ? '—'
                    : `${Math.round(
                        Number(selectedRow.position.accuracy_m),
                      )} متر`
                }
              />

              <DetailRow
                label="الاتجاه"
                value={
                  selectedRow.position?.heading_degrees == null
                    ? '—'
                    : `${Math.round(
                        Number(
                          selectedRow.position.heading_degrees,
                        ),
                      )}°`
                }
              />

              <DetailRow
                label="الإشعال"
                value={
                  selectedRow.position?.ignition_on == null
                    ? 'غير معروف'
                    : selectedRow.position.ignition_on
                      ? 'يعمل'
                      : 'متوقف'
                }
              />

              <DetailRow
                label="مزود GPS"
                value={selectedRow.device?.provider ?? 'غير مسجل'}
              />

              <DetailRow
                label="معرّف الجهاز"
                value={
                  selectedRow.device?.external_device_id ??
                  'غير مسجل'
                }
              />

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <strong>تاريخ المسار</strong>
                    <p className="mt-1 text-xs text-slate-500">
                      آخر أربع وعشرين ساعة
                    </p>
                  </div>
                  {trackLoading && (
                    <RefreshCw
                      size={16}
                      className="animate-spin text-slate-500"
                    />
                  )}
                </div>

                <div className="mt-4 flex items-center gap-2 text-sm font-bold">
                  <Signal size={16} />
                  {track.length} نقطة GPS
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              اختر مركبة من القائمة لعرض تفاصيلها ومسارها.
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-black">تكامل أجهزة GPS</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
              نقطة الاستقبال الخلفية هي
              <code className="mx-1 rounded bg-slate-100 px-2 py-1 text-xs">
                /functions/v1/gps-ingest
              </code>
              وتستخدم مفتاحًا سريًا على الخادم فقط. جهاز الـ GPS يرسل معرّفه
              وإحداثياته، وKEMEX يربطه بالأصل المسجل في النظام.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white">
            Realtime + polling fallback
          </div>
        </div>
      </Card>

      {devices.length > 0 &&
        canAction('gps', 'manage_devices', user.role) && (
          <Card>
            <div className="mb-4">
              <h2 className="text-lg font-black">إدارة أجهزة GPS</h2>
              <p className="mt-1 text-sm text-slate-500">
                تفعيل أو إيقاف جهاز مرتبط بأصل.
              </p>
            </div>

            <div className="space-y-2">
              {devices.map(device => {
                const asset = assets.find(
                  item => item.id === device.asset_id,
                )

                return (
                  <div
                    key={device.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <strong className="block truncate">
                        {asset?.name ?? device.asset_id}
                      </strong>
                      <p className="mt-1 text-xs text-slate-500">
                        {device.provider} · {device.external_device_id}
                        {device.label ? ` · ${device.label}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={
                          device.active
                            ? 'rounded-full bg-emerald-100 px-2 py-1 text-xs font-black text-emerald-700'
                            : 'rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-500'
                        }
                      >
                        {device.active ? 'مفعل' : 'متوقف'}
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() =>
                          void toggleDevice(device)
                        }
                      >
                        {device.active ? 'إيقاف' : 'تفعيل'}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}
    </div>
  )
}

function SummaryCard({
  icon,
  label,
  value,
  note,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: number
  note: string
  tone: 'success' | 'warning' | 'danger' | 'neutral'
}) {
  const iconClass =
    tone === 'success'
      ? 'bg-emerald-50 text-emerald-700'
      : tone === 'warning'
        ? 'bg-amber-50 text-amber-700'
        : tone === 'danger'
          ? 'bg-red-50 text-red-700'
          : 'bg-slate-100 text-slate-700'

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-500">
            {label}
          </p>
          <strong className="mt-1 block text-2xl font-black">
            {value}
          </strong>
          <span className="mt-1 block text-[11px] text-slate-500">
            {note}
          </span>
        </div>
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${iconClass}`}>
          {icon}
        </span>
      </div>
    </Card>
  )
}

function HealthBadge({ health }: { health: GpsHealth }) {
  const config = {
    online: {
      label: 'متصل',
      className: 'bg-emerald-100 text-emerald-700',
      icon: <CheckCircle2 size={13} />,
    },
    stale: {
      label: 'متأخر',
      className: 'bg-amber-100 text-amber-800',
      icon: <Clock3 size={13} />,
    },
    offline: {
      label: 'غير متصل',
      className: 'bg-red-100 text-red-700',
      icon: <CircleSlash2 size={13} />,
    },
  }[health]

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ${config.className}`}>
      {config.icon}
      {config.label}
    </span>
  )
}

function MiniMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <small className="block text-[10px] text-slate-400">
        {label}
      </small>
      <strong className="mt-1 block truncate text-xs text-slate-700">
        {value}
      </strong>
    </div>
  )
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 px-3 py-2.5">
      <span className="text-xs text-slate-500">{label}</span>
      <strong className="text-xs text-slate-800">{value}</strong>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
      <Radio className="mx-auto text-slate-400" />
      <p className="mt-3 font-black text-slate-700">
        لا توجد مركبات مطابقة
      </p>
      <p className="mt-1 text-sm text-slate-500">
        بعد ربط أجهزة GPS ستظهر آخر نقاطها هنا.
      </p>
    </div>
  )
}

function getHealth(
  position: GpsPosition | null,
  device: GpsDevice | null,
  now: number,
): GpsHealth {
  const raw = position?.recorded_at ?? device?.last_seen_at ?? null
  if (!raw) return 'offline'

  const timestamp = new Date(raw).getTime()
  if (!Number.isFinite(timestamp)) return 'offline'

  const age = Math.max(0, now - timestamp)

  if (age <= STALE_MS) return 'online'
  if (age <= OFFLINE_MS) return 'stale'
  return 'offline'
}

function healthLabel(health: GpsHealth) {
  return health === 'online'
    ? 'متصل'
    : health === 'stale'
      ? 'متأخر'
      : 'غير متصل'
}

function filterLabel(filter: Filter) {
  return filter === 'all'
    ? 'الكل'
    : filter === 'online'
      ? 'متصل'
      : filter === 'stale'
        ? 'متأخر'
        : 'غير متصل'
}

function formatRelative(value: string | null) {
  if (!value) return 'لا توجد قراءة'

  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return 'قراءة غير صالحة'

  const minutes = Math.max(
    0,
    Math.round((Date.now() - date.getTime()) / 60000),
  )

  if (minutes < 1) return 'منذ لحظات'
  if (minutes < 60) return `منذ ${minutes} دقيقة`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `منذ ${hours} ساعة`

  return `منذ ${Math.floor(hours / 24)} يوم`
}
