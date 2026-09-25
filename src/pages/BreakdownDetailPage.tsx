import { useMemo, useState } from 'react'
import { APP_LOCALE } from '../shared/formatters/locale'
import {
  ArrowRight,
  AlertTriangle,
  Clock,
  Plus,
  Trash2,
  Truck,
  DollarSign,
  Calendar,
  MapPin,
  User,
  CheckCircle2,
  Pencil,
  Lock,
  Wrench,
} from 'lucide-react'
import type { Asset, Customer, Driver, Project, WorkOrder } from '../types/tfms'
import {
  type BreakdownStatus,
  type MaintenanceTransport,
  type MaintenanceCostItem,
  type DowntimeTracking,
  BREAKDOWN_STATUS_LABELS,
  SEVERITY_LABELS,
  COST_CATEGORY_LABELS,
  TRANSPORT_TYPE_LABELS,
  STATUS_TRANSITIONS,
} from '../types/breakdown'
import {
  useBreakdownDetail,
  useTransports,
  useCostItems,
  useDowntime,
  useUpdateBreakdownStatus,
  useUpdateBreakdown,
  useCloseBreakdown,
  useCreateTransport,
  useDeleteTransport,
  useCreateCostItem,
  useUpdateCostItem,
  useDeleteCostItem,
  useCreateDowntime,
  useCloseDowntime,
  useDeleteDowntime,
} from '../hooks/useBreakdown'
import { calculateBreakdownCost } from '../services/breakdownService'
import {
  DetailTabs,
  ConfirmModal,
  WorkflowActionCard,
  WorkflowTimeline,
  useToast,
} from '../shared/ui'
import { Button, DataTable, PageHeader, StatusBadge } from '../components/ui'
import { CostSummaryCard } from '../components/CostSummaryCard'
import { MAINTENANCE_WORKFLOW, maintenanceStageForStatus } from '../shared/workflows/workflowDefinitions'
import { TransportFormModal } from '../components/TransportFormModal'
import { CostItemFormModal } from '../components/CostItemFormModal'
import { DowntimeFormModal } from '../components/DowntimeFormModal'
import { useCurrency } from '../features/settings'

interface BreakdownDetailPageProps {
  id: string
  assets: Asset[]
  projects: Project[]
  drivers?: Driver[]
  clients?: Customer[]
  workOrders?: WorkOrder[]
  onBack: () => void
  onCreateWorkOrder?: (workOrder: WorkOrder) => Promise<void>
  canEdit?: boolean
}

