import { useState, type FormEvent } from 'react'
import { X, CircleDollarSign } from 'lucide-react'
import type {
  CostCategory,
  MaintenanceCostItem,
  MaintenanceCostItemInsert,
} from '../types/breakdown'
import { COST_CATEGORY_LABELS } from '../types/breakdown'

interface CostItemFormModalProps {
  breakdownId: string
  clients?: Array<{ id: string; name: string }>
  initialData?: MaintenanceCostItem | null
  onClose: () => void
  onSave: (payload: MaintenanceCostItemInsert) => Promise<void>
  busy?: boolean
}

export function CostItemFormModal({
  breakdownId,
  clients = [],
  initialData,
  onClose,
  onSave,
  busy = false,
}: CostItemFormModalProps) {
  const [error, setError] = useState('')
  const [isBillable, setIsBillable] = useState(initialData?.is_billable ?? false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)

    const costCategory = form.get('cost_category') as CostCategory
    const description = String(form.get('description') ?? '').trim()
    const amount = Number(form.get('amount') ?? 0)
    const costDate = String(form.get('cost_date') ?? '')

    if (!description) return setError('وصف بند التكلفة مطلوب.')
    if (!costDate) return setError('تاريخ استحقاق التكلفة مطلوب.')
    if (!Number.isFinite(amount) || amount <= 0) return setError('المبلغ يجب أن يكون رقمًا موجبًا أكبر من صفر.')

    const payload: MaintenanceCostItemInsert = {
      breakdown_event_id: breakdownId,
      work_order_id: initialData?.work_order_id ?? null,
      cost_category: costCategory,
      description,
      amount,
      currency: String(form.get('currency') ?? 'EGP').trim() || 'EGP',
      vendor_name: String(form.get('vendor_name') ?? '').trim() || null,
      invoice_number: String(form.get('invoice_number') ?? '').trim() || null,
      cost_date: costDate,
      is_billable: isBillable,
      billed_to_client_id: isBillable ? (String(form.get('billed_to_client_id') ?? '').trim() || null) : null,
      attachments: initialData?.attachments ?? null,
    }

    try {
      await onSave(payload)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ بند التكلفة.')
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form
        className="modal-card wide form-modal-premium"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cost-modal-title"
        onSubmit={handleSubmit}
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <h2 id="cost-modal-title" className="flex items-center gap-2">
              <CircleDollarSign size={20} />
              <span>{initialData ? 'تعديل بند تكلفة' : 'إضافة بند تكلفة جديد'}</span>
            </h2>
            <p>سجل القيمة والمورد والفاتورة ثم حدد ما إذا كان البند قابلًا للفوترة على العميل.</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="form-sections">
          <section className="form-section">
            <div className="form-section-head">
              <strong>تفاصيل التكلفة</strong>
              <span>التصنيف والقيمة والوصف</span>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>تصنيف التكلفة <em className="required-mark">*</em></span>
                <select name="cost_category" defaultValue={initialData?.cost_category ?? 'spare_parts'} required>
                  {(Object.entries(COST_CATEGORY_LABELS) as [CostCategory, string][]).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>المبلغ <em className="required-mark">*</em></span>
                <input name="amount" type="number" min="0.01" step="any" defaultValue={initialData?.amount ?? ''} placeholder="0.00" required />
              </label>

              <label className="field col-span-full">
                <span>وصف البند / الفاتورة <em className="required-mark">*</em></span>
                <input name="description" defaultValue={initialData?.description ?? ''} placeholder="مثال: شراء طلمبة هيدروليك أصلية..." required />
              </label>

              <label className="field">
                <span>تاريخ التكلفة / الفاتورة <em className="required-mark">*</em></span>
                <input name="cost_date" type="date" defaultValue={initialData?.cost_date ?? new Date().toISOString().slice(0, 10)} required />
              </label>

              <label className="field">
                <span>العملة</span>
                <select name="currency" defaultValue={initialData?.currency ?? 'EGP'}>
                  <option value="EGP">جنيه مصري (EGP)</option>
                  <option value="SAR">ريال سعودي (SAR)</option>
                  <option value="USD">دولار أمريكي (USD)</option>
                  <option value="EUR">يورو (EUR)</option>
                </select>
              </label>
            </div>
          </section>

          <section className="form-section">
            <div className="form-section-head">
              <strong>المورد والمستندات</strong>
              <span>الطرف المنفذ ومرجع الفاتورة</span>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>المورد / مقدم الخدمة / الفني</span>
                <input name="vendor_name" defaultValue={initialData?.vendor_name ?? ''} placeholder="اسم الورشة أو محل قطع الغيار" />
              </label>

              <label className="field">
                <span>رقم الفاتورة / المستند</span>
                <input name="invoice_number" defaultValue={initialData?.invoice_number ?? ''} placeholder="رقم الفاتورة أو إيصال الصرف" />
              </label>
            </div>
          </section>

          <section className="form-section">
            <div className="form-section-head">
              <strong>الفوترة على العميل</strong>
              <span>اختياري</span>
            </div>
            <div className="form-grid">
              <label className="field col-span-full">
                <span className="flex items-center gap-2">
                  <input type="checkbox" checked={isBillable} onChange={e => setIsBillable(e.target.checked)} />
                  قابل للفوترة وتحميله على حساب العميل
                </span>
              </label>

              {isBillable && (
                <label className="field col-span-full">
                  <span>العميل المسؤول عن السداد</span>
                  <select name="billed_to_client_id" defaultValue={initialData?.billed_to_client_id ?? ''}>
                    <option value="">— اختر العميل —</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
              )}
            </div>
          </section>
        </div>

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose} disabled={busy}>إلغاء</button>
          <button type="submit" className="primary-button" disabled={busy}>
            {busy ? 'جارٍ الحفظ...' : initialData ? 'حفظ التعديل' : 'إضافة بند التكلفة'}
          </button>
        </div>
      </form>
    </div>
  )
}
