import { useState, useMemo } from 'react'
import { APP_LOCALE } from '../shared/formatters/locale'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  HelpCircle,
  Truck,
  Wrench,
} from 'lucide-react'
import type { Asset, Driver, Project } from '../types/tfms'
import {
  type BreakdownEventInsert,
  type BreakdownSeverity,
  type MaintenanceTransportInsert,
  type MaintenanceCostItemInsert,
  type DowntimeTrackingInsert,
  type TransportDirection,
  type TransportType,
  SEVERITY_LABELS,
  TRANSPORT_TYPE_LABELS,
} from '../types/breakdown'
import {
  useCreateBreakdown,
  useCreateTransport,
  useCreateCostItem,
  useCreateDowntime,
} from '../hooks/useBreakdown'
import { PageHeader, useToast } from '../shared/ui'
import { useCurrency } from '../features/settings'

interface NewBreakdownWizardProps {
  assets: Asset[]
  projects: Project[]
  drivers?: Driver[]
  onRoute: (route: string) => void
  onBack: () => void
}

const STEPS = [
  { id: 1, title: 'بيانات العطل الأساسية', icon: AlertTriangle },
  { id: 2, title: 'الكشف والتشخيص الميداني', icon: Wrench },
  { id: 3, title: 'النقل والتحرك (الونش/التريلا)', icon: Truck },
  { id: 4, title: 'التوقف والتقدير المالي المبدئي', icon: Clock },
  { id: 5, title: 'مراجعة وتأكيد التسجيل', icon: CheckCircle2 },
]

