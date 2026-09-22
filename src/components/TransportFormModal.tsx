import { useState, type FormEvent } from 'react'
import { X, Truck } from 'lucide-react'
import type {
  MaintenanceTransportInsert,
  TransportDirection,
  TransportType,
} from '../types/breakdown'
import { TRANSPORT_TYPE_LABELS } from '../types/breakdown'

interface TransportFormModalProps {
  breakdownId: string
  onClose: () => void
  onSave: (payload: MaintenanceTransportInsert) => Promise<void>
  busy?: boolean
}

const DIRECTION_LABELS: Record<TransportDirection, string> = {
  to_workshop: 'نقل إلى الورشة (ذهاب)',
  to_site: 'نقل عودة إلى الموقع',
  internal: 'نقل داخلي بين المواقع',
}

export function TransportFormModal({
  breakdownId,
  onClose,
  onSave,
  busy = false,
}: TransportFormModalProps) {
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)

    const transportCost = Number(form.get('transport_cost') ?? 0)
    const transportDate = String(form.get('transport_date') ?? '')
    const direction = form.get('direction') as TransportDirection
    const transportType = form.get('transport_type') as TransportType

    if (!transportDate) {
      setError('تاريخ النقل مطلوب.')
      return
    }

    if (!Number.isFinite(transportCost) || transportCost < 0) {
      setError('تكلفة النقل يجب أن تكون رقمًا غير سالب.')
      return
    }

    const payload: MaintenanceTransportInsert = {
      breakdown_event_id: breakdownId,
      work_order_id: null,
      direction,
      transport_type: transportType,
      from_location: String(form.get('from_location') ?? '').trim() || null,
      to_location: String(form.get('to_location') ?? '').trim() || null,
      transport_date: new Date(transportDate).toISOString(),
      transport_cost: transportCost,
      vendor_name: String(form.get('vendor_name') ?? '').trim() || null,
      driver_name: String(form.get('driver_name') ?? '').trim() || null,
      plate_number: String(form.get('plate_number') ?? '').trim() || null,
      notes: String(form.get('notes') ?? '').trim() || null,
    }

    try {
      await onSave(payload)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ حركة النقل.')
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form
        className="modal-card wide form-modal-premium"
        role="dialog"
        aria-modal="true"
        aria-labelledby="transport-modal-title"
        onSubmit={handleSubmit}
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <h2 id="transport-modal-title" className="flex items-center gap-2">
              <Truck size={20} />
              <span>تسجيل حركة نقل جديدة</span>
            </h2>
            <p>أدخل بيانات الحركة الأساسية والتكلفة حتى تُحتسب ضمن التكلفة المباشرة للعطل.</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="form-sections">
          <div className="modal-context-strip">
            <strong>حركة مرتبطة بالعطل</strong>
            <span className="context-separator">•</span>
            <span>سيتم حفظ الحركة ضمن سجل تكلفة العطل الحالي.</span>
          </div>

          <section className="form-section">
            <div className="form-section-head">
              <strong>بيانات الحركة</strong>
              <span>النوع والاتجاه والتوقيت</span>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>اتجاه النقل <em className="required-mark">*</em></span>
                <select name="direction" defaultValue="to_workshop" required>
                  {(Object.entries(DIRECTION_LABELS) as [TransportDirection, string][]).map(
                    ([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    )
                  )}
                </select>
              </label>

              <label className="field">
                <span>نوع وسيلة النقل <em className="required-mark">*</em></span>
                <select name="transport_type" defaultValue="tow_truck" required>
                  {(Object.entries(TRANSPORT_TYPE_LABELS) as [TransportType, string][]).map(
                    ([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    )
                  )}
                </select>
              </label>

              <label className="field">
                <span>تاريخ ووقت النقل <em className="required-mark">*</em></span>
                <input
                  name="transport_date"
                  type="datetime-local"
                  defaultValue={new Date().toISOString().slice(0, 16)}
                  required
                />
              </label>

              <label className="field">
                <span>تكلفة النقل (ج.م) <em className="required-mark">*</em></span>
                <input
                  name="transport_cost"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  required
                />
              </label>
            </div>
          </section>

          <section className="form-section">
            <div className="form-section-head">
              <strong>المسار والتنفيذ</strong>
              <span>الموقع والمورد وبيانات الوسيلة</span>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>مكان التحرك (من)</span>
                <input name="from_location" placeholder="الموقع الميداني / كم..." />
              </label>

              <label className="field">
                <span>الوجهة (إلى)</span>
                <input name="to_location" placeholder="الورشة الرئيسية / ورشة خارجية..." />
              </label>

              <label className="field">
                <span>الشركة / المورد المنفذ للنقل</span>
                <input name="vendor_name" placeholder="اسم شركة الأوناش / مقاول النقل" />
              </label>

              <label className="field">
                <span>اسم سائق وسيلة النقل</span>
                <input name="driver_name" placeholder="اسم سائق الونش" />
              </label>

              <label className="field">
                <span>رقم لوحة وسيلة النقل</span>
                <input name="plate_number" placeholder="أرقام وحروف لوحة الونش/التريلا" />
              </label>
            </div>
          </section>

          <section className="form-section">
            <div className="form-section-head">
              <strong>ملاحظات</strong>
              <span>تفاصيل تشغيلية إضافية</span>
            </div>
            <div className="form-grid">
              <label className="field col-span-full">
                <span>ملاحظات إضافية</span>
                <textarea name="notes" rows={3} placeholder="أي تفاصيل تخص التحميل أو السحب أو الانتظار..." />
              </label>
            </div>
          </section>
        </div>

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose} disabled={busy}>
            إلغاء
          </button>
          <button type="submit" className="primary-button" disabled={busy}>
            {busy ? 'جارٍ الحفظ...' : 'حفظ حركة النقل'}
          </button>
        </div>
      </form>
    </div>
  )
}
