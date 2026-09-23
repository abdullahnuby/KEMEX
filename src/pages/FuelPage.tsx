import { Fuel, Plus, Search, TrendingUp, X } from 'lucide-react'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import type { Asset, FuelOperation, Project } from '../types/tfms'
import { useCurrency } from '../features/settings'
import { ReferenceValue } from '../components/ReferenceValue'
import { sameReference } from '../utils/referenceLabels'
import { PageHeader, Card, CardGrid, StatCard, DataTable, StatusBadge, Button } from '../components/ui'
import type { DataTableColumn } from '../components/ui/DataTable'

import { APP_LOCALE } from '../shared/formatters/locale'
type Props = {
  fuelOps: FuelOperation[]
  assets: Asset[]
  projects: Project[]
  onSave?: (x: FuelOperation) => Promise<void> | void
  defaultPrices?: { diesel: number; petrol: number }
}

export function FuelPage({ fuelOps, assets, projects, onSave, defaultPrices = { diesel: 0, petrol: 0 } }: Props) {
  const { formatMoney } = useCurrency()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<FuelOperation | null>(null)
  const [busy, setBusy] = useState(false)

  const rows = useMemo(
    () =>
      fuelOps.filter((x) => {
        const a = assets.find((a) => sameReference(x.assetId, a))
        const p = projects.find((p) => sameReference(x.proj, p))
        const q = query.trim().toLowerCase()
        return (
          !q ||
          [a?.name, a?.code, p?.name, p?.code, x.station, x.type, x.notes]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(q)
        )
      }),
    [fuelOps, assets, projects, query]
  )

  const issued = fuelOps.filter((x) => x.type === 'صرف')
  const liters = issued.reduce((s, x) => s + Number(x.qty || 0), 0)
  const total = issued.reduce((s, x) => s + Number(x.total || 0), 0)
  const avg = liters ? total / liters : 0

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editing || !onSave) return
    setBusy(true)
    try {
      const fd = new FormData(e.currentTarget)
      const qty = Number(fd.get('qty') || 0)
      const price = Number(fd.get('price') || 0)
      await onSave({
        ...editing,
        type: String(fd.get('type') || 'صرف'),
        assetId: String(fd.get('assetId') || ''),
        proj: String(fd.get('proj') || ''),
        date: String(fd.get('date') || ''),
        qty,
        price,
        total: qty * price,
        status: String(fd.get('status') || 'مسجلة'),
        station: String(fd.get('station') || ''),
        tank: String(fd.get('tank') || ''),
        meter: Number(fd.get('meter') || 0),
        sup: String(fd.get('sup') || ''),
        inv: String(fd.get('inv') || ''),
        notes: String(fd.get('notes') || ''),
      })
      setEditing(null)
    } finally {
      setBusy(false)
    }
  }

  const columns: DataTableColumn<FuelOperation>[] = [
    { key: 'date', header: 'التاريخ', sortable: true, render: (x) => fmtDate(x.date) },
    { key: 'type', header: 'النوع', sortable: true },
    {
      key: 'assetId',
      header: 'الأصل',
      accessor: (x) => assets.find((a) => sameReference(x.assetId, a))?.name ?? '',
      render: (x) => <ReferenceValue field="assetId" value={x.assetId} lookups={{ assets, projects }} />,
    },
    {
      key: 'proj',
      header: 'المشروع',
      accessor: (x) => projects.find((p) => sameReference(x.proj, p))?.name ?? '',
      render: (x) => <ReferenceValue field="proj" value={x.proj} lookups={{ projects }} />,
      hideOnMobile: true,
    },
    { key: 'qty', header: 'الكمية', sortable: true, render: (x) => `${fmt(x.qty)} لتر` },
    { key: 'price', header: 'السعر', render: (x) => formatMoney(x.price), hideOnMobile: true },
    {
      key: 'total',
      header: 'الإجمالي',
      sortable: true,
      accessor: (x) => x.total,
      render: (x) => <strong className="font-semibold text-gray-900">{formatMoney(x.total)}</strong>,
    },
    { key: 'status', header: 'الحالة', render: (x) => <StatusBadge>{x.status}</StatusBadge> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="إدارة الوقود"
        description="الصرف والتعبئة وتحليل التكلفة والاستهلاك حسب الأصل والمشروع."
        action={
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
              <TrendingUp size={15} /> متوسط اللتر {formatMoney(avg)}
            </span>
            {onSave && (
              <Button
                icon={<Plus size={16} />}
                onClick={() =>
                  setEditing({
                    id: `F-${Date.now()}`,
                    type: 'صرف',
                    assetId: assets[0]?.id,
                    proj: projects[0]?.id,
                    tank: '',
                    date: new Date().toISOString().slice(0, 10),
                    qty: 0,
                    price: defaultPrices.diesel || defaultPrices.petrol,
                    total: 0,
                    status: 'مسجلة',
                    station: '',
                    sup: '',
                    inv: '',
                    meter: assets[0]?.meter ?? 0,
                    notes: '',
                  })
                }
              >
                حركة وقود
              </Button>
            )}
          </div>
        }
      />

      <CardGrid cols={4}>
        <StatCard icon={<Fuel size={18} />} label="إجمالي اللترات المصروفة" value={`${fmt(liters)} لتر`} />
        <StatCard icon={<TrendingUp size={18} />} label="قيمة الصرف" value={formatMoney(total)} />
        <StatCard icon={<Fuel size={18} />} label="متوسط سعر اللتر" value={formatMoney(avg)} />
        <StatCard icon={<Search size={18} />} label="حركات الصرف" value={issued.length} />
      </CardGrid>

      <Card>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(x) => x.id}
          searchable
          search={query}
          onSearchChange={setQuery}
          searchPlaceholder="بحث في حركات الوقود..."
        />
      </Card>

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onMouseDown={() => !busy && setEditing(null)}
        >
          <form
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-elevated"
            onSubmit={submit}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-gray-100">
              <div>
                <div className="text-xs font-semibold text-primary-600 uppercase tracking-wide">حركة مستندية</div>
                <h2 className="text-lg font-bold text-gray-900 mt-1">تسجيل حركة وقود</h2>
                <p className="text-sm text-gray-500 mt-1">
                  الحساب الإجمالي يتم من الكمية × سعر الوحدة مع تسجيل المصدر والعداد والمرجع.
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 p-2 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition"
                onClick={() => setEditing(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-6">
              <FormBlock title="نوع الحركة والربط">
                <Select name="type" label="نوع الحركة" value={editing.type} options={['صرف', 'استلام', 'تسوية'].map((v) => ({ v, l: v }))} />
                <Select
                  name="assetId"
                  label="الأصل"
                  value={editing.assetId ?? ''}
                  options={[{ v: '', l: '— بدون أصل —' }, ...assets.map((x) => ({ v: x.id, l: `${x.name} — ${x.code}` }))]}
                />
                <Select
                  name="proj"
                  label="المشروع"
                  value={editing.proj ?? ''}
                  options={[{ v: '', l: 'المقر / بدون مشروع' }, ...projects.map((x) => ({ v: x.id, l: `${x.name} — ${x.code}` }))]}
                />
                <Select name="tank" label="الخزان" value={editing.tank ?? ''} options={[{ v: '', l: '— بدون خزان —' }]} />
              </FormBlock>
              <FormBlock title="الكمية والتكلفة">
                <Field name="date" label="التاريخ" value={editing.date} type="date" />
                <Field name="qty" label="الكمية لتر" value={String(editing.qty)} type="number" />
                <Field name="price" label="سعر اللتر" value={String(editing.price)} type="number" />
                <Field name="total" label="الإجمالي" value={String(editing.total)} type="number" />
                <Field name="meter" label="عداد الأصل وقت الحركة" value={String(editing.meter ?? 0)} type="number" />
              </FormBlock>
              <FormBlock title="المصدر والمستند">
                <Field name="station" label="المحطة / المورد" value={editing.station ?? ''} />
                <Field name="sup" label="المورد" value={editing.sup ?? ''} />
                <Field name="inv" label="رقم الفاتورة / الإيصال" value={editing.inv ?? ''} />
                <Select name="status" label="الحالة" value={editing.status} options={['مسجلة', 'معتمدة', 'مرفوضة'].map((v) => ({ v, l: v }))} />
              </FormBlock>
              <label className="block">
                <span className="text-xs font-medium text-gray-500 mb-1.5 block">ملاحظات الحركة</span>
                <textarea
                  name="notes"
                  defaultValue={editing.notes ?? ''}
                  rows={4}
                  placeholder="سبب الحركة، موقع التعبئة، ملاحظة فرق الكمية أو أي بيان مستندي..."
                  className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
                />
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
                إلغاء
              </Button>
              <Button loading={busy}>{busy ? 'جارٍ الحفظ...' : 'حفظ الحركة'}</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function Select({ name, label, value, options }: { name: string; label: string; value: string; options: { v: string; l: string }[] }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-500 mb-1.5 block">{label}</span>
      <select
        name={name}
        defaultValue={value}
        className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
      </select>
    </label>
  )
}

function Field({ name, label, value, type = 'text' }: { name: string; label: string; value: string; type?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-500 mb-1.5 block">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={value}
        className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
      />
    </label>
  )
}

function FormBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <strong className="text-sm font-semibold text-gray-800">{title}</strong>
        <span className="text-xs text-gray-400">بيانات متعلقة بحركة الوقود</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </section>
  )
}

const fmt = (n: number) => new Intl.NumberFormat(APP_LOCALE, { maximumFractionDigits: 1 }).format(n)
const fmtDate = (v: string) => (v ? new Intl.DateTimeFormat(APP_LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(v)) : '—')
