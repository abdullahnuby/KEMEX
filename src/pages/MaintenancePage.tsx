import { AlertCircle, CheckCircle2, Clock3, Pencil, Plus, Wrench, X, type LucideIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { Asset, MaintenanceTechnician, Project, WorkOrder } from '../types/tfms'
import { useCurrency } from '../features/settings'
import { ReferenceValue } from '../components/ReferenceValue'
import { Button, DataTable, IconButton, PageHeader, StatusBadge } from '../components/ui'
import { ConfirmModal, FormSection, OperationalSummaryStrip } from '../shared/ui'
import { PrintRecordButton } from '../shared/printing'

import { APP_LOCALE } from '../shared/formatters/locale'
type MaintenancePageProps = {
  workOrders: WorkOrder[]
  assets: Asset[]
  projects: Project[]
  technicians?: MaintenanceTechnician[]
  onSaveTechnician?: (technician: MaintenanceTechnician) => Promise<void>
  onSave?: (workOrder: WorkOrder) => Promise<void> | void
}

/** Maintenance work-order workspace. */
export function MaintenancePage({ workOrders, assets, projects, technicians = [], onSave, onSaveTechnician }: MaintenancePageProps) {
  const [editing, setEditing] = useState<WorkOrder | null>(null)
  const [completing, setCompleting] = useState<WorkOrder | null>(null)
  const [technicianOpen, setTechnicianOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [queueFilter, setQueueFilter] = useState<'all' | 'active' | 'waiting' | 'priority'>('all')
  const [pendingBulk, setPendingBulk] = useState<WorkOrder[]>([])
  const { formatMoney } = useCurrency()

  const openCount = workOrders.filter(order => !['مكتمل', 'ملغى'].includes(order.status)).length
  const waitingCount = workOrders.filter(order => ['بانتظار الاعتماد', 'بانتظار قطع غيار'].includes(order.status)).length
  const completedCount = workOrders.filter(order => order.status === 'مكتمل').length
  const highPriorityCount = workOrders.filter(order => ['عالية', 'عاجلة', 'حرجة'].includes(order.prio) && !['مكتمل', 'ملغى'].includes(order.status)).length
  const maintenanceKpis = calculateMaintenanceKpis(workOrders)
  const visibleWorkOrders = workOrders.filter(order => {
    if (queueFilter === 'active') return !['مكتمل', 'ملغى'].includes(order.status)
    if (queueFilter === 'waiting') return ['بانتظار الاعتماد', 'بانتظار قطع غيار'].includes(order.status)
    if (queueFilter === 'priority') return ['عالية', 'عاجلة', 'حرجة'].includes(order.prio) && !['مكتمل', 'ملغى'].includes(order.status)
    return true
  })

  function newWorkOrder() {
    const firstAsset = assets[0]?.id ?? ''
    const firstProject = projects[0]?.id ?? ''
    setError('')
    setEditing({
      id: `WO-${Date.now()}`,
      asset: firstAsset,
      proj: firstProject,
      type: 'صيانة دورية',
      desc: '',
      opened: new Date().toISOString().slice(0, 10),
      prio: 'عادية',
      status: 'مفتوح',
      laborCost: 0,
      partsCost: 0,
      vendorCost: 0,
      estimatedCost: 0,
      planId: '',
      cause: '',
      materials: '',
      warranty: '',
      approvalNotes: '',
    })
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing || !onSave || busy) return
    setBusy(true)
    setError('')
    try {
      const form = new FormData(event.currentTarget)
      const values = {
        ...editing,
        asset: String(form.get('asset') ?? ''),
        proj: String(form.get('proj') ?? ''),
        type: String(form.get('type') ?? '').trim(),
        desc: String(form.get('desc') ?? '').trim(),
        opened: String(form.get('opened') ?? ''),
        prio: String(form.get('prio') ?? 'عادية'),
        vendor: String(form.get('vendor') ?? '').trim(),
        techs: String(form.get('techs') ?? '').trim(),
        planId: String(form.get('planId') ?? '').trim(),
        estimatedCost: Number(form.get('estimatedCost') ?? 0),
        cause: String(form.get('cause') ?? '').trim(),
        materials: String(form.get('materials') ?? '').trim(),
        warranty: String(form.get('warranty') ?? '').trim(),
        approvalNotes: String(form.get('approvalNotes') ?? '').trim(),
      }
      if (!values.asset) throw new Error('اختيار الأصل مطلوب.')
      if (!values.type) throw new Error('نوع العمل مطلوب.')
      if (!values.desc) throw new Error('وصف العمل مطلوب.')
      if (!Number.isFinite(values.estimatedCost) || values.estimatedCost < 0) throw new Error('التكلفة التقديرية يجب أن تكون رقمًا غير سالب.')
      await onSave(values)
      setEditing(null)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'تعذر حفظ أمر العمل.')
    } finally {
      setBusy(false)
    }
  }

  async function transition(order: WorkOrder, nextStatus: string) {
    if (!onSave || busy) return
    if (nextStatus === 'مكتمل') {
      setCompleting(order)
      return
    }
    setBusy(true)
    setError('')
    try {
      await onSave({ ...order, status: nextStatus })
    } catch (transitionError) {
      setError(transitionError instanceof Error ? transitionError.message : 'تعذر تحديث حالة أمر العمل.')
    } finally {
      setBusy(false)
    }
  }

  async function complete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!completing || !onSave || busy) return
    setBusy(true)
    setError('')
    try {
      const form = new FormData(event.currentTarget)
      const laborCost = Number(form.get('laborCost') ?? 0)
      const partsCost = Number(form.get('partsCost') ?? 0)
      const vendorCost = Number(form.get('vendorCost') ?? 0)
      const downtimeHours = Number(form.get('downHrs') ?? 0)
      if ([laborCost, partsCost, vendorCost, downtimeHours].some(value => !Number.isFinite(value) || value < 0)) {
        throw new Error('التكاليف ومدة التوقف يجب أن تكون أرقامًا غير سالبة.')
      }
      await onSave({
        ...completing,
        laborCost,
        partsCost,
        vendorCost,
        downHrs: downtimeHours,
        completed: String(form.get('completed') ?? new Date().toISOString().slice(0, 10)),
        results: String(form.get('results') ?? '').trim(),
        status: 'مكتمل',
      })
      setCompleting(null)
    } catch (completeError) {
      setError(completeError instanceof Error ? completeError.message : 'تعذر إنجاز أمر العمل.')
    } finally {
      setBusy(false)
    }
  }

  async function markWaitingForParts(order: WorkOrder) {
    if (!onSave || busy) return
    setBusy(true)
    setError('')
    try {
      await onSave({ ...order, status: 'بانتظار قطع غيار' })
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : 'تعذر تحديث حالة أمر العمل.')
    } finally {
      setBusy(false)
    }
  }

  function requestBulkWaitingForParts(selected: readonly WorkOrder[]) {
    if (!onSave || busy || !selected.length) return
    const actionable = selected.filter(order => !['مكتمل', 'ملغى', 'بانتظار قطع غيار'].includes(order.status))
    if (!actionable.length) return
    setPendingBulk([...actionable])
  }

  async function confirmBulkWaitingForParts() {
    if (!onSave || busy || !pendingBulk.length) return
    setBusy(true)
    setError('')
    try {
      for (const order of pendingBulk) await onSave({ ...order, status: 'بانتظار قطع غيار' })
      setPendingBulk([])
    } catch (bulkError) {
      setError(bulkError instanceof Error ? bulkError.message : 'تعذر تنفيذ الإجراء الجماعي على أوامر العمل.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="أوامر العمل والصيانة"
        description="الدورة: اعتماد الفتح ← بدء التنفيذ ← بانتظار قطع الغيار عند الحاجة ← الإنجاز والتكلفة."
        action={<>
          {onSaveTechnician && <Button variant="secondary" onClick={() => setTechnicianOpen(true)}>إدارة الفنيين</Button>}
          {onSave && <Button icon={<Plus size={16} />} onClick={newWorkOrder}>أمر عمل جديد</Button>}
        </>}
      />

      {error && <div className="global-error" role="alert">{error}</div>}

      <div className="metric-grid compact">
        <Stat icon={Wrench} label="أوامر مفتوحة" value={openCount} />
        <Stat icon={Clock3} label="بانتظار إجراء" value={waitingCount} />
        <Stat icon={CheckCircle2} label="مكتملة" value={completedCount} />
        <Stat icon={AlertCircle} label="أولوية عالية" value={highPriorityCount} />
        <Stat icon={Clock3} label="MTTR" value={maintenanceKpis.mttrHours === null ? '—' : `${formatNumber(maintenanceKpis.mttrHours)} س`} />
        <Stat icon={Wrench} label="MTBF تقديري" value={maintenanceKpis.mtbfDays === null ? '—' : `${formatNumber(maintenanceKpis.mtbfDays)} يوم`} />
      </div>

      <OperationalSummaryStrip items={[
        { id: 'open', label: 'أوامر نشطة', value: openCount },
        { id: 'waiting', label: 'بانتظار إجراء', value: waitingCount, tone: waitingCount ? 'alert' : 'default' },
        { id: 'completed', label: 'مكتملة', value: completedCount, tone: 'success' },
        { id: 'priority', label: 'أولوية عالية / عاجلة', value: highPriorityCount, tone: highPriorityCount ? 'alert' : 'default' },
      ]} />

      <div className="panel" aria-label="طابور أوامر الصيانة">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-slate-700">طابور العمل:</span>
          {([
            ['all', 'كل الأوامر', workOrders.length],
            ['active', 'نشطة', openCount],
            ['waiting', 'بانتظار إجراء', waitingCount],
            ['priority', 'أولوية عالية', highPriorityCount],
          ] as const).map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              className={queueFilter === key ? 'primary-button' : 'secondary-button'}
              onClick={() => setQueueFilter(key)}
              aria-pressed={queueFilter === key}
            >
              {label} <span className="opacity-70">({count})</span>
            </button>
          ))}
          <span className="ms-auto text-xs font-semibold text-slate-500">يُعرض {visibleWorkOrders.length} من {workOrders.length}</span>
        </div>
      </div>

      <DataTable
        rows={visibleWorkOrders}
        rowKey={order => order.id}
        pageSize={12}
        searchPlaceholder="بحث في الأصل أو نوع العمل أو الوصف أو الحالة..."
        searchableText={order => {
          const asset = assets.find(item => item.id === order.asset)
          const project = projects.find(item => item.id === order.proj)
          return [asset?.code, asset?.name, project?.code, project?.name, order.type, order.desc, order.prio, order.status].filter(Boolean).join(' ')
        }}
        emptyState={<div className="px-6 py-16 text-center text-sm font-medium text-gray-500">لا توجد أوامر عمل مطابقة.</div>}
        enableColumnVisibility
        columnVisibilityStorageKey="kemex.maintenance.columns.v1"
        exportable
        exportFileName="KEMEX-work-orders"
        enableSelection={Boolean(onSave)}
        bulkActions={(selected) => <Button size="sm" variant="secondary" onClick={() => requestBulkWaitingForParts(selected)} disabled={busy}>تحويل لانتظار قطع الغيار ({selected.length})</Button>}
        filters={[
          { id: 'status', label: 'الحالة', options: [
            { value: 'مفتوح', label: 'مفتوح' }, { value: 'قيد التنفيذ', label: 'قيد التنفيذ' }, { value: 'بانتظار قطع غيار', label: 'بانتظار قطع غيار' }, { value: 'مكتمل', label: 'مكتمل' },
          ], getValue: order => order.status },
          { id: 'dateWindow', label: 'تاريخ الفتح', options: [
            { value: '7', label: 'آخر 7 أيام' }, { value: '30', label: 'آخر 30 يومًا' }, { value: '90', label: 'آخر 90 يومًا' }, { value: 'older', label: 'أقدم من 90 يومًا' },
          ], getValue: order => {
            if (!order.opened) return 'older'
            const days = Math.floor((Date.now() - new Date(order.opened).getTime()) / 86400000)
            if (days <= 7) return '7'
            if (days <= 30) return '30'
            if (days <= 90) return '90'
            return 'older'
          } },
        ]}
        columns={[
          { id:'asset', header:'الأصل', sortValue:order=>String(order.asset??''), render:order=><ReferenceValue field="asset" value={order.asset} lookups={{ assets, projects }} /> },
          { id:'type', header:'نوع العمل', sortValue:order=>order.type, render:order=>order.type },
          { id:'description', header:'الوصف', sortValue:order=>order.desc, render:order=>order.desc || '—' },
          { id:'project', header:'المشروع', sortValue:order=>String(order.proj??''), render:order=><ReferenceValue field="proj" value={order.proj} lookups={{ projects }} /> },
          { id:'priority', header:'الأولوية', sortValue:order=>order.prio, render:order=>order.prio },
          { id:'status', header:'الحالة', sortValue:order=>order.status, render:order=><StatusBadge dot>{order.status}</StatusBadge> },
          { id:'opened', header:'التاريخ', sortValue:order=>order.opened, render:order=>formatDate(order.opened) },
          { id:'cost', header:'التكلفة', sortValue:order=>Number(order.laborCost||0)+Number(order.partsCost||0)+Number(order.vendorCost||0), render:order=>formatMoney(Number(order.laborCost||0)+Number(order.partsCost||0)+Number(order.vendorCost||0)) },
          { id:'actions', header:'إجراءات', mobileVisible:true, render:order=><div className="flex flex-wrap gap-2">
            <PrintRecordButton documentTitle="أمر عمل صيانة" documentNumber={String(order.id||'')} documentDate={formatDate(order.opened)} documentStatus={order.status} meta={[{label:'الأصل',value:<ReferenceValue field="asset" value={order.asset} lookups={{ assets, projects }} />},{label:'نوع العمل',value:order.type||'—'},{label:'الأولوية',value:order.prio||'—'},{label:'الفنيون',value:order.techs||'—'},{label:'المورد الخارجي',value:order.vendor||'—'}]} signatures={[{label:'الفني المنفذ'},{label:'مسؤول الصيانة'},{label:'مالك الأصل'}]} footerNote="أمر عمل صيانة صادر من نظام KEMEX لإدارة الأسطول والصيانة.">
              <div className="print-section-title">تفاصيل العمل والتكلفة</div>
              <table><tbody>
                <tr><th>البند</th><th>القيمة</th></tr>
                <tr><td>الوصف</td><td>{order.desc||'—'}</td></tr>
                <tr><td>السبب</td><td>{order.cause||'—'}</td></tr>
                <tr><td>القطع والمواد</td><td>{order.materials||'—'}</td></tr>
                <tr><td>ساعات التوقف</td><td>{order.downHrs??'—'}</td></tr>
                <tr><td>تكلفة العمالة</td><td>{formatMoney(Number(order.laborCost||0))}</td></tr>
                <tr><td>تكلفة القطع</td><td>{formatMoney(Number(order.partsCost||0))}</td></tr>
                <tr><td>تكلفة المورد الخارجي</td><td>{formatMoney(Number(order.vendorCost||0))}</td></tr>
                <tr><td><strong>إجمالي التكلفة</strong></td><td><strong>{formatMoney(Number(order.laborCost||0)+Number(order.partsCost||0)+Number(order.vendorCost||0))}</strong></td></tr>
                <tr><td>الضمان</td><td>{order.warranty||'—'}</td></tr>
                <tr><td>النتائج</td><td>{order.results||'—'}</td></tr>
                <tr><td>تاريخ الإنجاز</td><td>{order.completed?formatDate(order.completed):'—'}</td></tr>
              </tbody></table>
            </PrintRecordButton>
            {order.status === 'بانتظار الاعتماد' && <Button size="sm" icon={<CheckCircle2 size={14}/>} onClick={() => void transition(order, 'مفتوح')} disabled={busy}>اعتماد</Button>}
            {order.status === 'مفتوح' && <Button size="sm" icon={<Wrench size={14}/>} onClick={() => void transition(order, 'قيد التنفيذ')} disabled={busy}>بدء التنفيذ</Button>}
            {(order.status === 'قيد التنفيذ' || order.status === 'بانتظار قطع غيار') && <><Button size="sm" variant="secondary" onClick={() => void markWaitingForParts(order)} disabled={busy}>قطع غيار</Button><Button size="sm" icon={<CheckCircle2 size={14}/>} onClick={() => void transition(order, 'مكتمل')} disabled={busy}>إنجاز</Button></>}
            {(order.status === 'مفتوح' || order.status === 'بانتظار الاعتماد') && <IconButton size="sm" icon={<Pencil size={14}/>} label="تعديل أمر العمل" onClick={() => setEditing({ ...order })} />}
          </div> },
        ]}
      />

      <ConfirmModal
        open={pendingBulk.length > 0}
        title="تحويل أوامر العمل إلى انتظار قطع الغيار"
        description={`سيتم تحويل ${pendingBulk.length} أمر عمل قابل للتنفيذ إلى «بانتظار قطع غيار». سيتم الاحتفاظ بباقي بيانات الأوامر كما هي.`}
        confirmLabel="تحويل الأوامر"
        busy={busy}
        onConfirm={confirmBulkWaitingForParts}
        onCancel={() => !busy && setPendingBulk([])}
      />

      {editing && (
        <div className="modal-backdrop" onMouseDown={() => !busy && setEditing(null)}>
          <form className="modal-card wide form-modal-premium" onSubmit={saveEdit} onMouseDown={event => event.stopPropagation()}>
            <div className="modal-head"><div><h2>{workOrders.some(order => order.id === editing.id) ? 'تعديل أمر العمل' : 'أمر عمل جديد'}</h2><p>الحالة تُدار من دورة الاعتماد وليس من الحقل.</p></div><button type="button" className="icon-button" onClick={() => setEditing(null)} aria-label="إغلاق"><X size={18} /></button></div>
            <div className="form-sections">
              <FormSection title="فتح أمر العمل">
                <Select name="asset" label="الأصل" value={editing.asset} options={assets.map(asset => ({ v: asset.id, l: `${asset.name} — ${asset.code}` }))} />
                <Select name="proj" label="المشروع" value={editing.proj ?? ''} options={[{ v: '', l: 'المقر / بدون مشروع' }, ...projects.map(project => ({ v: project.id, l: `${project.name} — ${project.code}` }))]} />
                <Input name="type" label="نوع العمل" value={editing.type} />
                <Input name="opened" label="تاريخ الفتح" type="date" value={editing.opened} />
                <Select name="prio" label="الأولوية" value={editing.prio} options={['عادية', 'متوسطة', 'عالية', 'عاجلة', 'حرجة'].map(value => ({ v: value, l: value }))} />
                <Input name="estimatedCost" label="التكلفة التقديرية" type="number" value={String(editing.estimatedCost ?? 0)} />
              </FormSection>
              <FormSection title="التنفيذ">
                <Input name="vendor" label="المورد / الورشة" value={editing.vendor ?? ''} />
                <Select name="techs" label="الفني المسؤول" value={editing.techs ?? ''} options={[{ v: '', l: '— بدون تعيين —' }, ...technicians.filter(technician => technician.active).map(technician => ({ v: technician.name, l: `${technician.name}${technician.specialty ? ` — ${technician.specialty}` : ''}` }))]} />
                <Input name="planId" label="مرجع خطة الصيانة" value={editing.planId ?? ''} />
                <Input name="warranty" label="الضمان / شروط ما بعد الإصلاح" value={editing.warranty ?? ''} />
                <label className="field field-full"><span>وصف العمل</span><textarea name="desc" defaultValue={editing.desc} rows={4} /></label>
              </FormSection>
              <FormSection title="التشخيص والمواد">
                <label className="field field-full"><span>سبب العطل / التشخيص</span><textarea name="cause" defaultValue={editing.cause ?? ''} rows={3} /></label>
                <label className="field field-full"><span>المواد وقطع الغيار المتوقعة</span><textarea name="materials" defaultValue={editing.materials ?? ''} rows={3} /></label>
                <label className="field field-full"><span>ملاحظات الاعتماد</span><textarea name="approvalNotes" defaultValue={editing.approvalNotes ?? ''} rows={3} /></label>
              </FormSection>
            </div>
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setEditing(null)}>إلغاء</button><button className="primary-button" disabled={busy}>{busy ? 'جارٍ الحفظ...' : 'حفظ الأمر'}</button></div>
          </form>
        </div>
      )}

      {completing && (
        <div className="modal-backdrop" onMouseDown={() => !busy && setCompleting(null)}>
          <form className="modal-card wide form-modal-premium" onSubmit={complete} onMouseDown={event => event.stopPropagation()}>
            <div className="modal-head"><div><h2>إنجاز أمر العمل</h2><p>تسجيل التكلفة ومدة التوقف ونتائج الفحص قبل الإغلاق.</p></div><button type="button" className="icon-button" onClick={() => setCompleting(null)} aria-label="إغلاق"><X size={18} /></button></div>
            <div className="form-grid">
              <Input name="laborCost" label="تكلفة العمالة" type="number" value={String(completing.laborCost ?? 0)} />
              <Input name="partsCost" label="قطع الغيار" type="number" value={String(completing.partsCost ?? 0)} />
              <Input name="vendorCost" label="المورد الخارجي" type="number" value={String(completing.vendorCost ?? 0)} />
              <Input name="downHrs" label="مدة التوقف ساعة" type="number" value={String(completing.downHrs ?? 0)} />
              <Input name="completed" label="تاريخ الإنجاز" type="date" value={completing.completed ?? new Date().toISOString().slice(0, 10)} />
              <label className="field"><span>نتائج الفحص والاختبار</span><textarea name="results" defaultValue={completing.results ?? ''} rows={4} /></label>
            </div>
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setCompleting(null)}>إلغاء</button><button className="primary-button" disabled={busy}>{busy ? 'جارٍ الإغلاق...' : 'إنجاز واعتماد التكاليف'}</button></div>
          </form>
        </div>
      )}

      {technicianOpen && <TechnicianModal technicians={technicians} onClose={() => setTechnicianOpen(false)} onSave={onSaveTechnician} />}
    </div>
  )
}