export function BreakdownDetailPage({
  id,
  assets,
  projects,
  drivers = [],
  clients = [],
  workOrders = [],
  onBack,
  onCreateWorkOrder,
  canEdit = true,
}: BreakdownDetailPageProps) {
  const toast = useToast()
  const { formatMoney } = useCurrency()

  // Queries
  const { data: breakdown, isLoading: bLoading, error: bError } = useBreakdownDetail(id)
  const { data: transports = [], isLoading: tLoading } = useTransports(id)
  const { data: costItems = [], isLoading: cLoading } = useCostItems(id)
  const { data: downtime = [], isLoading: dLoading } = useDowntime(id)

  // Mutations
  const updateStatusMut = useUpdateBreakdownStatus(id)
  const closeBreakdownMut = useCloseBreakdown(id)
  const updateBreakdownMut = useUpdateBreakdown(id)
  const createTransportMut = useCreateTransport(id)
  const deleteTransportMut = useDeleteTransport(id)
  const createCostItemMut = useCreateCostItem(id)
  const updateCostItemMut = useUpdateCostItem(id)
  const deleteCostItemMut = useDeleteCostItem(id)
  const createDowntimeMut = useCreateDowntime(id)
  const closeDowntimeMut = useCloseDowntime(id)
  const deleteDowntimeMut = useDeleteDowntime(id)

  // Modals state
  const [transportModalOpen, setTransportModalOpen] = useState(false)
  const [costModalOpen, setCostModalOpen] = useState(false)
  const [editingCostItem, setEditingCostItem] = useState<MaintenanceCostItem | null>(null)
  const [downtimeModalOpen, setDowntimeModalOpen] = useState(false)
  const [closeModalOpen, setCloseModalOpen] = useState(false)
  const [recoveryDate, setRecoveryDate] = useState(() => new Date().toISOString().slice(0, 16))

  // Delete confirms
  const [deletingTransportId, setDeletingTransportId] = useState<string | null>(null)
  const [deletingCostItemId, setDeletingCostItemId] = useState<string | null>(null)
  const [deletingDowntimeId, setDeletingDowntimeId] = useState<string | null>(null)

  const asset = useMemo(() => assets.find(a => a.id === breakdown?.asset_id), [assets, breakdown?.asset_id])
  const project = useMemo(() => projects.find(p => p.id === breakdown?.project_id), [projects, breakdown?.project_id])
  const driver = useMemo(() => drivers.find(d => d.id === breakdown?.driver_id), [drivers, breakdown?.driver_id])
  const linkedWorkOrder = useMemo(() => workOrders.find(w => w.id === breakdown?.work_order_id), [workOrders, breakdown?.work_order_id])

  // Cost summary computed
  const costSummary = useMemo(() => {
    if (!breakdown) return null
    return calculateBreakdownCost(costItems, transports, downtime, breakdown)
  }, [breakdown, costItems, transports, downtime])

  if (bLoading) {
    return (
      <div className="loading-page">
        <div className="spinner" />
        <strong>جارٍ تحميل تفاصيل العطل...</strong>
      </div>
    )
  }

  if (bError || !breakdown) {
    return (
      <div>
        <PageHeader title="تفاصيل العطل" action={<button type="button" className="secondary-button" onClick={onBack}><ArrowRight size={16} /> العودة للأعطال</button>} />
        <div className="global-error" role="alert">
          <AlertTriangle size={18} />
          <span>{bError instanceof Error ? bError.message : 'العطل المطلوب غير موجود في قاعدة البيانات.'}</span>
        </div>
      </div>
    )
  }

  const isClosed = breakdown.status === 'closed'
  const isCriticalDowntime = !isClosed && (breakdown.downtime_hours ?? 0) >= 72
  const allowedNext = STATUS_TRANSITIONS[breakdown.status] ?? []

  async function handleStatusTransition(nextStatus: BreakdownStatus) {
    if (nextStatus === 'closed') {
      setCloseModalOpen(true)
      return
    }
    try {
      await updateStatusMut.mutateAsync(nextStatus)
      toast.show({
        message: `تم تحديث حالة العطل إلى "${BREAKDOWN_STATUS_LABELS[nextStatus]}".`,
        tone: 'success',
      })
    } catch (err) {
      toast.show({
        message: err instanceof Error ? err.message : 'تعذر تحديث الحالة.',
        tone: 'error',
      })
    }
  }

  async function handleCreateWorkOrder() {
    if (!onCreateWorkOrder || linkedWorkOrder || !breakdown) return
    const workOrder: WorkOrder = {
      id: `WO-${Date.now()}`,
      asset: breakdown.asset_id,
      proj: breakdown.project_id ?? undefined,
      type: 'إصلاح عطل',
      desc: `إصلاح عطل: ${breakdown.description}`.trim(),
      opened: new Date(breakdown.breakdown_datetime || breakdown.reported_at).toISOString().slice(0, 10),
      prio: breakdown.severity === 'critical' ? 'عاجلة' : breakdown.severity === 'major' ? 'عالية' : 'عادية',
      status: 'بانتظار الاعتماد',
      laborCost: 0,
      partsCost: 0,
      vendorCost: 0,
    }
    try {
      await onCreateWorkOrder(workOrder)
      await updateBreakdownMut.mutateAsync({ work_order_id: workOrder.id })
      toast.show({ message: `تم إنشاء أمر العمل ${workOrder.id} وربطه بالعطل.`, tone: 'success' })
    } catch (err) {
      toast.show({ message: err instanceof Error ? err.message : 'تعذر إنشاء أمر العمل.', tone: 'error' })
    }
  }

  async function handleCloseBreakdown() {
    try {
      await closeBreakdownMut.mutateAsync(new Date(recoveryDate).toISOString())
      toast.show({
        message: 'تم إغلاق العطل بنجاح وإعادة حالة الأصل إلى "متاح".',
        tone: 'success',
      })
      setCloseModalOpen(false)
    } catch (err) {
      toast.show({
        message: err instanceof Error ? err.message : 'تعذر إغلاق العطل.',
        tone: 'error',
      })
    }
  }

  return (
    <div className="space-y-6 workflow-page breakdown-detail-page">
      <PageHeader
        title={`عطل: ${asset?.name ?? breakdown.asset_id} (${asset?.code ?? '—'})`}
        description={breakdown.description}
        meta={
          <div className="flex items-center gap-2">
            <StatusBadge>{BREAKDOWN_STATUS_LABELS[breakdown.status]}</StatusBadge>
            <StatusBadge>{SEVERITY_LABELS[breakdown.severity]}</StatusBadge>
          </div>
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="secondary-button" onClick={onBack}>
              <ArrowRight size={16} /> العودة للقائمة
            </button>
            {!linkedWorkOrder && !isClosed && canEdit && onCreateWorkOrder && (
              <button
                type="button"
                className="primary-button"
                disabled={updateBreakdownMut.isPending}
                onClick={() => void handleCreateWorkOrder()}
              >
                <Wrench size={16} /> إنشاء أمر عمل
              </button>
            )}
            {!isClosed && canEdit && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => setCloseModalOpen(true)}
              >
                <CheckCircle2 size={16} /> إغلاق العطل واستعادة الأصل
              </button>
            )}
          </div>
        }
      />

      {/* Critical Downtime Alert (> 72 hours) */}
      {isCriticalDowntime && (
<div className="global-error mb-4 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800" role="alert">
          <AlertTriangle size={20} className="text-red-700" />
          <div>
            <strong className="block text-sm font-bold">
              تحذير مدة توقف حرجة: المعدة متوقفة منذ أكثر من 72 ساعة ({breakdown.downtime_hours?.toFixed(1)} ساعة)!
            </strong>
            <span className="text-sm font-medium text-red-800/90">
              يرجى سرعة المتابعة الميدانية مع الورشة أو مقاول النقل لتقليل خسائر الفرصة البديلة وتكاليف التوقف.
            </span>
          </div>
        </div>
      )}

      {/* Visual maintenance workflow */}
      <WorkflowTimeline
        label={MAINTENANCE_WORKFLOW.label}
        stages={MAINTENANCE_WORKFLOW.stages}
        currentStageId={maintenanceStageForStatus(breakdown.status)}
        currentStatus={BREAKDOWN_STATUS_LABELS[breakdown.status]}
        cancelled={false}
        busy={updateStatusMut.isPending || closeBreakdownMut.isPending}
        nextActions={canEdit ? allowedNext.map(nextStatus => ({
          label: `انتقال: ${BREAKDOWN_STATUS_LABELS[nextStatus]}`,
          onClick: () => void handleStatusTransition(nextStatus),
          tone: nextStatus === 'closed' ? 'secondary' as const : 'primary' as const,
        })) : []}
      />

      <WorkflowActionCard
        title={linkedWorkOrder ? 'أمر العمل مرتبط بالعطل' : isClosed ? 'العطل مغلق' : 'الإجراء التشغيلي التالي'}
        description={linkedWorkOrder ? `أمر العمل ${linkedWorkOrder.id} مرتبط بهذا البلاغ؛ استكمل التشخيص والإصلاح والتكلفة من دورة الصيانة.` : isClosed ? 'تم إنهاء العطل ويمكن الرجوع إلى سجل الأصل للتأكد من الحالة بعد الإصلاح.' : 'قبل إغلاق العطل، تأكد من وجود أمر عمل عند الحاجة وتوثيق النقل والتوقف وبنود التكلفة.'}
        status={<StatusBadge tone={isClosed ? 'emerald' : isCriticalDowntime ? 'red' : 'blue'}>{BREAKDOWN_STATUS_LABELS[breakdown.status]}</StatusBadge>}
        action={!linkedWorkOrder && !isClosed && canEdit && onCreateWorkOrder ? <button type="button" className="primary-button" disabled={updateBreakdownMut.isPending} onClick={() => void handleCreateWorkOrder()}><Wrench size={15}/> إنشاء أمر عمل</button> : undefined}
        secondary={!isClosed ? <button type="button" className="secondary-button" onClick={() => setCostModalOpen(true)}>إضافة تكلفة</button> : <button type="button" className="secondary-button" onClick={onBack}>العودة للأعطال</button>}
      />

      {/* Main Content Layout: Tabs + Sidebar */}
