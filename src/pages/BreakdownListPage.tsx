import { useMemo, useState } from 'react'
import { APP_LOCALE } from '../shared/formatters/locale'
import {
  AlertTriangle,
  Clock,
  Eye,
  Plus,
  Trash2,
  Wrench,
  Truck,
  CheckCircle2,
} from 'lucide-react'
import type { Asset, Driver, Project } from '../types/tfms'
import {
  type BreakdownEvent,
  type BreakdownSeverity,
  type BreakdownStatus,
  BREAKDOWN_STATUS_LABELS,
  SEVERITY_LABELS,
} from '../types/breakdown'
import {
  useBreakdownList,
  useDeleteBreakdown,
} from '../hooks/useBreakdown'
import {
  PageHeader,
  DataTable,
  type DataTableColumn,
  ConfirmModal,
  useToast,
} from '../shared/ui'
import { StatusBadge } from '../components/StatusBadge'

interface BreakdownListPageProps {
  assets: Asset[]
  projects: Project[]
  drivers?: Driver[]
  onRoute: (route: string) => void
  canEdit?: boolean
}

export function BreakdownListPage({
  assets,
  projects,
  onRoute,
  canEdit = true,
}: BreakdownListPageProps) {
  const toast = useToast()
  const [severityFilter, setSeverityFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [queueFilter, setQueueFilter] = useState<'all' | 'open' | 'repair' | 'transit' | 'critical'>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data: breakdowns = [], isLoading, error } = useBreakdownList()
  const deleteMutation = useDeleteBreakdown()

  const assetsMap = useMemo(() => new Map(assets.map(a => [a.id, a])), [assets])
  // Filtered rows
  const filteredBreakdowns = useMemo(() => {
    return breakdowns.filter(item => {
      if (severityFilter && item.severity !== severityFilter) return false
      if (statusFilter && item.status !== statusFilter) return false
      if (queueFilter === 'open' && item.status === 'closed') return false
      if (queueFilter === 'repair' && item.status !== 'under_repair') return false
      if (queueFilter === 'transit' && !['in_transit_to_workshop', 'in_transit_to_site'].includes(item.status)) return false
      if (queueFilter === 'critical' && (item.status === 'closed' || (item.downtime_hours ?? 0) < 72)) return false
      return true
    })
  }, [breakdowns, severityFilter, statusFilter, queueFilter])

  // Metrics
  const openCount = breakdowns.filter(b => b.status !== 'closed').length
  const underRepairCount = breakdowns.filter(b => b.status === 'under_repair').length
  const inTransitCount = breakdowns.filter(
    b => b.status === 'in_transit_to_workshop' || b.status === 'in_transit_to_site'
  ).length
  const criticalDowntimeCount = breakdowns.filter(
    b => b.status !== 'closed' && (b.downtime_hours ?? 0) >= 72
  ).length

  async function handleDelete() {
    if (!deletingId) return
    try {
      await deleteMutation.mutateAsync(deletingId)
      toast.show({ message: 'تم حذف سجل العطل بنجاح.', tone: 'success' })
      setDeletingId(null)
    } catch (err) {
      toast.show({
        message: err instanceof Error ? err.message : 'تعذر حذف العطل.',
        tone: 'error',
      })
    }
  }

  const columns: DataTableColumn<BreakdownEvent>[] = [
    {
      id: 'asset',
      header: 'المعدة / الأصل',
      render: row => {
        const asset = assetsMap.get(row.asset_id)
        return (
          <div className="flex flex-col">
            <strong className="text-sm font-semibold text-slate-900">
              {asset?.name ?? row.asset_id}
            </strong>
            <small className="text-xs font-medium text-slate-500">
              كود: {asset?.code ?? '—'}
            </small>
          </div>
        )
      },
      searchable: true,
      sortValue: row => assetsMap.get(row.asset_id)?.name ?? row.asset_id,
    },
    {
      id: 'description',
      header: 'وصف العطل',
      render: row => (
        <span className="inline-block max-w-[260px] overflow-hidden text-ellipsis whitespace-nowrap align-middle" title={row.description}>
          {row.description}
        </span>
      ),
      searchable: true,
      sortValue: row => row.description,
    },
    {
      id: 'severity',
      header: 'الخطورة',
      render: row => (
        <StatusBadge>{SEVERITY_LABELS[row.severity] ?? row.severity}</StatusBadge>
      ),
      sortValue: row => row.severity,
    },
    {
      id: 'status',
      header: 'الحالة',
      render: row => (
        <StatusBadge>{BREAKDOWN_STATUS_LABELS[row.status] ?? row.status}</StatusBadge>
      ),
      sortValue: row => row.status,
    },
    {
      id: 'date',
      header: 'تاريخ العطل',
      render: row => {
        const d = new Date(row.breakdown_datetime)
        return (
          <span className="text-sm font-medium text-slate-700">
            {new Intl.DateTimeFormat(APP_LOCALE, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }).format(d)}
          </span>
        )
      },
      sortValue: row => new Date(row.breakdown_datetime).getTime(),
    },
    {
      id: 'downtime',
      header: 'مدة التوقف',
      render: row => {
        const hours = row.downtime_hours ?? 0
        const isCritical = row.status !== 'closed' && hours >= 72
        return (
          <span className={`text-sm font-bold ${isCritical ? 'text-red-700' : 'text-slate-900'}`}>
            {hours.toFixed(1)} ساعة
            {isCritical && (
              <StatusBadge tone="red" className="ms-1">
                &gt;72س!
              </StatusBadge>
            )}
          </span>
        )
      },
      sortValue: row => row.downtime_hours ?? 0,
    },
    {
      id: 'actions',
      header: 'إجراءات',
      render: row => (
        <div className="row-actions">
          <button
            type="button"
            className="workflow-button primary"
            onClick={() => onRoute(`breakdowns/${row.id}`)}
            title="عرض التفاصيل والتحكم"
          >
            <Eye size={13} />
            <span>تفاصيل</span>
          </button>
          {canEdit && (
            <button
              type="button"
              className="icon-button danger-icon"
              onClick={() => setDeletingId(row.id)}
              title="حذف العطل"
              aria-label="حذف العطل"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="إدارة الأعطال والتكاليف الكاملة"
        description="تتبع دورة حياة الأعطال من البلاغ الميداني حتى عودة الأصل، واحتساب التكلفة الحقيقية (المباشرة وغير المباشرة)."
        action={
          canEdit && (
            <button
              type="button"
              className="primary-button"
              onClick={() => onRoute('breakdowns/new')}
            >
              <Plus size={16} /> تسجيل عطل جديد
            </button>
          )
        }
      />

      {error && (
        <div className="global-error" role="alert">
          <AlertTriangle size={17} />
          <span>{error instanceof Error ? error.message : 'تعذر تحميل قائمة الأعطال.'}</span>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="metric-grid compact mb-4">
        <div className="metric-card">
          <div className="metric-icon bg-amber-100 text-amber-700">
            <AlertTriangle size={18} />
          </div>
          <div className="metric-body">
            <span>أعطال نشطة ومفتوحة</span>
            <strong>{openCount}</strong>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon bg-blue-100 text-blue-700">
            <Truck size={18} />
          </div>
          <div className="metric-body">
            <span>في مسار النقل (ورشة/موقع)</span>
            <strong>{inTransitCount}</strong>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon bg-slate-100 text-slate-600">
            <Wrench size={18} />
          </div>
          <div className="metric-body">
            <span>قيد الإصلاح بالورشة</span>
            <strong>{underRepairCount}</strong>
          </div>
        </div>

        <div className={`metric-card ${criticalDowntimeCount > 0 ? 'border border-red-200 bg-red-50' : 'bg-white'}`}>
          <div className={`metric-icon ${criticalDowntimeCount > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
            <Clock size={18} />
          </div>
          <div className="metric-body">
            <span className={criticalDowntimeCount > 0 ? 'text-red-800' : undefined}>
              توقف حرج تجاوز 72 ساعة
            </span>
            <strong className={criticalDowntimeCount > 0 ? 'text-red-700' : undefined}>
              {criticalDowntimeCount}
            </strong>
          </div>
        </div>
      </div>

      {/* Filter Bar and Table */}
      <section className="panel">
        <div className="toolbar flex flex-wrap items-center gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="min-w-[150px]"
            >
              <option value="">كل الحالات</option>
              {(Object.entries(BREAKDOWN_STATUS_LABELS) as [BreakdownStatus, string][]).map(
                ([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                )
              )}
            </select>

            <select
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value)}
              className="min-w-[130px]"
            >
              <option value="">كل درجات الخطورة</option>
              {(Object.entries(SEVERITY_LABELS) as [BreakdownSeverity, string][]).map(
                ([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                )
              )}
            </select>

            <div className="w-full basis-full border-t border-slate-100 pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-slate-700">طابور الأعطال:</span>
                {([
                  ['all', 'كل الأعطال', breakdowns.length],
                  ['open', 'مفتوحة', openCount],
                  ['repair', 'قيد الإصلاح', underRepairCount],
                  ['transit', 'في النقل', inTransitCount],
                  ['critical', 'توقف حرج', criticalDowntimeCount],
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
                <span className="ms-auto text-xs font-semibold text-slate-500">يُعرض {filteredBreakdowns.length} من {breakdowns.length}</span>
              </div>
            </div>

            {(statusFilter || severityFilter || queueFilter !== 'all') && (
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setStatusFilter('')
                  setSeverityFilter('')
                  setQueueFilter('all')
                }}
              >
                إعادة ضبط الفلاتر
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="loading-page min-h-[260px]">
            <div className="spinner" />
            <strong>جارٍ تحميل سجلات الأعطال...</strong>
          </div>
        ) : (
          <DataTable
            rows={filteredBreakdowns}
            columns={columns}
            rowKey={row => row.id}
            searchPlaceholder="بحث بكود أو اسم الأصل أو وصف العطل..."
            pageSize={10}
            emptyState={
              <div className="empty">
                <AlertTriangle size={28} className="text-slate-400" />
                <span>لا توجد بلاغات أعطال مسجلة تطابق معايير البحث.</span>
              </div>
            }
          />
        )}
      </section>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={Boolean(deletingId)}
        title="تأكيد حذف سجل العطل"
        description="هل أنت متأكد من رغبتك في حذف هذا العطل؟ سيتم حذف جميع حركات النقل وبنود التكلفة وسجلات التوقف المرتبطة به نهائياً."
        confirmLabel="حذف العطل"
        danger
        busy={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  )
}
