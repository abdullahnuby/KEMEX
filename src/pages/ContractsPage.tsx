import { ClipboardCheck, FileClock, FileText, Pencil, Plus, ShieldAlert, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { Asset, Contract } from '../types/tfms'
import { Button, DataTable, PageHeader, StatusBadge } from '../components/ui'
import { FormField, FormModal, FormSection, OperationalSummaryStrip, useToast } from '../shared/ui'
import { PrintRecordButton } from '../shared/printing'
import { useCurrency } from '../features/settings'

type ContractRecord = Contract & Record<string, unknown>

type Props = {
  records: Record<string, unknown>[]
  assets: Asset[]
  canEdit: boolean
  onSave: (record: Record<string, unknown>) => Promise<void> | void
  onDelete: (id: string) => Promise<void> | void
}

type ContractDraft = ContractRecord & {
  contractType: string
  renewal: string
  fuelT: string
  operT: string
  maintT: string
  fuelIncluded: string
  operatorIncluded: string
  maintenanceIncluded: string
  address: string
  notes: string
}

function dateOnly(offsetDays = 0) {
  const value = new Date()
  value.setDate(value.getDate() + offsetDays)
  return value.toISOString().slice(0, 10)
}

function daysUntil(value: string) {
  const target = new Date(`${value}T23:59:59`).getTime()
  return Math.ceil((target - Date.now()) / 86400000)
}

function contractStatus(record: Record<string, unknown>) {
  const explicit = String(record.status ?? '').trim()
  const end = String(record.end ?? '').trim()
  if (!end) return explicit || 'مسودة'
  const remaining = daysUntil(end)
  if (explicit === 'ملغى') return explicit
  if (remaining < 0) return 'منتهي'
  if (remaining <= 30) return 'قريب الانتهاء'
  return explicit || 'ساري'
}

function assetIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  return String(value ?? '').split(',').map(item => item.trim()).filter(Boolean)
}