export function NewBreakdownWizard({
  assets,
  projects,
  drivers = [],
  onRoute,
  onBack,
}: NewBreakdownWizardProps) {
  const toast = useToast()
  const { formatMoney } = useCurrency()

  const createBreakdownMut = useCreateBreakdown()
  const createTransportMut = useCreateTransport('')
  const createCostItemMut = useCreateCostItem('')
  const createDowntimeMut = useCreateDowntime('')

  const [currentStep, setCurrentStep] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Step 1: Breakdown Info
  const [assetId, setAssetId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [driverId, setDriverId] = useState('')
  const [breakdownDatetime, setBreakdownDatetime] = useState(() => new Date().toISOString().slice(0, 16))
  const [location, setLocation] = useState('')
  const [severity, setSeverity] = useState<BreakdownSeverity>('major')
  const [description, setDescription] = useState('')

  // Step 2: Diagnosis / Field Inspection
  const [hasDiagnosis, setHasDiagnosis] = useState(false)
  const [diagnosisDescription, setDiagnosisDescription] = useState('')
  const [diagnosisCost, setDiagnosisCost] = useState(0)
  const [diagnosisVendor, setDiagnosisVendor] = useState('')

  // Step 3: Transport
  const [needsTransport, setNeedsTransport] = useState(false)
  const [transportDirection, setTransportDirection] = useState<TransportDirection>('to_workshop')
  const [transportType, setTransportType] = useState<TransportType>('tow_truck')
  const [transportCost, setTransportCost] = useState(0)
  const [fromLocation, setFromLocation] = useState('')
  const [toLocation, setToLocation] = useState('')
  const [transportVendor, setTransportVendor] = useState('')
  const [transportPlate, setTransportPlate] = useState('')
  const [transportDriver, setTransportDriver] = useState('')

  // Step 4: Downtime & Initial Estimation
  const [trackDowntime, setTrackDowntime] = useState(true)
  const [driverDailyRate, setDriverDailyRate] = useState(0)
  const [lostRevenuePerDay, setLostRevenuePerDay] = useState(0)
  const [downtimeNotes, setDowntimeNotes] = useState('')

  // Lookups
  const selectedAsset = useMemo(() => assets.find(a => a.id === assetId), [assets, assetId])
  const selectedProject = useMemo(() => projects.find(p => p.id === projectId), [projects, projectId])
  const selectedDriver = useMemo(() => drivers.find(d => d.id === driverId), [drivers, driverId])

  // Automatically sync asset's project & driver when asset changes
  function handleAssetChange(id: string) {
    setAssetId(id)
    const a = assets.find(x => x.id === id)
    if (a) {
      if (a.proj && !projectId) setProjectId(a.proj)
      if (a.drv && !driverId) setDriverId(a.drv)
    }
  }

  // Validate step before advancing
  function validateCurrentStep(): boolean {
    setError('')
    if (currentStep === 1) {
      if (!assetId) {
        setError('يرجى اختيار المعدة / الأصل المعطل.')
        return false
      }
      if (!breakdownDatetime) {
        setError('يرجى تحديد تاريخ ووقت العطل.')
        return false
      }
      if (!description.trim()) {
        setError('يرجى كتابة وصف واضح للعطل.')
        return false
      }
    } else if (currentStep === 2) {
      if (hasDiagnosis && !diagnosisDescription.trim()) {
        setError('يرجى كتابة وصف أو تقرير الكشف والتشخيص الميداني.')
        return false
      }
      if (hasDiagnosis && diagnosisCost < 0) {
        setError('تكلفة الكشف يجب ألا تكون سالبة.')
        return false
      }
    } else if (currentStep === 3) {
      if (needsTransport && transportCost < 0) {
        setError('تكلفة النقل يجب ألا تكون سالبة.')
        return false
      }
    } else if (currentStep === 4) {
      if (driverDailyRate < 0 || lostRevenuePerDay < 0) {
        setError('المعدلات اليومية يجب ألا تكون سالبة.')
        return false
      }
    }
    return true
  }

  function nextStep() {
    if (validateCurrentStep()) {
      setCurrentStep(s => Math.min(5, s + 1))
    }
  }

  function prevStep() {
    setError('')
    setCurrentStep(s => Math.max(1, s - 1))
  }

  async function handleFinalSubmit() {
    if (!validateCurrentStep() || busy) return
    setBusy(true)
    setError('')

    try {
      // 1. Create Breakdown Event
      const breakdownPayload: BreakdownEventInsert = {
        asset_id: assetId,
        project_id: projectId || null,
        driver_id: driverId || null,
        work_order_id: null,
        breakdown_datetime: new Date(breakdownDatetime).toISOString(),
        location: location.trim() || null,
        description: description.trim(),
        severity,
        status: needsTransport ? 'awaiting_transport' : hasDiagnosis ? 'under_repair' : 'reported',
        recovery_datetime: null,
        created_by: null,
      }

      const createdBreakdown = await createBreakdownMut.mutateAsync(breakdownPayload)

      // 2. Create Diagnosis Cost Item if specified
      if (hasDiagnosis && diagnosisCost > 0) {
        try {
          const costPayload: MaintenanceCostItemInsert = {
            breakdown_event_id: createdBreakdown.id,
            work_order_id: null,
            cost_category: 'diagnosis',
            description: `كشف وتشخيص ميداني: ${diagnosisDescription.trim()}`,
            amount: diagnosisCost,
            currency: 'EGP',
            vendor_name: diagnosisVendor.trim() || null,
            invoice_number: null,
            cost_date: new Date(breakdownDatetime).toISOString().slice(0, 10),
            is_billable: false,
            billed_to_client_id: null,
            attachments: null,
          }
          await createCostItemMut.mutateAsync(costPayload)
        } catch (err) {
          console.error('Failed to create diagnosis cost item:', err)
        }
      }

      // 3. Create Transport Record if specified
      if (needsTransport) {
        try {
          const transportPayload: MaintenanceTransportInsert = {
            breakdown_event_id: createdBreakdown.id,
            work_order_id: null,
            direction: transportDirection,
            transport_type: transportType,
            from_location: fromLocation.trim() || location.trim() || null,
            to_location: toLocation.trim() || 'الورشة الرئيسية',
            transport_date: new Date(breakdownDatetime).toISOString(),
            transport_cost: transportCost,
            vendor_name: transportVendor.trim() || null,
            driver_name: transportDriver.trim() || null,
            plate_number: transportPlate.trim() || null,
            notes: null,
          }
          await createTransportMut.mutateAsync(transportPayload)
        } catch (err) {
          console.error('Failed to create transport record:', err)
        }
      }

      // 4. Create Initial Downtime Tracking if enabled
      if (trackDowntime) {
        try {
          const downtimePayload: DowntimeTrackingInsert = {
            breakdown_event_id: createdBreakdown.id,
            asset_id: assetId,
            driver_id: driverId || null,
            start_datetime: new Date(breakdownDatetime).toISOString(),
            end_datetime: null,
            driver_daily_rate: driverDailyRate,
            lost_revenue_per_day: lostRevenuePerDay,
            notes: downtimeNotes.trim() || 'بدء توقف الأصل فور الإبلاغ عن العطل',
          }
          await createDowntimeMut.mutateAsync(downtimePayload)
        } catch (err) {
          console.error('Failed to create downtime tracking:', err)
        }
      }

      toast.show({
        message: 'تم تسجيل بلاغ العطل بنجاح وبدء تتبع التكلفة الحقيقية.',
        tone: 'success',
      })

      // Navigate to detail page
      onRoute(`breakdowns/${createdBreakdown.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تسجيل العطل. حاول مرة أخرى.')
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[980px]">
      <PageHeader
        title="معالج تسجيل عطل جديد"
        description="تسجيل شامل لعطل المعدة وحساب تكاليف الكشف والنقل وبدلات التوقف والفرص الضائعة."
        action={
          <button type="button" className="secondary-button" onClick={onBack}>
            <ArrowRight size={16} /> إلغاء والعودة
          </button>
        }
      />

      {error && (
        <div className="global-error mb-4" role="alert">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Visual Stepper */}
      <section className="panel mb-5 px-5 py-4">
        <div
className="relative flex items-center justify-between gap-2 overflow-x-auto pb-1"
        >
          {STEPS.map((s, idx) => {
            const isDone = currentStep > s.id
            const isCurrent = currentStep === s.id
            const StepIcon = s.icon

            return (
              <div
                key={s.id}
className={`flex min-w-[130px] flex-1 flex-col items-center text-center ${currentStep >= s.id ? 'opacity-100' : 'opacity-60'}`} 
              >
                <div
className={`grid h-9 w-9 place-items-center rounded-full text-sm font-bold mb-1.5 ${isDone ? 'bg-primary-600 text-white' : isCurrent ? 'bg-primary-700 text-white ring-4 ring-primary-100' : 'bg-slate-200 text-slate-500'}`} 
                >
                  {isDone ? <Check size={18} strokeWidth={2.6} /> : <StepIcon size={16} />}
                </div>
                <span
className={`text-sm ${isCurrent ? 'font-bold text-primary-700' : isDone ? 'font-semibold text-slate-900' : 'font-medium text-slate-400'}`} 
                >
                  الخطوة {s.id}: {s.title}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      {/* Step Form Body */}
      <div className="panel p-6">
        {/* STEP 1: Basic Info */}
        {currentStep === 1 && (
          <div>
            <h2 className="mb-1 text-lg font-bold text-slate-900">
              الخطوة 1: بيانات العطل والمعدة
            </h2>
            <p className="mb-[18px] text-sm font-medium leading-6 text-slate-500">
              حدد الأصل المعطل والمشروع والسائق وتاريخ ووقت حدوث العطل.
            </p>

            <div className="form-grid">
              <label className="field">
                <span>المعدة / الأصل المعطل <em className="required-mark">*</em></span>
                <select
                  value={assetId}
                  onChange={e => handleAssetChange(e.target.value)}
                  required
                >
                  <option value="">— اختر المعدة أو الأصل —</option>
                  {assets.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.code}) — {a.status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>المشروع التابع له العطل</span>
                <select
                  value={projectId}
                  onChange={e => setProjectId(e.target.value)}
                >
                  <option value="">— المقر الرئيسي / بدون مشروع —</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>السائق / المشغل وقت العطل</span>
                <select
                  value={driverId}
                  onChange={e => setDriverId(e.target.value)}
                >
                  <option value="">— بدون تحديد سائق —</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>تاريخ ووقت العطل <em className="required-mark">*</em></span>
                <input
                  type="datetime-local"
                  value={breakdownDatetime}
                  onChange={e => setBreakdownDatetime(e.target.value)}
                  required
                />
              </label>

              <label className="field">
                <span>مكان / موقع حدوث العطل</span>
                <input
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="مثال: طريق السويس كم 45، موقع الحفر بمشروع العاصمة..."
                />
              </label>

              <label className="field">
                <span>درجة خطورة العطل <em className="required-mark">*</em></span>
                <select
                  value={severity}
                  onChange={e => setSeverity(e.target.value as BreakdownSeverity)}
                  required
                >
                  {(Object.entries(SEVERITY_LABELS) as [BreakdownSeverity, string][]).map(
                    ([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="field col-span-full">
                <span>وصف العطل والأعراض الظاهرة <em className="required-mark">*</em></span>
                <textarea
                  rows={4}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="اشرح المشكلة بالتفصيل (أصوات غير طبيعية، توقف المحرك، تسريب زيت، عطل كهربائي، إلخ)..."
                  required
                />
              </label>
            </div>
          </div>
        )}

        {/* STEP 2: Field Inspection */}
        {currentStep === 2 && (
          <div>
            <h2 className="mb-1 text-lg font-bold text-slate-900">
              الخطوة 2: الكشف والتشخيص الميداني
            </h2>
            <p className="mb-[18px] text-sm font-medium leading-6 text-slate-500">
              هل تم إرسال فني أو جهة لفحص المعدة في موقعها قبل سحبها أو بدء الإصلاح؟
            </p>

            <div className="mb-4">
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={hasDiagnosis}
                  onChange={e => setHasDiagnosis(e.target.checked)}
                />
                <strong className="text-sm font-semibold text-slate-900">
                  تم إجراء كشف / تشخيص ميداني للمعدة
                </strong>
              </label>
            </div>

            {hasDiagnosis ? (
              <div className="form-grid">
                <label className="field col-span-full">
                  <span>نتيجة وتقرير الفحص الميداني <em className="required-mark">*</em></span>
                  <textarea
                    rows={3}
                    value={diagnosisDescription}
                    onChange={e => setDiagnosisDescription(e.target.value)}
                    placeholder="تقرير الفني: تلف في بلف الهيدروليك، قطع في السير، عطل طلمبة حقن..."
                  />
                </label>

                <label className="field">
                  <span>تكلفة الكشف / الفحص الميداني (ج.م)</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={diagnosisCost}
                    onChange={e => setDiagnosisCost(Number(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </label>

                <label className="field">
                  <span>الفني المسؤول أو مركز الخدمة</span>
                  <input
                    value={diagnosisVendor}
                    onChange={e => setDiagnosisVendor(e.target.value)}
                    placeholder="اسم المهندس / الفني أو الورشة المتنقلة"
                  />
                </label>
              </div>
            ) : (
              <div className="rounded-xl bg-slate-50 p-6 text-center text-sm font-medium text-slate-500">
                <span>لم يتم إجراء كشف ميداني منفصل (سيتم الكشف المباشر داخل الورشة).</span>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Transport */}
        {currentStep === 3 && (
          <div>
            <h2 className="mb-1 text-lg font-bold text-slate-900">
              الخطوة 3: النقل والتحرك (الونش أو التريلا)
            </h2>
            <p className="mb-[18px] text-sm font-medium leading-6 text-slate-500">
              هل تتطلب المعدة سحباً أو نقلاً على ونش أو تريلا للورشة؟
            </p>

            <div className="mb-4">
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={needsTransport}
                  onChange={e => setNeedsTransport(e.target.checked)}
                />
                <strong className="text-sm font-semibold text-slate-900">
                  المعدة تحتاج وسيلة نقل (ونش / تريلا / سطحة) إلى الورشة
                </strong>
              </label>
            </div>

            {needsTransport ? (
              <div className="form-grid">
                <label className="field">
                  <span>نوع وسيلة النقل</span>
                  <select
                    value={transportType}
                    onChange={e => setTransportType(e.target.value as TransportType)}
                  >
                    {(Object.entries(TRANSPORT_TYPE_LABELS) as [TransportType, string][]).map(
                      ([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label className="field">
                  <span>تكلفة النقل المقدرة / المتفق عليها (ج.م)</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={transportCost}
                    onChange={e => setTransportCost(Number(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </label>

                <label className="field">
                  <span>مكان التحرك (من)</span>
                  <input
                    value={fromLocation}
                    onChange={e => setFromLocation(e.target.value)}
                    placeholder={location || 'الموقع الميداني'}
                  />
                </label>

                <label className="field">
                  <span>الوجهة (إلى)</span>
                  <input
                    value={toLocation}
                    onChange={e => setToLocation(e.target.value)}
                    placeholder="الورشة المركزية"
                  />
                </label>

                <label className="field">
                  <span>الشركة الناقلة / المورد</span>
                  <input
                    value={transportVendor}
                    onChange={e => setTransportVendor(e.target.value)}
                    placeholder="اسم مقاول النقل أو صاحب الونش"
                  />
                </label>

                <label className="field">
                  <span>رقم لوحة وسيلة النقل</span>
                  <input
                    value={transportPlate}
                    onChange={e => setTransportPlate(e.target.value)}
                    placeholder="رقم اللوحة"
                  />
                </label>

                <label className="field">
                  <span>اسم سائق وسيلة النقل</span>
                  <input
                    value={transportDriver}
                    onChange={e => setTransportDriver(e.target.value)}
                    placeholder="اسم السائق"
                  />
                </label>
              </div>
            ) : (
              <div className="rounded-xl bg-slate-50 p-6 text-center text-sm font-medium text-slate-500">
                <span>المعدة تتحرك ذاتياً أو سيتم إصلاحها بالموقع دون الحاجة لونش نقل.</span>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Downtime & Financial Rates */}
        {currentStep === 4 && (
          <div>
            <h2 className="mb-1 text-lg font-bold text-slate-900">
              الخطوة 4: التوقف والتقدير المالي المبدئي
            </h2>
            <p className="mb-[18px] text-sm font-medium leading-6 text-slate-500">
              احتساب التكلفة غير المباشرة: بدل توقف السائق وخسارة الإيراد اليومية لتحديد التكلفة الحقيقية (True Cost).
            </p>

            <div className="mb-4">
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={trackDowntime}
                  onChange={e => setTrackDowntime(e.target.checked)}
                />
                <strong className="text-sm font-semibold text-slate-900">
                  بدء تسجيل فترة توقف للمعدة لحساب ساعات التوقف والتكاليف الضائعة
                </strong>
              </label>
            </div>

            {trackDowntime && (
              <div className="form-grid">
                <label className="field">
                  <span>بدل توقف السائق اليومي (ج.م / يوم)</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={driverDailyRate}
                    onChange={e => setDriverDailyRate(Number(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </label>

                <label className="field">
                  <span>خسارة الإيراد اليومي للأصل (ج.م / يوم)</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={lostRevenuePerDay}
                    onChange={e => setLostRevenuePerDay(Number(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </label>

                <label className="field col-span-full">
                  <span>ملاحظات التوقف</span>
                  <textarea
                    rows={3}
                    value={downtimeNotes}
                    onChange={e => setDowntimeNotes(e.target.value)}
                    placeholder="ملاحظات حول بدلات السائق أو التأثير على خطة المشروع..."
                  />
                </label>
              </div>
            )}
          </div>
        )}

        {/* STEP 5: Review & Confirmation */}
        {currentStep === 5 && (
          <div>
            <h2 className="mb-1 text-lg font-bold text-slate-900">
              الخطوة 5: مراجعة وتأكيد تسجيل العطل
            </h2>
            <p className="mb-[18px] text-sm font-medium leading-6 text-slate-500">
              يرجى مراجعة كافة البيانات المدخلة قبل الحفظ النهائي.
            </p>

            <div className="flex flex-col gap-3.5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <strong className="mb-2 block text-sm font-bold text-primary-700">
                  المعدة والأصل
                </strong>
                <div className="grid gap-2.5 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <div><span>الأصل:</span> <strong>{selectedAsset?.name} ({selectedAsset?.code})</strong></div>
                  <div><span>المشروع:</span> <strong>{selectedProject?.name ?? '—'}</strong></div>
                  <div><span>السائق:</span> <strong>{selectedDriver?.name ?? '—'}</strong></div>
                  <div><span>التاريخ:</span> <strong>{new Date(breakdownDatetime).toLocaleString(APP_LOCALE)}</strong></div>
                  <div><span>درجة الخطورة:</span> <strong>{SEVERITY_LABELS[severity]}</strong></div>
                  <div><span>الموقع:</span> <strong>{location || '—'}</strong></div>
                </div>
                <div className="mt-2.5 text-sm">
                  <span>الوصف:</span> <strong>{description}</strong>
                </div>
              </div>

              {hasDiagnosis && (
                <div className="rounded-xl border border-primary-100 bg-primary-50 p-3.5">
                  <strong className="mb-1.5 block text-sm font-bold text-primary-700">
                    الكشف والتشخيص الميداني
                  </strong>
                  <div className="text-sm">
                    <div>الوصف: <strong>{diagnosisDescription}</strong></div>
                    <div>التكلفة المبدئية: <strong>{formatMoney(diagnosisCost)}</strong></div>
                    {diagnosisVendor && <div>الفني/الورشة: <strong>{diagnosisVendor}</strong></div>}
                  </div>
                </div>
              )}

              {needsTransport && (
                <div className="rounded-xl border border-sky-100 bg-sky-50 p-3.5">
                  <strong className="mb-1.5 block text-sm font-bold text-sky-700">
                    حركة النقل المقررة
                  </strong>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                    <div>نوع الوسيلة: <strong>{TRANSPORT_TYPE_LABELS[transportType]}</strong></div>
                    <div>تكلفة النقل: <strong>{formatMoney(transportCost)}</strong></div>
                    <div>من: <strong>{fromLocation || location || 'الموقع'}</strong></div>
                    <div>إلى: <strong>{toLocation || 'الورشة'}</strong></div>
                    {transportVendor && <div>المورد: <strong>{transportVendor}</strong></div>}
                    {transportPlate && <div>اللوحة: <strong>{transportPlate}</strong></div>}
                  </div>
                </div>
              )}

              {trackDowntime && (
                <div className="rounded-xl border border-red-100 bg-red-50 p-3.5">
                  <strong className="mb-1.5 block text-sm font-bold text-red-700">
                    بدلات التوقف وخسارة الإيراد اليومية
                  </strong>
                  <div className="grid gap-2 text-sm sm:grid-cols-2">
                    <div>بدل توقف السائق اليومي: <strong>{formatMoney(driverDailyRate)}</strong></div>
                    <div>خسارة الإيراد اليومية للأصل: <strong>{formatMoney(lostRevenuePerDay)}</strong></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Wizard Footer Navigation */}
<div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                className="secondary-button"
                onClick={prevStep}
                disabled={busy}
              >
                <ArrowRight size={15} /> الخطوة السابقة
              </button>
            )}
          </div>

          <div className="flex gap-2">
            {currentStep < 5 ? (
              <button
                type="button"
                className="primary-button"
                onClick={nextStep}
              >
                الخطوة التالية <ArrowLeft size={15} />
              </button>
            ) : (
              <button
                type="button"
                className="primary-button min-w-[160px]"
                onClick={handleFinalSubmit}
                disabled={busy}
              >
                {busy ? 'جارٍ تسجيل العطل...' : 'تأكيد وحفظ العطل'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