<div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Right Area: Tabs */}
        <div>
          <DetailTabs
            defaultTab="overview"
            tabs={[
              {
                id: 'overview',
                label: 'نظرة عامة والبيانات',
                content: (
                  <OverviewTab
                    breakdown={breakdown}
                    asset={asset}
                    project={project}
                    driver={driver}
                    workOrder={linkedWorkOrder}
                  />
                ),
              },
              {
                id: 'transports',
                label: `حركات النقل (${transports.length})`,
                content: (
                  <TransportsTab
                    transports={transports}
                    loading={tLoading}
                    canEdit={canEdit && !isClosed}
                    formatMoney={formatMoney}
                    onAdd={() => setTransportModalOpen(true)}
                    onDelete={id => setDeletingTransportId(id)}
                  />
                ),
              },
              {
                id: 'costs',
                label: `بنود التكاليف (${costItems.length})`,
                content: (
                  <CostItemsTab
                    costItems={costItems}
                    loading={cLoading}
                    canEdit={canEdit && !isClosed}
                    formatMoney={formatMoney}
                    onAdd={() => {
                      setEditingCostItem(null)
                      setCostModalOpen(true)
                    }}
                    onEdit={item => {
                      setEditingCostItem(item)
                      setCostModalOpen(true)
                    }}
                    onDelete={id => setDeletingCostItemId(id)}
                  />
                ),
              },
              {
                id: 'downtime',
                label: `سجلات التوقف (${downtime.length})`,
                content: (
                  <DowntimeTab
                    downtime={downtime}
                    loading={dLoading}
                    canEdit={canEdit && !isClosed}
                    formatMoney={formatMoney}
                    onAdd={() => setDowntimeModalOpen(true)}
                    onCloseDowntime={async dId => {
                      try {
                        await closeDowntimeMut.mutateAsync({
                          id: dId,
                          endDatetime: new Date().toISOString(),
                        })
                        toast.show({ message: 'تم إغلاق فترة التوقف بنجاح.', tone: 'success' })
                      } catch (err) {
                        toast.show({ message: 'تعذر إغلاق فترة التوقف.', tone: 'error' })
                      }
                    }}
                    onDelete={id => setDeletingDowntimeId(id)}
                  />
                ),
              },
            ]}
          />
        </div>

        {/* Left Area (Sidebar): Cost Summary Card */}
        <aside className="xl:sticky xl:top-24">
          <CostSummaryCard summary={costSummary} loading={cLoading || tLoading || dLoading} />
        </aside>
      </div>

      {/* Modals */}
      {transportModalOpen && (
        <TransportFormModal
          breakdownId={breakdown.id}
          onClose={() => setTransportModalOpen(false)}
          onSave={async payload => {
            await createTransportMut.mutateAsync(payload)
            toast.show({ message: 'تمت إضافة حركة النقل بنجاح.', tone: 'success' })
          }}
          busy={createTransportMut.isPending}
        />
      )}

      {costModalOpen && (
        <CostItemFormModal
          breakdownId={breakdown.id}
          clients={clients}
          initialData={editingCostItem}
          onClose={() => {
            setCostModalOpen(false)
            setEditingCostItem(null)
          }}
          onSave={async payload => {
            if (editingCostItem) {
              await updateCostItemMut.mutateAsync({ id: editingCostItem.id, payload })
              toast.show({ message: 'تم تحديث بند التكلفة بنجاح.', tone: 'success' })
            } else {
              await createCostItemMut.mutateAsync(payload)
              toast.show({ message: 'تمت إضافة بند التكلفة بنجاح.', tone: 'success' })
            }
          }}
          busy={createCostItemMut.isPending || updateCostItemMut.isPending}
        />
      )}

      {downtimeModalOpen && (
        <DowntimeFormModal
          breakdownId={breakdown.id}
          assetId={breakdown.asset_id}
          driverId={breakdown.driver_id}
          drivers={drivers}
          onClose={() => setDowntimeModalOpen(false)}
          onSave={async payload => {
            await createDowntimeMut.mutateAsync(payload)
            toast.show({ message: 'تم تسجيل فترة التوقف بنجاح.', tone: 'success' })
          }}
          busy={createDowntimeMut.isPending}
        />
      )}

      {/* Close Breakdown Modal */}
      {closeModalOpen && (
        <div className="modal-backdrop" onMouseDown={() => setCloseModalOpen(false)}>
          <div
            className="modal-card form-modal-premium w-full max-w-[480px]"
            onMouseDown={e => e.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <h2 className="flex items-center gap-2">
                  <CheckCircle2 size={20} className="text-primary-600" />
                  <span>إغلاق العطل واستعادة الأصل</span>
                </h2>
                <p>تسجيل تاريخ ووقت عودة المعدة للخدمة وإعادة حالتها إلى "متاح".</p>
              </div>
            </div>
            <div className="p-4">
              <label className="field">
                <span>تاريخ ووقت عودة الأصل للعمل <em className="required-mark">*</em></span>
                <input
                  type="datetime-local"
                  value={recoveryDate}
                  onChange={e => setRecoveryDate(e.target.value)}
                  required
                />
              </label>
              <p className="mt-2.5 text-sm font-medium text-slate-500">
                سيتم تحديث ساعات التوقف الإجمالية وحساب إجمالي التكلفة الحقيقية وإغلاق العطل تلقائياً.
              </p>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setCloseModalOpen(false)}
                disabled={closeBreakdownMut.isPending}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={handleCloseBreakdown}
                disabled={closeBreakdownMut.isPending}
              >
                {closeBreakdownMut.isPending ? 'جارٍ الإغلاق...' : 'تأكيد إغلاق العطل'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmations */}
      <ConfirmModal
        open={Boolean(deletingTransportId)}
        title="تأكيد حذف حركة النقل"
        description="هل تريد بالتأكيد حذف هذه الحركة وسحب تكلفتها من التكاليف المباشرة؟"
        confirmLabel="حذف النقل"
        danger
        busy={deleteTransportMut.isPending}
        onConfirm={async () => {
          if (!deletingTransportId) return
          await deleteTransportMut.mutateAsync(deletingTransportId)
          toast.show({ message: 'تم حذف حركة النقل بنجاح.', tone: 'success' })
          setDeletingTransportId(null)
        }}
        onCancel={() => setDeletingTransportId(null)}
      />

      <ConfirmModal
        open={Boolean(deletingCostItemId)}
        title="تأكيد حذف بند التكلفة"
        description="هل تريد بالتأكيد حذف هذا البند وإلغاء تسجيل مبلغه في إجمالي تكلفة العطل؟"
        confirmLabel="حذف البند"
        danger
        busy={deleteCostItemMut.isPending}
        onConfirm={async () => {
          if (!deletingCostItemId) return
          await deleteCostItemMut.mutateAsync(deletingCostItemId)
          toast.show({ message: 'تم حذف بند التكلفة بنجاح.', tone: 'success' })
          setDeletingCostItemId(null)
        }}
        onCancel={() => setDeletingCostItemId(null)}
      />

      <ConfirmModal
        open={Boolean(deletingDowntimeId)}
        title="تأكيد حذف فترة التوقف"
        description="هل تريد بالتأكيد حذف سجل التوقف هذا؟"
        confirmLabel="حذف التوقف"
        danger
        busy={deleteDowntimeMut.isPending}
        onConfirm={async () => {
          if (!deletingDowntimeId) return
          await deleteDowntimeMut.mutateAsync(deletingDowntimeId)
          toast.show({ message: 'تم حذف سجل التوقف بنجاح.', tone: 'success' })
          setDeletingDowntimeId(null)
        }}
        onCancel={() => setDeletingDowntimeId(null)}
      />
    </div>
  )
}

