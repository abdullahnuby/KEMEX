import { useMemo, useState, type FormEvent, type MouseEvent } from 'react'
import { Check, ClipboardCheck, Eye, Flag, Pencil, Plus, RotateCcw, Send, X } from 'lucide-react'
import { MODULE_CONFIG, canWriteModule, type ModuleConfig, type ModuleField, type WorkflowAction } from '../config/modules'
import { canApproveModule } from '../config/app'
import type { Asset, Driver, Project, User, WorkOrder, Customer } from '../types/tfms'
import { Button, Card, DataTable, PageHeader, StatusBadge } from '../components/ui'
import { FormSection, OperationalSummaryStrip, ConfirmModal } from '../shared/ui'
import { ReferenceValue } from '../components/ReferenceValue'
import { displayReference, referenceOptions, type ReferenceLookups } from '../utils/referenceLabels'

const MODULES = ['operations', 'requests', 'assignments'] as const
type OperationalModule = typeof MODULES[number]
type Queue = 'all' | 'action' | 'active' | 'closed'

const moduleMeta: Record<OperationalModule, { title: string; description: string; createLabel: string; actionLabel: string }> = {
  operations: { title: 'التشغيل اليومي', description: 'مركز اعتماد التشغيل اليومي وساعات العمل والعدادات والتوقفات.', createLabel: 'تسجيل يوم تشغيل', actionLabel: 'يحتاج اعتماد' },
  requests: { title: 'طلبات المعدات', description: 'طلبات المواقع من الاحتياج وحتى الاعتماد والتخصيص بدون فقدان سياق التشغيل.', createLabel: 'طلب معدات جديد', actionLabel: 'يحتاج إجراء' },
  assignments: { title: 'تخصيصات الأصول', description: 'حركة تسليم واستلام الأصول ومتابعة التخصيصات السارية والمنتهية.', createLabel: 'تخصيص أصل جديد', actionLabel: 'تحتاج إنهاء' },
}

