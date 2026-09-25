import { useMemo } from 'react'
import { AlertTriangle, CheckCircle2, Clock3, MapPinned, Radio, Truck, Wrench, ArrowUpRight } from 'lucide-react'
import type { User, Asset, Contract, Driver, FuelOperation, WorkOrder } from '../types/tfms'
import type { Trip } from '../features/trips/types'
import type { AppNotification } from '../features/notifications/types'
import { Card, PageHeader, StatusBadge } from '../components/ui'

function daysLeft(value?: string | null) {
  if (!value) return null
  const time = new Date(value).getTime()
  if (Number.isNaN(time)) return null
  return Math.ceil((time - Date.now()) / 86400000)
}

export function OperationsCenterPage({
  user,
  assets,
  workOrders,
  trips,
  drivers,
  contracts,
  notifications,
  onRoute,
}: {
  user: User
  assets: Asset[]
  workOrders: WorkOrder[]
  trips: Trip[]
  drivers: Driver[]
  contracts: Contract[]
  notifications: AppNotification[]
  onRoute: (route: string) => void
}) {
  const activeTrips = useMemo(() => trips.filter(t => ['assigned', 'dispatched', 'in_transit'].includes(t.status)), [trips])
  const delayedTrips = useMemo(() => activeTrips.filter(t => {
    if (!t.scheduled_end) return false
    return new Date(t.scheduled_end).getTime() < Date.now()
  }), [activeTrips])
  const openWorkOrders = useMemo(() => workOrders.filter(w => !['مكتمل', 'ملغى'].includes(String(w.status))), [workOrders])
  const exceptions = useMemo(() => trips.filter(t => Boolean(t.exception_status)), [trips])
  const expiring = useMemo(() => {
    const assetCount = assets.filter(a => {
      const left = daysLeft(a.lic)
      return left !== null && left <= 30
    }).length
    const contractCount = contracts.filter(c => {
      const left = daysLeft(c.end)
      return left !== null && left <= 30
    }).length
    return assetCount + contractCount
  }, [assets, contracts])

  const metrics = [
    { label: 'رحلات قيد التنفيذ', value: activeTrips.length, note: 'رحلات نشطة الآن', icon: Truck },
    { label: 'رحلات متأخرة', value: delayedTrips.length, note: 'تحتاج متابعة', icon: Clock3 },
    { label: 'استثناءات مفتوحة', value: exceptions.length, note: 'أعطال أو مشاكل تشغيلية', icon: AlertTriangle },
    { label: 'أوامر صيانة مفتوحة', value: openWorkOrders.length, note: 'لم تُغلق بعد', icon: Wrench },
    { label: 'مستندات تقترب من الانتهاء', value: expiring, note: 'خلال ثلاثين يومًا', icon: CheckCircle2 },
    { label: 'تنبيهات غير مقروءة', value: notifications.filter(n => !n.read_at).length, note: 'موجهة إلى الحساب الحالي', icon: Radio },
  ]

  return <div className="space-y-6" dir="rtl">
    <PageHeader
      title="مركز التشغيل"
      description={`نظرة تنفيذية موحدة على العمل التشغيلي للحساب الحالي: ${user.name}`}
      action={<div className="flex flex-wrap gap-2"><PrintRecordButton documentTitle="تقرير مركز التشغيل" documentNumber={`OPS-${new Date().toISOString().slice(0,10)}`} meta={[{label:'رحلات قيد التنفيذ',value:activeTrips.length},{label:'رحلات متأخرة',value:delayedTrips.length},{label:'استثناءات مفتوحة',value:exceptions.length},{label:'أوامر صيانة مفتوحة',value:openWorkOrders.length},{label:'مستندات تقترب من الانتهاء',value:expiring},{label:'تنبيهات غير مقروءة',value:notifications.filter(n=>!n.read_at).length}]} signatures={[{label:'إعداد'},{label:'مراجعة'},{label:'اعتماد'}]}><div className="print-section-title">الحالة التشغيلية الحالية</div><table><thead><tr><th>المؤشر</th><th>القيمة</th><th>ملاحظات</th></tr></thead><tbody>{metrics.map(metric=><tr key={metric.label}><td>{metric.label}</td><td>{metric.value}</td><td>{metric.note}</td></tr>)}</tbody></table>{delayedTrips.length?<><div className="print-section-title">الرحلات المتأخرة</div><table><thead><tr><th>الرحلة</th><th>الوصف</th><th>الموعد</th></tr></thead><tbody>{delayedTrips.map(t=><tr key={t.id}><td>{t.trip_number}</td><td>{t.cargo_description||'—'}</td><td>{t.scheduled_end||'—'}</td></tr>)}</tbody></table></>:null}</PrintRecordButton><button type="button" className="secondary-button" onClick={() => onRoute('tracking')}><MapPinned size={16} /> فتح تتبع المركبات</button></div>
    />

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {metrics.map(metric => {
        const Icon = metric.icon
        return <Card key={metric.label}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">{metric.label}</p>
              <strong className="mt-1 block text-3xl font-black text-slate-900">{metric.value.toLocaleString('ar-EG-u-nu-latn')}</strong>
              <span className="mt-1 block text-xs text-slate-400">{metric.note}</span>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700"><Icon size={19} /></div>
          </div>
        </Card>
      })}
    </div>

    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <SectionHead title="الرحلات المتأخرة" onOpen={() => onRoute('trips')} />
        {delayedTrips.length ? <div className="space-y-2">{delayedTrips.slice(0, 8).map(t => <button key={t.id} type="button" onClick={() => onRoute(`trips/${t.id}`)} className="w-full rounded-2xl border border-slate-200 p-3 text-right hover:bg-slate-50"><div className="flex items-center justify-between gap-3"><strong>{t.trip_number}</strong><StatusBadge tone="red">متأخرة</StatusBadge></div><p className="mt-1 text-sm text-slate-600">{t.cargo_description || 'بدون وصف حمولة'}</p></button>)}</div> : <Empty text="لا توجد رحلات متأخرة حاليًا." />}
      </Card>

      <Card>
        <SectionHead title="الاستثناءات التشغيلية" onOpen={() => onRoute('trips')} />
        {exceptions.length ? <div className="space-y-2">{exceptions.slice(0, 8).map(t => <button key={t.id} type="button" onClick={() => onRoute(`trips/${t.id}`)} className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-3 text-right"><div className="flex items-center justify-between gap-3"><strong>{t.trip_number}</strong><StatusBadge tone="amber">{t.exception_status || 'استثناء'}</StatusBadge></div><p className="mt-1 text-sm text-slate-700">رحلة تحتاج متابعة تشغيلية.</p></button>)}</div> : <Empty text="لا توجد استثناءات مفتوحة حاليًا." />}
      </Card>

      <Card>
        <SectionHead title="أوامر الصيانة المفتوحة" onOpen={() => onRoute('maintenance')} />
        {openWorkOrders.length ? <div className="space-y-2">{openWorkOrders.slice(0, 8).map(w => <button key={w.id} type="button" onClick={() => onRoute('maintenance')} className="w-full rounded-2xl border border-slate-200 p-3 text-right"><div className="flex items-center justify-between gap-3"><strong>{w.desc || w.id}</strong><StatusBadge tone={w.prio === 'عاجلة' ? 'red' : 'amber'}>{w.status}</StatusBadge></div><p className="mt-1 text-xs text-slate-500">{w.type}</p></button>)}</div> : <Empty text="لا توجد أوامر صيانة مفتوحة." />}
      </Card>

      <Card>
        <SectionHead title="آخر التنبيهات" onOpen={() => onRoute('alerts')} />
        {notifications.length ? <div className="space-y-2">{notifications.slice(0, 8).map(n => <button key={n.id} type="button" onClick={() => onRoute(n.link?.replace(/^\//, '') || 'alerts')} className={`w-full rounded-2xl border p-3 text-right ${n.read_at ? 'border-slate-200 bg-white' : 'border-slate-300 bg-slate-50'}`}><div className="flex items-start justify-between gap-3"><div><strong>{n.title}</strong><p className="mt-1 text-sm text-slate-600">{n.body}</p></div>{!n.read_at && <span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-black text-red-700">جديد</span>}</div></button>)}</div> : <Empty text="لا توجد رسائل تشغيلية حديثة." />}
      </Card>
    </div>

    <Card>
      <SectionHead title="وصول سريع" />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Quick title="النقل" text="الرحلات والتوزيع" onClick={() => onRoute('trips')} />
        <Quick title="الصيانة" text="الأعطال وأوامر العمل" onClick={() => onRoute('maintenance')} />
        <Quick title="التنبيهات" text="المعالجة والمتابعة" onClick={() => onRoute('alerts')} />
        <Quick title="GPS" text="الموقع والمسار" onClick={() => onRoute('tracking')} />
      </div>
    </Card>
  </div>
}

function SectionHead({ title, onOpen }: { title: string; onOpen?: () => void }) {
  return <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-black">{title}</h2>{onOpen && <button type="button" className="text-xs font-bold text-slate-600" onClick={onOpen}>فتح <ArrowUpRight size={13} className="inline" /></button>}</div>
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">{text}</div>
}

function Quick({ title, text, onClick }: { title: string; text: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-2xl border border-slate-200 p-4 text-right hover:bg-slate-50"><strong className="block">{title}</strong><span className="mt-1 block text-xs text-slate-500">{text}</span></button>
}