/* ========================================================================= */
/* TAB 1: OVERVIEW */
/* ========================================================================= */
function OverviewTab({
  breakdown,
  asset,
  project,
  driver,
  workOrder,
}: {
  breakdown: import('../types/breakdown').BreakdownEvent
  asset?: Asset
  project?: Project
  driver?: Driver
  workOrder?: WorkOrder
}) {
  return (
    <div className="flex flex-col gap-4">
      <section className="panel px-5 py-4">
        <h3 className="mb-3.5 text-base font-bold text-slate-900">
          بيانات البلاغ الميداني
        </h3>
        <div className="detail-grid p-0">
          <div className="detail-item">
            <span>المعدة / الأصل</span>
            <strong>{asset?.name ?? breakdown.asset_id} ({asset?.code ?? '—'})</strong>
          </div>
          <div className="detail-item">
            <span>المشروع التابع له</span>
            <strong>{project ? `${project.name} (${project.code})` : '—'}</strong>
          </div>
          <div className="detail-item">
            <span>السائق / المشغل</span>
            <strong>{driver ? `${driver.name} (${driver.code})` : '—'}</strong>
          </div>
          <div className="detail-item">
            <span>تاريخ ووقت حدوث العطل</span>
            <strong>{new Date(breakdown.breakdown_datetime).toLocaleString(APP_LOCALE)}</strong>
          </div>
          <div className="detail-item">
            <span>تاريخ ووقت الإبلاغ</span>
            <strong>{new Date(breakdown.reported_at).toLocaleString(APP_LOCALE)}</strong>
          </div>
          <div className="detail-item">
            <span>مكان / موقع العطل</span>
            <strong>{breakdown.location || '—'}</strong>
          </div>
          <div className="detail-item">
            <span>تاريخ ووقت الاستعادة والعودة</span>
            <strong>
              {breakdown.recovery_datetime
                ? new Date(breakdown.recovery_datetime).toLocaleString(APP_LOCALE)
                : 'ما زالت معطلة'}
            </strong>
          </div>
          <div className="detail-item">
            <span>ساعات التوقف المحسوبة</span>
            <strong>{breakdown.downtime_hours ? `${breakdown.downtime_hours.toFixed(1)} ساعة` : '—'}</strong>
          </div>
          <div className="detail-item">
            <span>أمر العمل المرتبط</span>
            <strong>{workOrder ? `${workOrder.id} (${workOrder.type})` : '—'}</strong>
          </div>
        </div>

        <div className="mt-4 border-t border-dashed border-slate-200 pt-3">
          <span className="text-sm font-semibold text-slate-500">وصف وتشخيص العطل:</span>
          <p
className="mt-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-medium leading-6 text-slate-800"
          >
            {breakdown.description}
          </p>
        </div>
      </section>
    </div>
  )
}