export function OperationalWorkflowPage({
  module,
  records,
  user,
  assets = [],
  projects = [],
  drivers = [],
  workOrders = [],
  clients,
  moduleData,
  onSave,
  onWorkflow,
  onNavigate,
}: {
  module: OperationalModule
  records: Record<string, unknown>[]
  user: User
  assets?: Asset[]
  projects?: Project[]
  drivers?: Driver[]
  workOrders?: WorkOrder[]
  clients?: Customer[]
  moduleData?: Record<string, Record<string, unknown>[]>
  onSave: (record: Record<string, unknown>) => Promise<void> | void
  onWorkflow: (record: Record<string, unknown>, previous: Record<string, unknown>, action: WorkflowAction) => Promise<void> | void
  onNavigate?: (route: string) => void
}) {
  const cfg = MODULE_CONFIG[module]
  const meta = moduleMeta[module]
  const [queue, setQueue] = useState<Queue>('all')
  const [priority, setPriority] = useState('all')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null)
  const [viewing, setViewing] = useState<Record<string, unknown> | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmAction, setConfirmAction] = useState<{ record: Record<string, unknown>; action: WorkflowAction } | null>(null)

  const lookups: ReferenceLookups = { assets, projects, drivers, workOrders, records: moduleData }
  const statusOf = (record: Record<string, unknown>) => String(record.status ?? '').trim()
  const statusKind = (record: Record<string, unknown>) => {
    const status = statusOf(record)
    if (module === 'assignments') return status === 'ساري' ? 'active' : status === 'منتهي' || status === 'ملغى' ? 'closed' : 'action'
    if (/معتمد|قيد التنفيذ|مكتمل|منتهي|مغلقة|مغلق/.test(status)) return 'active'
    if (/مرفوض|ملغى/.test(status)) return 'closed'
    return 'action'
  }
  const counts = useMemo(() => ({
    all: records.length,
    action: records.filter(r => statusKind(r) === 'action').length,
    active: records.filter(r => statusKind(r) === 'active').length,
    closed: records.filter(r => statusKind(r) === 'closed').length,
  }), [records, module])

  const filtered = useMemo(() => records.filter(record => {
    const searchable = [
      record.number, record.date, record.location, record.work, record.task, record.reason,
      displayReference('asset', record.asset ?? record.assetId, lookups),
      displayReference('assetId', record.assetId, lookups),
      displayReference('proj', record.proj, lookups),
      displayReference('driver', record.drv, lookups),
      record.status,
    ].join(' ').toLocaleLowerCase('ar')
    const q = query.trim().toLocaleLowerCase('ar')
    const passQueue = queue === 'all' || statusKind(record) === queue
    const passPriority = module !== 'requests' || priority === 'all' || String(record.prio ?? '') === priority
    return passQueue && passPriority && searchable.includes(q)
  }), [records, queue, priority, query, lookups, module])

  const availableActions = (record: Record<string, unknown>) => {
    const workflow = cfg.workflow
    if (!workflow) return []
    const current = statusOf(record)
    return workflow.actions.filter(action => action.roles.includes(user.role) && action.from.includes(current) && (action.key === 'approve' || action.key === 'reject' || action.key === 'po' ? canApproveModule(module, user.role) : canWriteModule(module, user.role)))
  }

  const newRecord = () => {
    const next: Record<string, unknown> = { id: `${module.toUpperCase()}-${Date.now()}` }
    cfg.fields.forEach(field => { next[field.key] = '' })
    if (cfg.workflow?.createStatus) next.status = cfg.workflow.createStatus
    if (module === 'requests') {
      next.number = `REQ-${500 + records.length + 1}`
      next.date = new Date().toISOString().slice(0, 10)
      next.req = user.name
      next.reason = ''
      next.apprs = []
    }
    if (module === 'assignments') next.number = `AS-${300 + records.length + 1}`
    if (module === 'operations') {
      next.src = 'ويب'
      next.ap = ''
    }
    setError('')
    setEditing(next)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing || busy) return
    setBusy(true)
    setError('')
    const next = { ...editing }
    const form = new FormData(event.currentTarget)
    try {
      cfg.fields.forEach(field => {
        if (field.key === (cfg.workflow?.statusField ?? 'status')) return
        const raw = String(form.get(field.key) ?? '').trim()
        if (field.type === 'number') {
          if (!raw) { next[field.key] = ''; return }
          const numeric = Number(raw)
          if (!Number.isFinite(numeric) || numeric < 0) throw new Error(`قيمة غير صالحة في حقل ${field.label}.`)
          next[field.key] = numeric
          return
        }
        next[field.key] = raw
      })
      if (cfg.workflow && !next.status) next.status = cfg.workflow.createStatus ?? ''
      await onSave(next)
      setEditing(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ السجل.')
    } finally {
      setBusy(false)
    }
  }

  const executeAction = async (record: Record<string, unknown>, action: WorkflowAction) => {
    const statusField = cfg.workflow?.statusField ?? 'status'
    const current = String(record[statusField] ?? '')
    if (!action.from.includes(current)) {
      setError('حالة السجل تغيّرت؛ حدّث الصفحة قبل تنفيذ الإجراء.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const next: Record<string, unknown> = { ...record, [statusField]: action.to }
      const trail = Array.isArray(record.apprs) ? record.apprs : []
      next.apprs = [...trail, { by: user.name, act: action.label, at: new Date().toISOString() }]
      if (module === 'requests' && action.key === 'reject') next.reason = `رفض بواسطة ${user.name}`
      await onWorkflow(next, record, action)
      setViewing(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تنفيذ الإجراء.')
    } finally {
      setBusy(false)
      setConfirmAction(null)
    }
  }

  if (!cfg) return null

  const columns = module === 'requests'
    ? [
        { id: 'number', header: 'رقم الطلب', render: (r: Record<string, unknown>) => <strong>{String(r.number ?? r.id ?? '—')}</strong>, sortValue: (r: Record<string, unknown>) => String(r.number ?? '') },
        { id: 'project', header: 'المشروع', render: (r: Record<string, unknown>) => <ReferenceValue field="proj" value={r.proj} lookups={lookups} /> },
        { id: 'need', header: 'الاحتياج', render: (r: Record<string, unknown>) => <span>{String(r.work ?? r.location ?? r.task ?? '—')}</span> },
        { id: 'priority', header: 'الأولوية', render: (r: Record<string, unknown>) => <StatusBadge tone={r.prio === 'عاجلة' ? 'red' : r.prio === 'عالية' ? 'amber' : 'blue'}>{String(r.prio ?? '—')}</StatusBadge> },
        { id: 'status', header: 'الحالة', render: (r: Record<string, unknown>) => <StatusBadge tone={statusKind(r) === 'closed' ? 'red' : statusKind(r) === 'active' ? 'emerald' : 'amber'}>{statusOf(r) || '—'}</StatusBadge> },
      ]
    : module === 'assignments'
      ? [
          { id: 'number', header: 'رقم التخصيص', render: (r: Record<string, unknown>) => <strong>{String(r.number ?? r.id ?? '—')}</strong> },
          { id: 'asset', header: 'الأصل', render: (r: Record<string, unknown>) => <ReferenceValue field="asset" value={r.asset} lookups={lookups} /> },
          { id: 'project', header: 'المشروع', render: (r: Record<string, unknown>) => <ReferenceValue field="proj" value={r.proj} lookups={lookups} /> },
          { id: 'period', header: 'الفترة', render: (r: Record<string, unknown>) => <span>{String(r.from ?? '—')} → {String(r.toP ?? 'مفتوح')}</span> },
          { id: 'meter', header: 'الاستخدام', render: (r: Record<string, unknown>) => <span>{r.meterStart !== '' && r.meterStart != null ? `${String(r.meterStart)} → ${String(r.meterEnd ?? '—')}` : '—'}</span> },
          { id: 'status', header: 'الحالة', render: (r: Record<string, unknown>) => <StatusBadge tone={statusKind(r) === 'active' ? 'emerald' : 'gray'}>{statusOf(r) || '—'}</StatusBadge> },
        ]
      : [
          { id: 'date', header: 'التاريخ', render: (r: Record<string, unknown>) => <strong>{String(r.date ?? '—')}</strong>, sortValue: (r: Record<string, unknown>) => String(r.date ?? '') },
          { id: 'asset', header: 'الأصل', render: (r: Record<string, unknown>) => <ReferenceValue field="assetId" value={r.assetId} lookups={lookups} /> },
          { id: 'project', header: 'المشروع', render: (r: Record<string, unknown>) => <ReferenceValue field="proj" value={r.proj} lookups={lookups} /> },
          { id: 'hours', header: 'ساعات التشغيل', render: (r: Record<string, unknown>) => <span>{String(r.hours ?? '—')}</span> },
          { id: 'meter', header: 'العداد', render: (r: Record<string, unknown>) => <span>{String(r.meter ?? '—')}</span> },
          { id: 'down', header: 'التوقف', render: (r: Record<string, unknown>) => <span>{String(r.down ?? '0')}</span> },
          { id: 'status', header: 'الحالة', render: (r: Record<string, unknown>) => <StatusBadge tone={statusKind(r) === 'active' ? 'emerald' : 'amber'}>{statusOf(r) || '—'}</StatusBadge> },
        ]

  return <div className="space-y-6 enterprise-module-page operational-workflow-page" dir="rtl">
    <PageHeader title={meta.title} description={meta.description} meta={<span className="enterprise-page-count">{records.length} سجل</span>} action={<Button icon={<Plus size={16} />} onClick={newRecord}>{meta.createLabel}</Button>} />
    {error && <div className="global-error" role="alert">{error}</div>}

    <OperationalSummaryStrip items={[
      { id: 'all', label: 'إجمالي السجلات', value: counts.all },
      { id: 'action', label: meta.actionLabel, value: counts.action, tone: counts.action ? 'alert' : 'default' },
      { id: 'active', label: module === 'assignments' ? 'تخصيصات سارية' : 'معتمد / نشط', value: counts.active, tone: 'success' },
      { id: 'closed', label: 'مغلق / منتهي', value: counts.closed, tone: 'default' },
    ]} />

    <Card>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-black">قائمة العمل التشغيلية</h2>
          <p className="mt-1 text-sm text-slate-500">الإجراءات المهمة تظهر بجوار السجل بدل الدخول إلى شاشة عامة.</p>
        </div>
        {module === 'requests' && <label className="field min-w-[220px]"><span>الأولوية</span><select value={priority} onChange={e => setPriority(e.target.value)}><option value="all">كل الأولويات</option><option value="عادية">عادية</option><option value="متوسطة">متوسطة</option><option value="عالية">عالية</option><option value="عاجلة">عاجلة</option></select></label>}
      </div>

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="تصفية التشغيل">
        {([
          ['all', `الكل (${counts.all})`],
          ['action', `${meta.actionLabel} (${counts.action})`],
          ['active', `${module === 'assignments' ? 'ساري' : 'نشط'} (${counts.active})`],
          ['closed', `مغلق / منتهي (${counts.closed})`],
        ] as const).map(([key, label]) => <button key={key} type="button" aria-pressed={queue === key} className={`rounded-full border px-3 py-2 text-sm font-semibold ${queue === key ? 'border-primary-600 bg-primary-700 text-white' : 'border-gray-200 bg-white text-gray-600'}`} onClick={() => setQueue(key)}>{label}</button>)}
      </div>

      <DataTable
        rows={filtered}
        columns={[...columns, { id: 'view', header: 'عرض', render: (r: Record<string, unknown>) => <Button variant="ghost" size="sm" icon={<Eye size={15} />} onClick={() => setViewing({ ...r })}>عرض</Button> }, { id: 'actions', header: 'إجراء', render: (r: Record<string, unknown>) => <div className="flex flex-wrap gap-2">{availableActions(r).map(action => <button key={action.key} type="button" className={`workflow-button ${action.tone ?? 'secondary'}`} disabled={busy} onClick={() => action.tone === 'danger' ? setConfirmAction({ record: r, action }) : void executeAction(r, action)}>{action.key === 'approve' ? <Check size={13} /> : action.key === 'submit' ? <Send size={13} /> : action.key === 'return' ? <RotateCcw size={13} /> : action.key === 'end' ? <Flag size={13} /> : <ClipboardCheck size={13} />}{action.label}</button>)}<Button variant="ghost" size="sm" icon={<Pencil size={15} />} onClick={() => setEditing({ ...r })}>تعديل</Button></div> } ]}
        rowKey={r => String(r.id ?? '')}
        searchable
        search={query}
        onSearchChange={setQuery}
        searchableText={r => [r.id, r.number, r.date, r.location, r.work, r.task, displayReference('asset', r.asset ?? r.assetId, lookups), displayReference('proj', r.proj, lookups), r.status, r.prio].join(' ')}
        enableColumnVisibility
        columnVisibilityStorageKey={`kemex.${module}.operational-columns.v1`}
        pageSizeOptions={[10, 25, 50]}
        mobilePresentation="cards"
        printTitle={meta.title}
        emptyState={<div className="py-14 text-center text-sm font-medium text-gray-500">لا توجد سجلات في هذه القائمة.</div>}
      />
    </Card>

    {viewing && <DetailModal record={viewing} cfg={cfg} lookups={lookups} actions={availableActions(viewing)} busy={busy} onClose={() => !busy && setViewing(null)} onAction={(action) => action.tone === 'danger' ? setConfirmAction({ record: viewing, action }) : void executeAction(viewing, action)} onEdit={() => { setEditing({ ...viewing }); setViewing(null) }} onNavigate={onNavigate} />}
    {editing && <RecordForm record={editing} cfg={cfg} lookups={lookups} busy={busy} onSubmit={submit} onClose={() => !busy && setEditing(null)} />}

    <ConfirmModal
      open={Boolean(confirmAction)}
      title={confirmAction?.action.label ?? 'تأكيد الإجراء'}
      description={confirmAction ? <>سيتم تغيير حالة السجل <strong>{String(confirmAction.record.number ?? confirmAction.record.id ?? '')}</strong> إلى <strong>{confirmAction.action.to}</strong>.</> : ''}
      confirmLabel={confirmAction?.action.label ?? 'تأكيد'}
      danger
      busy={busy}
      onCancel={() => !busy && setConfirmAction(null)}
      onConfirm={() => confirmAction ? executeAction(confirmAction.record, confirmAction.action) : undefined}
    />
  </div>
}

function DetailModal({ record, cfg, lookups, actions, busy, onClose, onAction, onEdit, onNavigate }: { record: Record<string, unknown>; cfg: ModuleConfig; lookups: ReferenceLookups; actions: WorkflowAction[]; busy: boolean; onClose: () => void; onAction: (action: WorkflowAction) => void; onEdit: () => void; onNavigate?: (route: string) => void }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal-card wide" role="dialog" aria-modal="true" onMouseDown={(e: MouseEvent) => e.stopPropagation()}><div className="modal-head"><div><h2>تفاصيل التشغيل</h2><p>{cfg.title} · <strong>{String(record.number ?? record.date ?? record.id ?? '')}</strong></p></div><button className="icon-button" type="button" onClick={onClose}><X size={18} /></button></div><div className="detail-grid">{cfg.fields.map((field: ModuleField) => <div className="detail-item" key={field.key}><span>{field.label}</span><strong><ReferenceValue field={field.key} value={record[field.key]} lookups={lookups} /></strong></div>)}</div><div className="modal-actions">{actions.map((action: WorkflowAction) => <button key={action.key} type="button" className={`workflow-button ${action.tone ?? 'secondary'}`} disabled={busy} onClick={() => onAction(action)}>{action.label}</button>)}<button type="button" className="secondary-button" onClick={onClose}>إغلاق</button><button type="button" className="primary-button" onClick={onEdit}><Pencil size={15} /> تعديل</button></div>{onNavigate && record.id && <button type="button" className="mt-3 text-sm font-bold text-primary-700 hover:underline" onClick={() => onNavigate(`assignments/${encodeURIComponent(String(record.id))}`)}>فتح السجل المرتبط</button>}</section></div>
}

function RecordForm({ record, cfg, lookups, busy, onSubmit, onClose }: any) {
  const groups = new Map<string, ModuleField[]>()
  cfg.fields.forEach((field: ModuleField) => { const group = field.section ?? 'البيانات'; groups.set(group, [...(groups.get(group) ?? []), field]) })
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="modal-card wide form-modal-premium" onSubmit={onSubmit} onMouseDown={(e) => e.stopPropagation()}><div className="modal-head"><div><div className="form-kicker">بيانات تشغيلية</div><h2>{cfg.title}</h2><p>{cfg.formIntro ?? cfg.description}</p></div><button className="icon-button" type="button" disabled={busy} onClick={onClose}><X size={18} /></button></div><div className="form-sections">{Array.from(groups.entries()).map(([title, fields]) => <FormSection key={title} title={title} description="أكمل البيانات التي يعتمد عليها التشغيل والاعتماد."><>{fields.map((field) => field.key === (cfg.workflow?.statusField ?? 'status') ? <div className="field" key={field.key}><span>{field.label}</span><div className="workflow-status-readonly"><strong>{String(record[field.key] ?? cfg.workflow?.createStatus ?? '—')}</strong><small>تتغير الحالة من دورة الاعتماد فقط.</small></div></div> : <OperationalField key={field.key} field={field} value={record[field.key]} lookups={lookups} />)}</></FormSection>)}</div><div className="modal-actions"><button type="button" className="secondary-button" disabled={busy} onClick={onClose}>إلغاء</button><button className="primary-button" disabled={busy}>{busy ? 'جارٍ الحفظ...' : 'حفظ السجل'}</button></div></form></div>
}

function OperationalField({ field, value, lookups }: { field: ModuleField; value: unknown; lookups: ReferenceLookups }) {
  const current = value == null ? '' : String(value)
  const refs = referenceOptions(field.key, lookups)
  const control = field.type === 'textarea'
    ? <textarea name={field.key} defaultValue={current} rows={4} required={field.required} />
    : refs.length > 0
      ? <select name={field.key} defaultValue={current} required={field.required}><option value="">— اختر —</option>{refs.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
      : field.type === 'select'
        ? <select name={field.key} defaultValue={current} required={field.required}><option value="">— اختر —</option>{(field.options ?? []).map(option => <option key={option} value={option}>{option}</option>)}</select>
        : <input name={field.key} type={field.type ?? 'text'} defaultValue={current} required={field.required} min={field.type === 'number' ? 0 : undefined} step={field.type === 'number' ? 'any' : undefined} />
  return <label className={`field ${field.full ? 'field-full' : ''}`}><span>{field.label}{field.required && ' *'}</span>{control}{field.help && <small className="field-help">{field.help}</small>}</label>
}
