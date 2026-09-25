import { useMemo, useState, type FormEvent } from 'react'
import { AlertTriangle, CheckCheck, FileCheck2, Plus, ShieldCheck, Users, X } from 'lucide-react'
import type { Asset, Driver } from '../types/tfms'
import { Button, DataTable, EmptyState, PageHeader, StatusBadge } from '../components/ui'
import { FormSection } from '../shared/ui'
import '../styles/drivers-page.css'

type Props = {
  drivers: Driver[]
  assets: Asset[]
  canEdit: boolean
  onSave: (record: Record<string, unknown>) => Promise<void>
}

type DriverForm = Driver & Record<string, unknown>

type LicenseHealth = 'سارية' | 'تجديد قريب' | 'منتهية' | 'غير محددة'

const EMPTY_DRIVER: Driver = {
  id: '',
  code: '',
  name: '',
  phone: '',
  kind: '',
  licNo: '',
  licExp: '',
  cur: '',
  status: 'نشط',
}

/** Enterprise driver/operator registry with a focused executive summary and responsive drill-down. */
export function DriversPage({ drivers, assets, canEdit, onSave }: Props) {
  const [editing, setEditing] = useState<DriverForm | null>(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  const assetByDriver = useMemo(() => {
    const map = new Map<string, Asset>()
    for (const asset of assets) {
      if (asset.drv) map.set(asset.drv, asset)
    }
    return map
  }, [assets])

  const rows = useMemo(() => drivers.map(driver => {
    const asset = assetByDriver.get(driver.id)
    return {
      ...driver,
      currentAsset: asset?.name ?? driver.cur ?? '',
      currentAssetId: asset?.code ?? '',
      licenseHealth: getLicenseHealth(driver.licExp),
    }
  }), [drivers, assetByDriver])

  const driverCounts = useMemo(() => ({
    total: rows.length,
    active: rows.filter(row => row.status === 'نشط').length,
    assigned: rows.filter(row => Boolean(row.currentAsset)).length,
    expiring: rows.filter(row => row.licenseHealth === 'تجديد قريب').length,
    expired: rows.filter(row => row.licenseHealth === 'منتهية').length,
  }), [rows])

  function openNew() {
    setFormError('')
    setEditing({ ...EMPTY_DRIVER, id: `DRV-${Date.now()}` })
  }

  function openEdit(driver: Driver) {
    setFormError('')
    setEditing({ ...driver })
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return

    const fd = new FormData(event.currentTarget)
    const next: DriverForm = {
      ...editing,
      code: String(fd.get('code') ?? '').trim(),
      name: String(fd.get('name') ?? '').trim(),
      phone: String(fd.get('phone') ?? '').trim(),
      kind: String(fd.get('kind') ?? '').trim(),
      employeeNo: String(fd.get('employeeNo') ?? '').trim(),
      shift: String(fd.get('shift') ?? '').trim(),
      licNo: String(fd.get('licNo') ?? '').trim(),
      licType: String(fd.get('licType') ?? '').trim(),
      licExp: String(fd.get('licExp') ?? ''),
      medicalExp: String(fd.get('medicalExp') ?? ''),
      cur: String(fd.get('cur') ?? '').trim(),
      joinDate: String(fd.get('joinDate') ?? ''),
      status: String(fd.get('status') ?? 'نشط'),
    }

    if (!next.code || !next.name || !next.licNo) {
      setFormError('أكمل الحقول الإلزامية: الكود، الاسم، ورقم الرخصة / الشهادة.')
      return
    }

    setFormError('')
    setBusy(true)
    try {
      await onSave(next)
      setEditing(null)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'تعذر حفظ السجل. حاول مرة أخرى.')
    } finally {
      setBusy(false)
    }
  }

  const columns = [
    {
      id: 'name',
      header: 'السائق / المشغل',
      sortValue: (row: typeof rows[number]) => row.name,
      render: (row: typeof rows[number]) => (
        <div className="drivers-table-person">
          <strong>{row.name}</strong>
          <span>{row.code || 'بدون كود'}</span>
        </div>
      ),
    },
    {
      id: 'kind',
      header: 'التخصص',
      sortValue: (row: typeof rows[number]) => row.kind ?? '',
      render: (row: typeof rows[number]) => row.kind || '—',
      mobileVisible: true,
    },
    {
      id: 'phone',
      header: 'التواصل',
      sortValue: (row: typeof rows[number]) => row.phone ?? '',
      render: (row: typeof rows[number]) => row.phone || '—',
      mobileVisible: false,
    },
    {
      id: 'licExp',
      header: 'الرخصة',
      sortValue: (row: typeof rows[number]) => row.licExp ?? '',
      render: (row: typeof rows[number]) => <LicenseCell date={row.licExp} health={row.licenseHealth} />,
      exportValue: (row: typeof rows[number]) => `${row.licExp || ''} - ${row.licenseHealth}`,
      mobileVisible: true,
    },
    {
      id: 'currentAsset',
      header: 'الأصل الحالي',
      sortValue: (row: typeof rows[number]) => row.currentAsset,
      render: (row: typeof rows[number]) => row.currentAsset ? (
        <div className="drivers-asset-cell">
          <strong>{row.currentAsset}</strong>
          {row.currentAssetId && <span>{row.currentAssetId}</span>}
        </div>
      ) : <span className="drivers-muted">غير مرتبط</span>,
      mobileVisible: true,
    },
    {
      id: 'status',
      header: 'الحالة',
      sortValue: (row: typeof rows[number]) => String(row.status ?? 'نشط'),
      render: (row: typeof rows[number]) => <StatusBadge dot>{String(row.status ?? 'نشط')}</StatusBadge>,
      mobileVisible: true,
    },
    {
      id: 'actions',
      header: 'الإجراء',
      sortable: false,
      searchable: false,
      hideable: false,
      render: (row: typeof rows[number]) => canEdit ? (
        <button type="button" className="drivers-row-action" onClick={event => { event.stopPropagation(); openEdit(row) }} aria-label={`تعديل ${row.name}`}>
          تعديل
        </button>
      ) : <span className="drivers-muted">عرض فقط</span>,
      mobileVisible: false,
    },
  ]

  return (
    <div className="drivers-page">
      <PageHeader
        title="السائقون والمشغلون"
        description="سجل تشغيلي موحد لحالة السائقين، صلاحية الرخص، والتكليف الحالي."
        meta={<span className="drivers-header-meta"><Users size={15} /> {driverCounts.total} سجل</span>}
        action={canEdit ? <Button className="drivers-primary-action" onClick={openNew}><Plus size={16} /> إضافة سائق / مشغل</Button> : undefined}
      />

      <section className="drivers-overview" aria-label="ملخص السائقين والمشغلين">
        <div className="drivers-section-label">
          <span>ملخص تشغيلي</span>
          <span className="drivers-section-note">المؤشرات تعرض الحالة الحالية من البيانات المسجلة</span>
        </div>
        <div className="drivers-metrics">
          <Metric icon={Users} label="إجمالي السائقين" value={driverCounts.total} />
          <Metric icon={CheckCheck} label="نشط الآن" value={driverCounts.active} tone="green" />
          <Metric icon={ShieldCheck} label="مكلفون بأصل" value={driverCounts.assigned} tone="blue" />
          <Metric icon={AlertTriangle} label="تجديد خلال 30 يوم" value={driverCounts.expiring} tone="amber" />
          <Metric icon={FileCheck2} label="رخص منتهية" value={driverCounts.expired} tone="red" />
        </div>
      </section>

      <section className="drivers-registry-card" aria-label="سجل السائقين والمشغلين">
        <div className="drivers-registry-head">
          <div>
            <h2>سجل السائقين والمشغلين</h2>
            <p>استخدم البحث والفلاتر للوصول للسجل المطلوب، ثم افتح التعديل عند الحاجة.</p>
          </div>
          <div className="drivers-registry-status" aria-live="polite">
            {driverCounts.expired > 0 && <StatusBadge tone="red" dot>{driverCounts.expired} رخص منتهية</StatusBadge>}
            {driverCounts.expiring > 0 && <StatusBadge tone="amber" dot>{driverCounts.expiring} تجديد قريب</StatusBadge>}
          </div>
        </div>

        {!rows.length ? (
          <div className="drivers-empty-shell">
            <EmptyState
              title="لا توجد سجلات سائقين ومشغلين"
              description="لم يتم تسجيل أي سائق أو مشغل فعلي في قاعدة البيانات حتى الآن."
              action={canEdit ? <Button variant="secondary" onClick={openNew}>إضافة أول سجل</Button> : undefined}
            />
          </div>
        ) : (
          <DataTable
            rows={rows}
            columns={columns}
            rowKey={row => row.id}
            pageSize={12}
            pageSizeOptions={[12, 24, 48]}
            initialSort={{ columnId: 'name', direction: 'asc' }}
            searchPlaceholder="بحث بالاسم أو الكود أو التخصص..."
            searchableText={row => [row.name, row.code, row.kind, row.phone, row.currentAsset, row.currentAssetId].filter(Boolean).join(' ')}
            enableColumnVisibility
            columnVisibilityStorageKey="kemex.drivers.columns.v2"
            exportable
            exportFileName="KEMEX-drivers"
            mobilePresentation="cards"
            onRowClick={canEdit ? openEdit : undefined}
            filters={[
              { id: 'status', label: 'الحالة', options: [{ value: 'نشط', label: 'نشط' }, { value: 'غير نشط', label: 'غير نشط' }, { value: 'إجازة', label: 'إجازة' }, { value: 'موقوف', label: 'موقوف' }], getValue: row => String(row.status ?? 'نشط') },
              { id: 'license', label: 'صلاحية الرخصة', options: [{ value: 'سارية', label: 'سارية' }, { value: 'تجديد قريب', label: 'تجديد قريب' }, { value: 'منتهية', label: 'منتهية' }, { value: 'غير محددة', label: 'غير محددة' }], getValue: row => row.licenseHealth },
            ]}
          />
        )}
      </section>

      {editing && (
        <div className="modal-backdrop drivers-modal-backdrop" onMouseDown={() => !busy && setEditing(null)}>
          <form className="modal-card wide form-modal-premium drivers-modal" onSubmit={submit} onMouseDown={event => event.stopPropagation()} aria-labelledby="driver-form-title">
            <div className="modal-head drivers-modal-head">
              <div>
                <div className="form-kicker">ملف تشغيلي</div>
                <h2 id="driver-form-title">{drivers.some(item => item.id === editing.id) ? 'تعديل سائق / مشغل' : 'إضافة سائق / مشغل'}</h2>
                <p>البيانات الأساسية، الوظيفية، الرخصة، والتكليف الحالي في نموذج واحد منظم.</p>
              </div>
              <button type="button" className="icon-button" onClick={() => !busy && setEditing(null)} aria-label="إغلاق النموذج"><X size={18} /></button>
            </div>

            {formError && <div className="drivers-form-error" role="alert">{formError}</div>}

            <div className="form-sections drivers-form-sections">
              <FormSection title="البيانات الأساسية">
                <Field name="code" label="الكود" value={String(editing.code ?? '')} required autoComplete="off" />
                <Field name="name" label="الاسم" value={String(editing.name ?? '')} required autoComplete="name" />
                <Field name="phone" label="الهاتف" value={String(editing.phone ?? '')} type="tel" autoComplete="tel" />
                <Field name="kind" label="التخصص" value={String(editing.kind ?? '')} />
              </FormSection>

              <FormSection title="البيانات الوظيفية">
                <Field name="employeeNo" label="رقم الموظف" value={String(editing.employeeNo ?? '')} autoComplete="off" />
                <Field name="shift" label="الوردية" value={String(editing.shift ?? '')} />
                <Field name="joinDate" label="تاريخ بدء العمل" type="date" value={String(editing.joinDate ?? '')} />
                <Select name="status" label="الحالة" value={String(editing.status ?? 'نشط')} options={['نشط', 'غير نشط', 'إجازة', 'موقوف']} />
              </FormSection>

              <FormSection title="الرخصة والتأهيل">
                <Field name="licNo" label="رقم الرخصة / الشهادة" value={String(editing.licNo ?? '')} required autoComplete="off" />
                <Field name="licType" label="نوع الرخصة" value={String(editing.licType ?? '')} />
                <Field name="licExp" label="تاريخ انتهاء الرخصة" type="date" value={String(editing.licExp ?? '')} />
                <Field name="medicalExp" label="انتهاء الكشف الطبي" type="date" value={String(editing.medicalExp ?? '')} />
              </FormSection>

              <FormSection title="التكليف الحالي">
                <Field name="cur" label="وصف التكليف" value={String(editing.cur ?? '')} />
              </FormSection>
            </div>

            <div className="modal-actions drivers-modal-actions">
              <button type="button" className="secondary-button" onClick={() => !busy && setEditing(null)}>إلغاء</button>
              <button className="primary-button" disabled={busy}>{busy ? 'جارٍ الحفظ...' : 'حفظ السجل'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function getLicenseHealth(value?: string): LicenseHealth {
  if (!value) return 'غير محددة'
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return 'غير محددة'
  const days = Math.ceil((timestamp - Date.now()) / 86400000)
  if (days < 0) return 'منتهية'
  if (days <= 30) return 'تجديد قريب'
  return 'سارية'
}

function formatDate(value?: string) {
  if (!value) return 'غير محدد'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return value
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear())
  return `${day}/${month}/${year}`
}

function LicenseCell({ date, health }: { date?: string; health: LicenseHealth }) {
  const badgeText = health === 'تجديد قريب' ? expiryBadgeText(date) : health
  const tone = health === 'منتهية' ? 'red' : health === 'تجديد قريب' ? 'amber' : health === 'سارية' ? 'emerald' : 'gray'
  return (
    <div className="drivers-license-cell">
      <span>{date ? formatDate(date) : 'غير محدد'}</span>
      <StatusBadge tone={tone}>{badgeText}</StatusBadge>
    </div>
  )
}

function expiryBadgeText(value?: string) {
  if (!value) return 'تجديد قريب'
  const date = new Date(value).getTime()
  if (!Number.isFinite(date)) return 'تجديد قريب'
  const days = Math.max(0, Math.ceil((date - Date.now()) / 86400000))
  return `متبقي ${days} يوم`
}

function Metric({ icon: Icon, label, value, tone = 'default' }: { icon: typeof Users; label: string; value: string | number; tone?: 'default' | 'green' | 'blue' | 'amber' | 'red' }) {
  return (
    <article className={`drivers-metric drivers-metric--${tone}`}>
      <div className="drivers-metric-icon"><Icon size={18} /></div>
      <div className="drivers-metric-body"><span>{label}</span><strong>{value}</strong></div>
    </article>
  )
}

function Field({ name, label, value, type = 'text', required, autoComplete }: { name: string; label: string; value: string; type?: string; required?: boolean; autoComplete?: string }) {
  return <label className="field"><span>{label}{required && <em className="required-mark"> *</em>}</span><input name={name} type={type} defaultValue={value} required={required} autoComplete={autoComplete} /></label>
}

function Select({ name, label, value, options }: { name: string; label: string; value: string; options: string[] }) {
  return <label className="field"><span>{label}</span><select name={name} defaultValue={value}>{options.map(option => <option key={option} value={option}>{option}</option>)}</select></label>
}