function createDraft(assets: Asset[]): ContractDraft {
  const start = dateOnly()
  const end = dateOnly(30)
  return {
    id: `CON-${Date.now()}`,
    number: `CTR-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
    lessor: '',
    phone: '',
    assets: assets[0]?.id ?? '',
    start,
    end,
    rate: 0,
    unit: 'يوم',
    minimum: 0,
    fuelT: '',
    operT: '',
    maintT: '',
    status: 'ساري',
    notes: '',
    contractType: 'تأجير معدات',
    renewal: dateOnly(0),
    address: '',
    fuelIncluded: 'لا',
    operatorIncluded: 'لا',
    maintenanceIncluded: 'لا',
  }
}

function normalizeRecord(record: Record<string, unknown>): ContractDraft {
  return {
    ...(record as ContractDraft),
    id: String(record.id ?? `CON-${Date.now()}`),
    number: String(record.number ?? ''),
    lessor: String(record.lessor ?? ''),
    phone: String(record.phone ?? ''),
    assets: Array.isArray(record.assets) ? record.assets.map(String) : String(record.assets ?? ''),
    start: String(record.start ?? ''),
    end: String(record.end ?? ''),
    rate: Number(record.rate ?? 0),
    unit: String(record.unit ?? 'يوم'),
    minimum: Number(record.minimum ?? 0),
    status: String(record.status ?? 'ساري'),
    contractType: String(record.contractType ?? 'تأجير معدات'),
    renewal: String(record.renewal ?? ''),
    address: String(record.address ?? ''),
    fuelT: String(record.fuelT ?? ''),
    operT: String(record.operT ?? ''),
    maintT: String(record.maintT ?? ''),
    fuelIncluded: String(record.fuelIncluded ?? (record.fuelT ? 'نعم' : 'لا')),
    operatorIncluded: String(record.operatorIncluded ?? (record.operT ? 'نعم' : 'لا')),
    maintenanceIncluded: String(record.maintenanceIncluded ?? (record.maintT ? 'نعم' : 'لا')),
    notes: String(record.notes ?? ''),
  }
}

export function ContractsPage({ records, assets, canEdit, onSave, onDelete }: Props) {
  const [editing, setEditing] = useState<ContractDraft | null>(null)
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const { show } = useToast()
  const { formatMoney } = useCurrency()

  const rows = useMemo(() => records.map(normalizeRecord), [records])
  const counts = useMemo(() => {
    const statuses = rows.map(contractStatus)
    return {
      all: rows.length,
      active: statuses.filter(value => value === 'ساري').length,
      expiring: statuses.filter(value => value === 'قريب الانتهاء').length,
      expired: statuses.filter(value => value === 'منتهي').length,
    }
  }, [rows])

  const filteredRows = useMemo(() => {
    if (statusFilter === 'all') return rows
    return rows.filter(row => contractStatus(row) === statusFilter)
  }, [rows, statusFilter])

  useEffect(() => {
    if (!editing) return
    setError('')
  }, [editing?.id])

  function openNew() {
    setError('')
    setDirty(false)
    setEditing(createDraft(assets))
  }

  function openEdit(record: ContractDraft) {
    setError('')
    setDirty(false)
    setEditing(normalizeRecord(record))
  }

  function closeForm() {
    if (busy) return
    setEditing(null)
    setDirty(false)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing || busy) return
    const form = new FormData(event.currentTarget)
    const selectedAssets = form.getAll('assets').map(String).filter(Boolean)
    const start = String(form.get('start') ?? '')
    const end = String(form.get('end') ?? '')
    const rate = Number(form.get('rate') ?? 0)
    const minimum = Number(form.get('minimum') ?? 0)
    const next: ContractRecord = {
      ...editing,
      number: String(form.get('number') ?? '').trim(),
      contractType: String(form.get('contractType') ?? '').trim(),
      lessor: String(form.get('lessor') ?? '').trim(),
      phone: String(form.get('phone') ?? '').trim(),
      address: String(form.get('address') ?? '').trim(),
      assets: selectedAssets,
      start,
      end,
      renewal: String(form.get('renewal') ?? ''),
      rate,
      unit: String(form.get('unit') ?? 'يوم'),
      minimum,
      fuelIncluded: String(form.get('fuelIncluded') ?? 'لا'),
      operatorIncluded: String(form.get('operatorIncluded') ?? 'لا'),
      maintenanceIncluded: String(form.get('maintenanceIncluded') ?? 'لا'),
      fuelT: String(form.get('fuelT') ?? '').trim(),
      operT: String(form.get('operT') ?? '').trim(),
      maintT: String(form.get('maintT') ?? '').trim(),
      status: String(form.get('status') ?? 'ساري'),
      notes: String(form.get('notes') ?? '').trim(),
    }

    if (!next.number) return setError('رقم العقد مطلوب.')
    if (!next.lessor) return setError('اسم المؤجر مطلوب.')
    if (!start || !end) return setError('تاريخ البداية والنهاية مطلوبان.')
    if (end < start) return setError('تاريخ نهاية العقد يجب أن يكون بعد أو مساويًا لتاريخ البداية.')
    if (next.renewal && next.renewal > end) return setError('تاريخ التذكير بالتجديد يجب أن يسبق نهاية العقد.')
    if (!selectedAssets.length) return setError('اختر أصلًا واحدًا على الأقل للعقد.')
    if (!Number.isFinite(rate) || rate < 0 || !Number.isFinite(minimum) || minimum < 0) return setError('السعر والحد الأدنى يجب أن يكونا أرقامًا غير سالبة.')
    if (next.fuelIncluded === 'نعم' && !next.fuelT) return setError('اكتب شرط الوقود لأن العقد يشمل الوقود.')
    if (next.operatorIncluded === 'نعم' && !next.operT) return setError('اكتب شرط التشغيل لأن العقد يشمل التشغيل.')
    if (next.maintenanceIncluded === 'نعم' && !next.maintT) return setError('اكتب شرط الصيانة لأن العقد يشمل الصيانة.')

    setBusy(true)
    setError('')
    try {
      await onSave(next)
      setEditing(null)
      setDirty(false)
      show({ message: 'تم حفظ العقد بنجاح.', tone: 'success' })
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'تعذر حفظ العقد.')
      show({ message: 'تعذر حفظ العقد.', tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  async function remove(record: ContractDraft) {
    if (!record.id || busy) return
    if (!window.confirm(`هل تريد حذف العقد ${record.number || record.id}؟`)) return
    setBusy(true)
    try {
      await onDelete(String(record.id))
      show({ message: 'تم حذف العقد.', tone: 'success' })
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'تعذر حذف العقد.')
      show({ message: 'تعذر حذف العقد.', tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6 workflow-page contracts-page">
      <PageHeader
        title="عقود الإيجار والتأجير"
        description="إدارة دورة العقد من الربط بالأصل والتواريخ إلى الشروط والتجديد والامتثال والتكلفة."
        action={canEdit ? <Button icon={<Plus size={16} />} onClick={openNew}>عقد جديد</Button> : undefined}
      />

      <OperationalSummaryStrip items={[
        { id: 'all', label: 'إجمالي العقود', value: counts.all },
        { id: 'active', label: 'سارية', value: counts.active, tone: 'success' },
        { id: 'expiring', label: 'تنتهي خلال 30 يوم', value: counts.expiring, tone: counts.expiring ? 'alert' : 'default' },
        { id: 'expired', label: 'منتهية', value: counts.expired, tone: counts.expired ? 'alert' : 'default' },
      ]} />

      <div className="contracts-filter-bar" role="group" aria-label="تصفية العقود">
        {[
          ['all', `الكل (${counts.all})`],
          ['ساري', `سارية (${counts.active})`],
          ['قريب الانتهاء', `قريبة الانتهاء (${counts.expiring})`],
          ['منتهي', `منتهية (${counts.expired})`],
        ].map(([key, label]) => (
          <button key={key} type="button" className={statusFilter === key ? 'is-active' : ''} aria-pressed={statusFilter === key} onClick={() => setStatusFilter(key)}>{label}</button>
        ))}
      </div>

      {error && !editing ? <div className="global-error" role="alert">{error}</div> : null}

      <DataTable
        rows={filteredRows}
        rowKey={row => String(row.id)}
        pageSize={12}
        pageSizeOptions={[12, 24, 48]}
        stickyHeader
        enableColumnVisibility
        columnVisibilityStorageKey="kemex.contracts.columns.v2"
        exportable
        exportFileName="KEMEX-rental-contracts"
        searchPlaceholder="بحث برقم العقد أو المؤجر أو الأصل..."
        searchableText={row => {
          const names = assetIds(row.assets).map(id => {
            const asset = assets.find(item => item.id === id || item.code === id)
            return `${asset?.code ?? ''} ${asset?.name ?? ''}`
          }).join(' ')
          return `${row.number} ${row.lessor} ${row.phone ?? ''} ${row.contractType} ${names} ${contractStatus(row)}`
        }}
        filters={[
          { id: 'validity', label: 'المدة', options: [{ value: 'active', label: 'سارية' }, { value: 'expiring', label: 'خلال 30 يوم' }, { value: 'expired', label: 'منتهية' }], getValue: row => contractStatus(row) === 'ساري' ? 'active' : contractStatus(row) === 'قريب الانتهاء' ? 'expiring' : contractStatus(row) === 'منتهي' ? 'expired' : 'other' },
        ]}
        emptyState={<div className="px-6 py-16 text-center text-sm font-medium text-gray-500">لا توجد عقود مطابقة.</div>}
        columns={[
          { id: 'number', header: 'العقد', sortValue: row => String(row.number), exportValue: row => row.number, render: row => <div className="contract-table-title"><strong>{row.number || '—'}</strong><small>{row.contractType || '—'}</small></div> },
          { id: 'lessor', header: 'المؤجر', sortValue: row => String(row.lessor), exportValue: row => row.lessor },
          { id: 'assets', header: 'الأصول', sortValue: row => assetIds(row.assets).length, exportValue: row => assetIds(row.assets).map(id => assets.find(asset => asset.id === id || asset.code === id)?.name ?? id).join(' | '), render: row => <span>{assetIds(row.assets).map(id => assets.find(asset => asset.id === id || asset.code === id)?.name ?? id).join('، ') || '—'}</span> },
          { id: 'period', header: 'الفترة', sortValue: row => String(row.end), exportValue: row => `${row.start} → ${row.end}`, render: row => <div className="contract-period"><span>{String(row.start || '—')}</span><small>→</small><span>{String(row.end || '—')}</span></div> },
          { id: 'rate', header: 'السعر', sortValue: row => Number(row.rate || 0), exportValue: row => Number(row.rate || 0), render: row => <span>{formatMoney(Number(row.rate || 0))} / {String(row.unit || '—')}</span> },
          { id: 'status', header: 'الحالة', sortValue: row => contractStatus(row), exportValue: row => contractStatus(row), render: row => { const status = contractStatus(row); const tone = status === 'ساري' ? 'emerald' : status === 'منتهي' ? 'red' : status === 'قريب الانتهاء' ? 'amber' : 'blue'; return <StatusBadge tone={tone}>{status}</StatusBadge> } },
          { id: 'renewal', header: 'تذكير التجديد', sortValue: row => String(row.renewal || ''), exportValue: row => row.renewal, render: row => <span>{String(row.renewal || '—')}</span> },
          { id: 'actions', header: 'إجراءات', hideable: false, searchable: false, render: row => <div className="flex flex-wrap gap-2"><PrintRecordButton documentTitle="عقد إيجار / تأجير" documentNumber={String(row.number||row.id||'')} documentDate={String(row.start||'')} documentStatus={contractStatus(row)} meta={[{label:'المؤجر',value:String(row.lessor||'—')},{label:'الهاتف',value:String(row.phone||'—')},{label:'نوع العقد',value:String(row.contractType||'—')},{label:'فترة العقد',value:`${String(row.start||'—')} → ${String(row.end||'—')}`},{label:'التجديد',value:String(row.renewal||'—')},{label:'السعر',value:`${formatMoney(Number(row.rate||0))} / ${String(row.unit||'يوم')}`},{label:'الأصول',value:assetIds(row.assets).map(id=>assets.find(a=>a.id===id||a.code===id)?.name??id).join('، ')||'—'},{label:'العنوان',value:String(row.address||'—') }]} signatures={[{label:'المؤجر'},{label:'ممثل KEMEX'},{label:'مراجعة'},{label:'اعتماد'}]} footerNote="عقد صادر من نظام KEMEX لإدارة الأصول والتأجير."><div className="print-section-title">شروط العقد والخدمات المشمولة</div><table><tbody><tr><th>البند</th><th>التفاصيل</th></tr><tr><td>الوقود</td><td>{`${String(row.fuelIncluded||'لا')} — ${String(row.fuelT||'—')}`}</td></tr><tr><td>التشغيل</td><td>{`${String(row.operatorIncluded||'لا')} — ${String(row.operT||'—')}`}</td></tr><tr><td>الصيانة</td><td>{`${String(row.maintenanceIncluded||'لا')} — ${String(row.maintT||'—')}`}</td></tr><tr><td>الحد الأدنى</td><td>{formatMoney(Number(row.minimum||0))}</td></tr><tr><td>ملاحظات</td><td>{String(row.notes||'—')}</td></tr></tbody></table></PrintRecordButton>{canEdit && <><Button size="sm" variant="ghost" icon={<Pencil size={14} />} onClick={() => openEdit(row)}>تعديل</Button><Button size="sm" variant="danger" icon={<Trash2 size={14} />} onClick={() => void remove(row)}>حذف</Button></>}</div> },
        ]}
      />

      {!records.length ? <div className="enterprise-section-note"><FileText size={16} /><span>لا توجد عقود فعلية حاليًا؛ أنشئ أول عقد من الزر أعلاه لبدء دورة الربط والامتثال.</span></div> : null}

      {editing && (
        <FormModal
          title={records.some(record => String(record.id) === String(editing.id)) ? 'تعديل عقد' : 'إنشاء عقد'}
          subtitle="أكمل الهوية، الأطراف، الأصول، الفترة، التسعير والشروط قبل الحفظ."
          onClose={closeForm}
          busy={busy}
          dirty={dirty}
          wide
          actions={
            <>
              <Button type="button" variant="secondary" disabled={busy} onClick={closeForm}>إلغاء</Button>
              <Button type="submit" form="contracts-form" loading={busy}>حفظ العقد</Button>
            </>
          }
        >
          <form id="contracts-form" onSubmit={submit} onInput={() => { setDirty(true); setError('') }} className="space-y-4">
            {error ? <div className="global-error" role="alert">{error}</div> : null}
            <FormSection title="هوية العقد" description="المرجع التجاري ونوع العلاقة التعاقدية." columns={2}>
              <FormField label="رقم العقد" required><input name="number" defaultValue={editing.number} required /></FormField>
              <FormField label="نوع العقد" required><select name="contractType" defaultValue={editing.contractType} required><option>تأجير معدات</option><option>تأجير مركبات</option><option>تشغيل وصيانة</option></select></FormField>
              <FormField label="المؤجر" required><input name="lessor" defaultValue={editing.lessor} required /></FormField>
              <FormField label="الهاتف"><input name="phone" defaultValue={editing.phone ?? ''} inputMode="tel" /></FormField>
              <FormField label="العنوان" full><input name="address" defaultValue={editing.address} /></FormField>
            </FormSection>

            <FormSection title="الأصول والفترة" description="اربط العقد بالأصول الفعلية وحدد فترة السريان والتنبيه." columns={2}>
              <FormField label="الأصول المرتبطة" required help="يمكن اختيار أكثر من أصل.">
                <select name="assets" multiple defaultValue={assetIds(editing.assets)} size={Math.min(Math.max(assets.length, 2), 6)} required>
                  {assets.map(asset => <option key={asset.id} value={asset.id}>{asset.name} — {asset.code}</option>)}
                </select>
              </FormField>
              <FormField label="تاريخ البداية" required><input name="start" type="date" defaultValue={editing.start} required /></FormField>
              <FormField label="تاريخ النهاية" required><input name="end" type="date" defaultValue={editing.end} required /></FormField>
              <FormField label="تذكير التجديد"><input name="renewal" type="date" defaultValue={editing.renewal} /></FormField>
              <FormField label="الحالة"><select name="status" defaultValue={editing.status}><option>ساري</option><option>قيد التجديد</option><option>منتهي</option><option>ملغى</option></select></FormField>
            </FormSection>

            <FormSection title="التسعير" description="حدد أساس التكلفة والحد الأدنى دون خلطها مع القيمة الإجمالية." columns={3}>
              <FormField label="السعر" required><input name="rate" type="number" min="0" step="any" defaultValue={editing.rate} required /></FormField>
              <FormField label="الوحدة"><select name="unit" defaultValue={editing.unit}><option>ساعة</option><option>يوم</option><option>كم</option><option>شهر</option><option>رحلة</option></select></FormField>
              <FormField label="الحد الأدنى"><input name="minimum" type="number" min="0" step="any" defaultValue={editing.minimum ?? 0} /></FormField>
            </FormSection>

            <FormSection title="شروط التشغيل والصيانة" description="الحقول التفصيلية تظهر فقط عند تفعيل الشرط." columns={2}>
              <FormField label="يشمل الوقود؟"><select name="fuelIncluded" value={editing.fuelIncluded} onChange={event => setEditing(current => current ? { ...current, fuelIncluded: event.target.value } : current)}><option>لا</option><option>نعم</option></select></FormField>
              {editing.fuelIncluded === 'نعم' && <FormField label="شرط الوقود" full><textarea name="fuelT" value={editing.fuelT} onChange={event => setEditing(current => current ? { ...current, fuelT: event.target.value } : current)} rows={3} required /></FormField>}
              <FormField label="يشمل التشغيل / السائق؟"><select name="operatorIncluded" value={editing.operatorIncluded} onChange={event => setEditing(current => current ? { ...current, operatorIncluded: event.target.value } : current)}><option>لا</option><option>نعم</option></select></FormField>
              {editing.operatorIncluded === 'نعم' && <FormField label="شرط التشغيل" full><textarea name="operT" value={editing.operT} onChange={event => setEditing(current => current ? { ...current, operT: event.target.value } : current)} rows={3} required /></FormField>}
              <FormField label="يشمل الصيانة؟"><select name="maintenanceIncluded" value={editing.maintenanceIncluded} onChange={event => setEditing(current => current ? { ...current, maintenanceIncluded: event.target.value } : current)}><option>لا</option><option>نعم</option></select></FormField>
              {editing.maintenanceIncluded === 'نعم' && <FormField label="شرط الصيانة" full><textarea name="maintT" value={editing.maintT} onChange={event => setEditing(current => current ? { ...current, maintT: event.target.value } : current)} rows={3} required /></FormField>}
            </FormSection>

            <FormSection title="الملاحظات والامتثال" description="أي مرجع أو قيد يحتاج إلى مراجعة قبل الاعتماد." columns={1}>
              <FormField label="ملاحظات العقد" full><textarea name="notes" defaultValue={editing.notes} rows={4} /></FormField>
            </FormSection>
          </form>
          <div className="contracts-form-note">
            {counts.expiring > 0 ? <ShieldAlert size={15} /> : <ClipboardCheck size={15} />}
            <span>{counts.expiring > 0 ? `هناك ${counts.expiring} عقد قريب الانتهاء ويحتاج متابعة.` : 'لا توجد عقود منتهية خلال نافذة المتابعة الحالية.'}</span>
            <FileClock size={15} aria-hidden="true" />
          </div>
        </FormModal>
      )}
    </div>
  )
}
