import { useState, type FormEvent } from 'react'
import { X, Clock } from 'lucide-react'
import type { DowntimeTrackingInsert } from '../types/breakdown'

interface DowntimeFormModalProps {
  breakdownId: string
  assetId: string
  driverId?: string | null
  drivers?: Array<{ id: string; name: string }>
  onClose: () => void
  onSave: (payload: DowntimeTrackingInsert) => Promise<void>
  busy?: boolean
}

export function DowntimeFormModal({
  breakdownId,
  assetId,
  driverId,
  drivers = [],
  onClose,
  onSave,
  busy = false,
}: DowntimeFormModalProps) {
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)

    const startDatetime = String(form.get('start_datetime') ?? '')
    const endDatetime = String(form.get('end_datetime') ?? '').trim()
    const driverDailyRate = Number(form.get('driver_daily_rate') ?? 0)
    const lostRevenuePerDay = Number(form.get('lost_revenue_per_day') ?? 0)
    const selectedDriver = String(form.get('driver_id') ?? '').trim() || null

    if (!startDatetime) return setError('تاريخ ووقت بداية التوقف مطلوب.')
    if (endDatetime && new Date(endDatetime).getTime() < new Date(startDatetime).getTime()) {
      return setError('تاريخ نهاية التوقف لا يمكن أن يكون قبل تاريخ البداية.')
    }
    if (driverDailyRate < 0 || lostRevenuePerDay < 0) return setError('المعدلات اليومية يجب أن تكون أرقامًا غير سالبة.')

    const payload: DowntimeTrackingInsert = {
      breakdown_event_id: breakdownId,
      asset_id: assetId,
      driver_id: selectedDriver || driverId || null,
      start_datetime: new Date(startDatetime).toISOString(),
      end_datetime: endDatetime ? new Date(endDatetime).toISOString() : null,
      driver_daily_rate: driverDailyRate,
      lost_revenue_per_day: lostRevenuePerDay,
      notes: String(form.get('notes') ?? '').trim() || null,
    }

    try {
      await onSave(payload)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تسجيل التوقف.')
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form
        className="modal-card wide form-modal-premium"
        role="dialog"
        aria-modal="true"
        aria-labelledby="downtime-modal-title"
        onSubmit={handleSubmit}
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <h2 id="downtime-modal-title" className="flex items-center gap-2">
              <Clock size={20} />
              <span>تسجيل فترة توقف للمعدة</span>
            </h2>
            <p>حدد الفترة والمعدلات اليومية لتحتسب مدة التوقف وخسارة الإيراد المرتبطة بها.</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="إغلاق"><X size={18} /></button>
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="form-sections">
          <div className="modal-context-strip">
            <strong>الأصل الحالي</strong>
            <span className="context-separator">•</span>
            <span>سيتم ربط فترة التوقف بالعطل والأصل المحددين حاليًا.</span>
          </div>

          <section className="form-section">
            <div className="form-section-head">
              <strong>فترة التوقف</strong>
              <span>البداية والنهاية</span>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>بداية التوقف <em className="required-mark">*</em></span>
                <input name="start_datetime" type="datetime-local" defaultValue={new Date().toISOString().slice(0, 16)} required />
              </label>
              <label className="field">
                <span>نهاية التوقف</span>
                <input name="end_datetime" type="datetime-local" />
              </label>
            </div>
          </section>

          <section className="form-section">
            <div className="form-section-head">
              <strong>التأثير المالي والتشغيلي</strong>
              <span>السائق والإيراد المفقود</span>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>السائق / المشغل المعني</span>
                <select name="driver_id" defaultValue={driverId ?? ''}>
                  <option value="">— اختر السائق —</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </label>
              <label className="field">
                <span>بدل التوقف اليومي للسائق (ج.م / يوم)</span>
                <input name="driver_daily_rate" type="number" min="0" step="any" defaultValue="0" placeholder="0.00" />
              </label>
              <label className="field">
                <span>خسارة الإيراد اليومية للأصل (ج.م / يوم)</span>
                <input name="lost_revenue_per_day" type="number" min="0" step="any" defaultValue="0" placeholder="0.00" />
              </label>
            </div>
          </section>

          <section className="form-section">
            <div className="form-section-head">
              <strong>ملاحظات واحتساب آلي</strong>
              <span>معلومات إضافية</span>
            </div>
            <div className="form-grid">
              <label className="field col-span-full">
                <span>ملاحظات سبب التوقف</span>
                <textarea name="notes" rows={3} placeholder="أي ملابسات متعلقة بتأخر الصيانة أو انتظار المعدة..." />
              </label>
              <div className="field-help col-span-full">
                يتم احتساب ساعات التوقف وتكلفة بدل السائق وخسارة الإيراد تلقائيًا من بيانات التواريخ والمعدلات المسجلة.
              </div>
            </div>
          </section>
        </div>

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose} disabled={busy}>إلغاء</button>
          <button type="submit" className="primary-button" disabled={busy}>{busy ? 'جارٍ الحفظ...' : 'تسجيل التوقف'}</button>
        </div>
      </form>
    </div>
  )
}