/* ========================================================================= */
/* TAB 2: TRANSPORTS */
/* ========================================================================= */
function TransportsTab({
  transports,
  loading,
  canEdit,
  formatMoney,
  onAdd,
  onDelete,
}: {
  transports: MaintenanceTransport[]
  loading: boolean
  canEdit: boolean
  formatMoney: (val: number | null | undefined) => string
  onAdd: () => void
  onDelete: (id: string) => void
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">حركات نقل المعدة (ذهاب وعودة)</h2>
          <p className="text-sm font-medium text-gray-500">توثيق الأوناش والتريلات وسيارات السحب وتكاليفها المباشرة.</p>
        </div>
        {canEdit && <Button icon={<Plus size={15}/>} onClick={onAdd}>إضافة حركة نقل</Button>}
      </div>
      <DataTable
        rows={transports}
        columns={[
          { id:'direction', header:'الاتجاه', render:t=><strong>{t.direction === 'to_workshop' ? 'للورشة (ذهاب)' : t.direction === 'to_site' ? 'للموقع (عودة)' : 'داخلي'}</strong>, sortValue:t=>t.direction },
          { id:'type', header:'نوع الوسيلة', render:t=>TRANSPORT_TYPE_LABELS[t.transport_type] ?? t.transport_type, sortValue:t=>t.transport_type },
          { id:'from', header:'من', render:t=>t.from_location || '—' },
          { id:'to', header:'إلى', render:t=>t.to_location || '—' },
          { id:'date', header:'التاريخ', render:t=>new Date(t.transport_date).toLocaleDateString(APP_LOCALE), sortValue:t=>t.transport_date },
          { id:'vendor', header:'المورد / الورشة', render:t=>t.vendor_name || '—' },
          { id:'crew', header:'رقم اللوحة / السائق', render:t=>[t.plate_number ? `لوحة: ${t.plate_number}` : '', t.driver_name ? `(${t.driver_name})` : ''].filter(Boolean).join(' ') || '—' },
          { id:'cost', header:'التكلفة', render:t=><strong className="text-primary-700">{formatMoney(t.transport_cost)}</strong>, sortValue:t=>t.transport_cost },
          ...(canEdit ? [{ id:'actions', header:'إجراء', render:(t:MaintenanceTransport)=><Button variant="danger" size="sm" icon={<Trash2 size={13}/>} onClick={()=>onDelete(t.id)}>حذف</Button> }] : []),
        ]}
        rowKey={t=>t.id}
        emptyState={!loading ? <div className="px-6 py-16 text-center text-sm font-medium text-gray-500">لا توجد حركات نقل مسجلة لهذا العطل بعد.</div> : undefined}
        searchableText={t=>[t.direction,t.transport_type,t.from_location,t.to_location,t.vendor_name,t.plate_number,t.driver_name].map(value=>String(value??'')).join(' ')}
      />
    </section>
  )
}