function Select({ name, label, value, options }: { name: string; label: string; value: string; options: { v: string; l: string }[] }) {
  return <label className="field"><span>{label}</span><select name={name} defaultValue={value}>{options.map(option => <option key={option.v} value={option.v}>{option.l}</option>)}</select></label>
}

function Input({ name, label, value, type = 'text' }: { name: string; label: string; value: string; type?: string }) {
  return <label className="field"><span>{label}</span><input name={name} type={type} defaultValue={value} min={type === 'number' ? 0 : undefined} step={type === 'number' ? 'any' : undefined} /></label>
}

function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number | string }) {
  return <div className="metric-card"><div className="metric-icon"><Icon size={18} /></div><div className="metric-body"><span>{label}</span><strong>{String(value)}</strong></div></div>
}

const formatDate = (value?: string) => value ? new Intl.DateTimeFormat(APP_LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value)) : '—'


function calculateMaintenanceKpis(workOrders: WorkOrder[]) {
  const completed = workOrders
    .filter(order => order.status === 'مكتمل' && order.completed)
    .map(order => ({
      ...order,
      completedAt: new Date(order.completed as string).getTime(),
      openedAt: new Date(order.opened).getTime(),
    }))
    .filter(order => Number.isFinite(order.completedAt) && Number.isFinite(order.openedAt))

  const downtimeOrders = completed.filter(order => Number(order.downHrs || 0) > 0)
  const mttrHours = downtimeOrders.length
    ? downtimeOrders.reduce((sum, order) => sum + Number(order.downHrs || 0), 0) / downtimeOrders.length
    : null

  const byAsset = new Map<string, number[]>()
  for (const order of completed.filter(order => order.type !== 'صيانة دورية' && order.type !== 'وقائية')) {
    const dates = byAsset.get(order.asset) ?? []
    dates.push(order.openedAt)
    byAsset.set(order.asset, dates)
  }
  const intervals:number[] = []
  for (const dates of byAsset.values()) {
    dates.sort((a,b)=>a-b)
    for(let i=1;i<dates.length;i++) intervals.push((dates[i]-dates[i-1])/86400000)
  }
  const mtbfDays = intervals.length ? intervals.reduce((sum,value)=>sum+value,0)/intervals.length : null
  return { mttrHours, mtbfDays }
}