/* ========================================================================= */
/* TAB 3: COST ITEMS */
/* ========================================================================= */
function CostItemsTab({
  costItems,
  loading,
  canEdit,
  formatMoney,
  onAdd,
  onEdit,
  onDelete,
}: {
  costItems: MaintenanceCostItem[]
  loading: boolean
  canEdit: boolean
  formatMoney: (val: number | null | undefined) => string
  onAdd: () => void
  onEdit: (item: MaintenanceCostItem) => void
  onDelete: (id: string) => void
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">بنود التكاليف والمصروفات</h2>
          <p className="text-sm font-medium text-gray-500">كشف وتشخيص، قطع غيار، مصنعيات، ورش خارجية، وبدلات.</p>
        </div>
        {canEdit && <Button icon={<Plus size={15}/>} onClick={onAdd}>إضافة بند تكلفة</Button>}
      </div>
      <DataTable
        rows={costItems}
        columns={[
          { id:'category', header:'التصنيف', render:item=><StatusBadge tone="blue">{COST_CATEGORY_LABELS[item.cost_category] ?? item.cost_category}</StatusBadge>, sortValue:item=>item.cost_category },
          { id:'description', header:'الوصف / الفاتورة', render:item=><div><strong>{item.description}</strong>{item.invoice_number&&<div className="text-sm font-medium text-gray-500">فاتورة: {item.invoice_number}</div>}</div>, sortValue:item=>item.description },
          { id:'vendor', header:'المورد', render:item=>item.vendor_name||'—', sortValue:item=>item.vendor_name||'' },
          { id:'date', header:'التاريخ', render:item=>item.cost_date, sortValue:item=>item.cost_date },
          { id:'billable', header:'قابل للفوترة؟', render:item=><StatusBadge tone={item.is_billable?'emerald':'gray'}>{item.is_billable?'نعم (لعميل)':'لا'}</StatusBadge>, sortValue:item=>item.is_billable?1:0 },
          { id:'amount', header:'المبلغ', render:item=><strong className="text-primary-700">{formatMoney(item.amount)}</strong>, sortValue:item=>item.amount },
          ...(canEdit ? [{ id:'actions', header:'إجراءات', render:(item:MaintenanceCostItem)=><div className="flex flex-wrap gap-2"><Button variant="ghost" size="sm" icon={<Pencil size={13}/>} onClick={()=>onEdit(item)}>تعديل</Button><Button variant="danger" size="sm" icon={<Trash2 size={13}/>} onClick={()=>onDelete(item.id)}>حذف</Button></div> }] : []),
        ]}
        rowKey={item=>item.id}
        emptyState={!loading ? <div className="px-6 py-16 text-center text-sm font-medium text-gray-500">لا توجد بنود تكلفة مسجلة لهذا العطل بعد.</div> : undefined}
        searchableText={item=>[item.description,item.invoice_number,item.vendor_name,item.cost_category].map(value=>String(value??'')).join(' ')}
      />
    </section>
  )
}