function formatNumber(value:number){
  return new Intl.NumberFormat(APP_LOCALE,{maximumFractionDigits:1}).format(value)
}

function TechnicianModal({ technicians, onClose, onSave }: { technicians: MaintenanceTechnician[]; onClose: () => void; onSave?: (technician: MaintenanceTechnician) => Promise<void> }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!onSave || saving) return
    setSaving(true)
    setError('')
    try {
      const form = new FormData(event.currentTarget)
      const technician: MaintenanceTechnician = {
        id: `MT-${Date.now()}`,
        code: String(form.get('code') ?? '').trim(),
        name: String(form.get('name') ?? '').trim(),
        specialty: String(form.get('specialty') ?? '').trim(),
        phone: String(form.get('phone') ?? '').trim(),
        employmentType: String(form.get('employmentType') ?? '').trim(),
        active: true,
        notes: '',
      }
      if (!technician.code || !technician.name) throw new Error('كود الفني واسم الفني مطلوبان.')
      if (technicians.some(item => item.code.toLowerCase() === technician.code.toLowerCase())) throw new Error('كود الفني مستخدم بالفعل.')
      await onSave(technician)
      event.currentTarget.reset()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'تعذر حفظ الفني.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={() => !saving && onClose()}>
      <div className="modal-card wide form-modal-premium" onMouseDown={event => event.stopPropagation()}>
        <div className="modal-head"><div><h2>إدارة الفنيين</h2><p>الفنيون المسجلون هم مصدر الاختيار في أوامر الصيانة.</p></div><button type="button" className="icon-button" onClick={onClose} aria-label="إغلاق">×</button></div>
        <div className="form-sections">
          <DataTable
            rows={technicians}
            rowKey={technician => technician.id}
            pageSize={8}
            searchPlaceholder="بحث في الفنيين..."
            emptyState={<div className="px-6 py-12 text-center text-sm font-medium text-gray-500">لا توجد بيانات فنيين.</div>}
            columns={[
              { id:'code', header:'الكود', sortValue:t=>t.code, render:t=><strong>{t.code}</strong> },
              { id:'name', header:'الفني', sortValue:t=>t.name, render:t=>t.name },
              { id:'specialty', header:'التخصص', sortValue:t=>t.specialty??'', render:t=>t.specialty || '—' },
              { id:'phone', header:'الهاتف', sortValue:t=>t.phone??'', render:t=>t.phone || '—' },
            ]}
          />
          <form className="panel" onSubmit={submit}><div className="form-grid"><Input name="code" label="كود الفني" value="" /><Input name="name" label="اسم الفني" value="" /><Input name="specialty" label="التخصص" value="" /><Input name="phone" label="الهاتف" value="" /><Input name="employmentType" label="نوع التعاقد" value="" /></div>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>إغلاق</button><button className="primary-button" disabled={saving || !onSave}>{saving ? 'جارٍ الحفظ...' : 'حفظ الفني'}</button></div></form>
        </div>
      </div>
    </div>
  )
}