/* ========================================================================= */
/* TAB 4: DOWNTIME TRACKING */
/* ========================================================================= */
function DowntimeTab({
  downtime,
  loading,
  canEdit,
  formatMoney,
  onAdd,
  onCloseDowntime,
  onDelete,
}: {
  downtime: DowntimeTracking[]
  loading: boolean
  canEdit: boolean
  formatMoney: (val: number | null | undefined) => string
  onAdd: () => void
  onCloseDowntime: (id: string) => Promise<void>
  onDelete: (id: string) => void
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">سجلات التوقف والتكلفة غير المباشرة</h2>
          <p className="text-sm font-medium text-gray-500">احتساب خسارة الإيراد اليومية وبدل توقف السائق آلياً طوال مدة التوقف.</p>
        </div>
        {canEdit && <Button icon={<Plus size={15}/>} onClick={onAdd}>تسجيل فترة توقف</Button>}
      </div>
      <DataTable
        rows={downtime}
        columns={[
          { id:'start', header:'بداية التوقف', render:d=>new Date(d.start_datetime).toLocaleString(APP_LOCALE), sortValue:d=>d.start_datetime },
          { id:'end', header:'نهاية التوقف', render:d=>d.end_datetime?<span>{new Date(d.end_datetime).toLocaleString(APP_LOCALE)}</span>:<StatusBadge tone="amber">مستمر حتى الآن</StatusBadge>, sortValue:d=>d.end_datetime||'' },
          { id:'duration', header:'المدة (ساعة)', render:d=><strong>{d.duration_hours?`${d.duration_hours.toFixed(1)} س`:'—'}</strong>, sortValue:d=>d.duration_hours??0 },
          { id:'dailyRate', header:'بدل السائق اليومي', render:d=>formatMoney(d.driver_daily_rate), sortValue:d=>d.driver_daily_rate??0 },
          { id:'driverCost', header:'إجمالي بدل السائق', render:d=><strong className="text-red-700">{formatMoney(d.driver_downtime_cost)}</strong>, sortValue:d=>d.driver_downtime_cost??0 },
          { id:'revenueDay', header:'خسارة الإيراد اليومية', render:d=>formatMoney(d.lost_revenue_per_day), sortValue:d=>d.lost_revenue_per_day??0 },
          { id:'revenueTotal', header:'إجمالي خسارة الإيراد', render:d=><strong className="text-red-700">{formatMoney(d.lost_revenue_total)}</strong>, sortValue:d=>d.lost_revenue_total??0 },
          ...(canEdit ? [{ id:'actions', header:'إجراءات', render:(d:DowntimeTracking)=>{const ongoing=!d.end_datetime;return <div className="flex flex-wrap gap-2">{ongoing&&<Button size="sm" icon={<Clock size={12}/>} onClick={()=>void onCloseDowntime(d.id)}>إنهاء</Button>}<Button variant="danger" size="sm" icon={<Trash2 size={13}/>} onClick={()=>onDelete(d.id)}>حذف</Button></div>} }] : []),
        ]}
        rowKey={d=>d.id}
        emptyState={!loading ? <div className="px-6 py-16 text-center text-sm font-medium text-gray-500">لا توجد فترات توقف مسجلة لهذا العطل بعد.</div> : undefined}
        searchableText={d=>Object.values(d).map(value=>String(value??'')).join(' ')}
      />
    </section>
  )
}
