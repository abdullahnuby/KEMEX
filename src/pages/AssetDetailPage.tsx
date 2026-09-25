import { useMemo, type ReactNode } from 'react'
import {
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  FileText,
  Gauge,
  MapPin,
  Pencil,
  ShieldCheck,
  Truck,
  UserRound,
  Wrench,
} from 'lucide-react'
import type {
  Asset,
  AssetCostEntry,
  AssetDocument,
  AssetFinancialSummary,
  AuditEntry,
  FuelOperation,
  Operation,
  Project,
  WorkOrder,
} from '../types/tfms'
import type { Trip } from '../features/trips/types'
import { ReferenceValue } from '../components/ReferenceValue'
import type { DataTableColumn } from '../components/ui/DataTable'
import type { ReferenceLookups } from '../utils/referenceLabels'
import { sameReference } from '../utils/referenceLabels'
import {
  DetailTabs,
  EmptyState,
  PageHeader,
  DataTable,
  Skeleton,
  StatusBadge,
  WorkflowTimeline,
} from '../shared/ui'
import { useAssetDetailData } from '../features/assets'
import { useCurrency } from '../features/settings'
import { VEHICLE_WORKFLOW, vehicleStageForStatus } from '../shared/workflows/workflowDefinitions'
import { APP_LOCALE } from '../shared/formatters/locale'
import './AssetDetailPage.css'

/**
 * Asset detail follows an enterprise EAM pattern:
 * identity + current state first, then a compact operational snapshot,
 * then focused tabs for history and supporting records.
 */
export function AssetDetailPage({
  asset,
  assets,
  projects,
  operations,
  fuelOps,
  workOrders,
  trips = [],
  moduleData,
  onBack,
  onEdit,
  onRoute,
}: {
  asset?: Asset
  assets: Asset[]
  projects: Project[]
  operations: Operation[]
  fuelOps: FuelOperation[]
  workOrders: WorkOrder[]
  trips?: Trip[]
  moduleData: Record<string, Record<string, unknown>[]>
  onBack: () => void
  onEdit: (asset: Asset) => void
  onRoute: (route: string) => void
}) {
  const detail = useAssetDetailData(asset?.id)
  const { formatMoney } = useCurrency()

  const assetOps = useMemo(
    () => operations.filter(item => asset && sameReference(item.assetId, asset)),
    [operations, asset],
  )
  const assetFuel = useMemo(
    () => fuelOps.filter(item => asset && sameReference(item.assetId, asset)),
    [fuelOps, asset],
  )
  const assetOrders = useMemo(
    () => workOrders.filter(item => asset && sameReference(item.asset, asset)),
    [workOrders, asset],
  )
  const assetTrips = useMemo(
    () =>
      trips.filter(
        item =>
          asset &&
          (sameReference(item.truck_asset_id, asset) || sameReference(item.trailer_asset_id, asset)),
      ),
    [trips, asset],
  )

  if (!asset) {
    return (
      <EmptyState
        title="الأصل غير موجود"
        description="السجل المطلوب غير موجود أو تم حذفه من قاعدة البيانات."
        action={
          <button className="secondary-button" onClick={onBack}>
            العودة للأصول
          </button>
        }
      />
    )
  }

  const lookups: ReferenceLookups = { assets, projects, workOrders, records: moduleData }
  const financial = detail.data.financial
  const cost30d = detail.data.cost30d
  const fuelTotal = assetFuel.reduce((total, item) => total + Number(item.qty || 0), 0)
  const fuelCost = assetFuel.reduce((total, item) => total + Number(item.total || 0), 0)
  const consumption = useFuelConsumption(assetFuel, asset.mt)

  const tabs = [
    {
      id: 'overview',
      label: 'بطاقة الأصل',
      content: (
        <OverviewTab
          formatMoney={formatMoney}
          asset={asset}
          lookups={lookups}
          financial={financial}
          loading={detail.isLoading}
          fuelTotal={fuelTotal}
          fuelCost={fuelCost}
          cost30d={cost30d}
        />
      ),
    },
    {
      id: 'assignments',
      label: `التخصيصات${moduleData.assignments?.length ? ` (${moduleData.assignments.filter(row => sameReference(row.assetId ?? row.asset, asset)).length})` : ''}`,
      content: (
        <RecordTable
          title="التخصيصات"
          rows={(moduleData.assignments ?? []).filter(row =>
            sameReference(row.assetId ?? row.asset, asset),
          )}
          empty="لا توجد تخصيصات مسجلة لهذا الأصل."
          lookups={lookups}
        />
      ),
    },
    {
      id: 'operations',
      label: `التشغيل${assetOps.length ? ` (${assetOps.length})` : ''}`,
      content: (
        <section className="panel asset-detail-section">
          <SectionHeading
            icon={<Gauge size={18} />}
            title="سجل التشغيل"
            meta={`${assetOps.length} عملية`}
          />
          {assetOps.length ? (
            <DataTable
              rows={assetOps}
              columns={operationColumns(lookups)}
              rowKey={row => row.id}
              pageSize={12}
              searchPlaceholder="بحث في سجل التشغيل..."
            />
          ) : (
            <EmptyState
              title="لا توجد عمليات تشغيل"
              description="لم يتم تسجيل حركة أو قراءة عداد لهذا الأصل بعد."
            />
          )}
        </section>
      ),
    },
    {
      id: 'fuel',
      label: 'الوقود',
      content: (
        <FuelTab
          formatMoney={formatMoney}
          asset={asset}
          fuel={assetFuel}
          totalQty={fuelTotal}
          totalCost={fuelCost}
          consumption={consumption}
          lookups={lookups}
        />
      ),
    },
    {
      id: 'transport',
      label: `النقل${assetTrips.length ? ` (${assetTrips.length})` : ''}`,
      content: (
        <section className="panel asset-detail-section">
          <SectionHeading
            icon={<Truck size={18} />}
            title="عمليات النقل"
            meta={`${assetTrips.length} عملية`}
          />
          {assetTrips.length ? (
            <DataTable
              rows={assetTrips}
              columns={tripColumns(onRoute, formatMoney)}
              rowKey={row => row.id}
              pageSize={10}
              searchPlaceholder="بحث في عمليات النقل..."
            />
          ) : (
            <EmptyState
              title="لا توجد عمليات نقل"
              description="هذا الأصل غير مرتبط بعمليات نقل حتى الآن."
            />
          )}
        </section>
      ),
    },
    {
      id: 'maintenance',
      label: `الصيانة${assetOrders.length ? ` (${assetOrders.length})` : ''}`,
      content: (
        <section className="panel asset-detail-section">
          <SectionHeading
            icon={<Wrench size={18} />}
            title="أوامر الصيانة"
            meta={`${assetOrders.length} أمر`}
          />
          {assetOrders.length ? (
            <DataTable
              rows={assetOrders}
              columns={workOrderColumns(lookups)}
              rowKey={row => row.id}
              pageSize={12}
              searchPlaceholder="بحث في أوامر الصيانة..."
            />
          ) : (
            <EmptyState
              title="لا توجد أوامر صيانة"
              description="لم يتم تسجيل أمر صيانة مرتبط بهذا الأصل بعد."
            />
          )}
          <div className="asset-tab-footer">
            <button className="secondary-button" onClick={() => onRoute('maintenance')}>
              فتح وحدة الصيانة
            </button>
          </div>
        </section>
      ),
    },
    {
      id: 'tires',
      label: 'الإطارات',
      content: (
        <RecordTable
          title="الإطارات"
          rows={(moduleData.tires ?? []).filter(row =>
            sameReference(row.assetId ?? row.asset, asset),
          )}
          empty="لا توجد سجلات إطارات مرتبطة بهذا الأصل."
          lookups={lookups}
        />
      ),
    },
    {
      id: 'costs',
      label: 'التكاليف',
      content: (
        <CostsTab
          formatMoney={formatMoney}
          entries={detail.data.costs}
          summary={cost30d}
          loading={detail.isLoading}
        />
      ),
    },
    {
      id: 'documents',
      label: `المستندات${detail.data.documents.length ? ` (${detail.data.documents.length})` : ''}`,
      content: <DocumentsTab documents={detail.data.documents} loading={detail.isLoading} />,
    },
    {
      id: 'audit',
      label: 'سجل التدقيق',
      content: <AuditTab records={detail.data.audit} loading={detail.isLoading} />,
    },
  ] as const

  const needsAttention = asset.status === 'تحت الصيانة' || asset.status === 'متوقف مؤقتًا'
  const nextAction = asset.status === 'تحت الصيانة' ? 'فتح الصيانة' : 'فتح التشغيل'
  const nextRoute = asset.status === 'تحت الصيانة' ? 'maintenance' : 'operations'

  return (
    <div className="reference-page asset-reference-page">
      <PageHeader
        title={`بطاقة الأصل — ${asset.name}`}
        description={
          <span className="asset-page-subline">
            <span className="asset-page-chip">{asset.code}</span>
            <span>{asset.cat || 'أصل'}</span>
            {asset.plate && <span>لوحة: {asset.plate}</span>}
            <span>{asset.own}</span>
          </span>
        }
        meta={<StatusBadge>{asset.status}</StatusBadge>}
        action={
          <div className="reference-header-actions">
            <button className="secondary-button" onClick={onBack}>
              <ArrowRight size={15} />
              العودة للأصول
            </button>
            <button className="primary-button" onClick={() => onEdit(asset)}>
              <Pencil size={15} />
              تعديل بيانات الأصل
            </button>
          </div>
        }
      />

      {detail.failures.length > 0 && (
        <div className="global-error asset-detail-alert">
          <ShieldCheck size={17} />
          <span>تعذر تحميل بعض بيانات التفاصيل: {detail.failures.join(' | ')}</span>
        </div>
      )}

      <section className="asset-hero" aria-label="ملخص الأصل">
        <div className="asset-hero-main">
          <div className="asset-hero-mark" aria-hidden="true">
            <Truck size={26} />
          </div>
          <div className="asset-hero-copy">
            <div className="asset-hero-kicker">الأصل الحالي</div>
            <h2>{asset.name}</h2>
            <p>
              {asset.type || 'معدات وأصل تشغيلي'}
              {asset.model ? ` · ${asset.model}` : ''}
              {asset.mfr ? ` · ${asset.mfr}` : ''}
            </p>
            <div className="asset-hero-meta">
              <span>
                <Gauge size={14} />
                {fmt(asset.meter)} {asset.mt}
              </span>
              <span>
                <MapPin size={14} />
                <ReferenceValue field="proj" value={asset.proj} lookups={lookups} compact />
              </span>
              <span>
                <UserRound size={14} />
                {asset.drv || 'لا يوجد مشغل مسجل'}
              </span>
            </div>
          </div>
        </div>
        <div className="asset-hero-actions">
          <button className="secondary-button" onClick={() => onRoute('tracking')}>
            تتبع الأصل
          </button>
          <button className="secondary-button" onClick={() => onRoute('maintenance')}>
            الصيانة
          </button>
          <button className="primary-button" onClick={() => onEdit(asset)}>
            تعديل
          </button>
        </div>
      </section>

      <section className="asset-snapshot-grid" aria-label="ملخص تشغيلي">
        <SnapshotMetric label="حالة التشغيل" value={asset.status} tone={asset.status === 'تحت الصيانة' ? 'warning' : 'success'} />
        <SnapshotMetric label="قراءة العداد" value={`${fmt(asset.meter)} ${asset.mt}`} />
        <SnapshotMetric label="تكلفة آخر 30 يوم" value={cost30d ? formatMoney(cost30d.totalCost30d) : '—'} />
        <SnapshotMetric label="وقود مسجل" value={fuelTotal ? `${fmt(fuelTotal)} لتر` : '—'} />
      </section>

      <div className={`asset-next-action ${needsAttention ? 'needs-attention' : ''}`}>
        <div>
          <span className="asset-next-kicker">{needsAttention ? 'يحتاج متابعة' : 'الإجراء المقترح'}</span>
          <strong>
            {asset.status === 'تحت الصيانة'
              ? 'مراجعة حالة الصيانة قبل إعادة الأصل للتشغيل'
              : asset.status === 'متوقف مؤقتًا'
                ? 'مراجعة سبب التوقف والحالة التشغيلية'
                : 'الأصل جاهز للمتابعة والتشغيل حسب التخصيص الحالي'}
          </strong>
          <p>
            {asset.status === 'تحت الصيانة'
              ? 'افتح أوامر الصيانة وتحقق من إغلاق الأعمال المطلوبة قبل إعادة الأصل للخدمة.'
              : 'استخدم التبويبات بالأسفل للوصول للسجل التشغيلي والتكاليف والمستندات والتخصيصات.'}
          </p>
        </div>
        <div className="asset-next-actions">
          <button className="primary-button" onClick={() => onRoute(nextRoute)}>
            {nextAction}
          </button>
          <button className="secondary-button" onClick={() => onRoute('assets')}>
            قائمة الأصول
          </button>
        </div>
      </div>

      <WorkflowTimeline
        label={VEHICLE_WORKFLOW.label}
        stages={VEHICLE_WORKFLOW.stages}
        currentStageId={vehicleStageForStatus(asset.status)}
        currentStatus={asset.status}
        compact
      />

      <DetailTabs tabs={tabs} />
    </div>
  )
}

function OverviewTab({
  formatMoney,
  asset,
  lookups,
  financial,
  loading,
  fuelTotal,
  fuelCost,
  cost30d,
}: {
  formatMoney: (value: number | null | undefined) => string
  asset: Asset
  lookups: ReferenceLookups
  financial: AssetFinancialSummary | null
  loading: boolean
  fuelTotal: number
  fuelCost: number
  cost30d: {
    totalCost30d: number
    fuelCost30d: number
    maintenanceCost30d: number
    tireCost30d: number
  } | null
}) {
  return (
    <section className="panel reference-detail-panel">
      <SectionHeading title="بيانات الأصل" meta={asset.code} />
      <div className="reference-detail-box asset-detail-box">
        <div className="asset-summary-strip">
          {loading && !financial ? (
            <>
              <Skeleton width="100%" height="66px" />
              <Skeleton width="100%" height="66px" />
              <Skeleton width="100%" height="66px" />
            </>
          ) : (
            <>
              <FinancialMetric
                label="القيمة الدفترية الحالية"
                value={financial ? formatMoney(financial.netBookValue) : '—'}
                icon={<CircleDollarSign size={15} />}
              />
              <FinancialMetric
                label="الإهلاك المتراكم"
                value={financial ? formatMoney(financial.accumulatedDepreciation) : '—'}
                icon={<CircleDollarSign size={15} />}
              />
              <FinancialMetric
                label="تكلفة آخر 30 يوم"
                value={cost30d ? formatMoney(cost30d.totalCost30d) : '—'}
                icon={<CalendarDays size={15} />}
              />
            </>
          )}
        </div>

        <div className="asset-overview-columns">
          <AssetInfoGroup title="الهوية والمواصفات">
            <Detail label="الكود" value={asset.code} />
            <Detail label="اسم الأصل" value={asset.name} />
            <Detail label="الفئة" value={asset.cat} />
            <Detail label="النوع / الاستخدام" value={asset.type} />
            <Detail label="الشركة المصنعة" value={asset.mfr} />
            <Detail label="الطراز" value={asset.model} />
            <Detail label="سنة الصنع" value={asset.year} />
            <Detail label="رقم اللوحة" value={asset.plate} />
          </AssetInfoGroup>

          <AssetInfoGroup title="التشغيل والارتباط">
            <Detail label="حالة التشغيل" value={<StatusBadge>{asset.status}</StatusBadge>} />
            <Detail label="الحالة الفنية" value={<StatusBadge>{asset.cond}</StatusBadge>} />
            <Detail label="الملكية" value={asset.own} />
            <Detail
              label="المشروع الحالي"
              value={<ReferenceValue field="proj" value={asset.proj} lookups={lookups} compact />}
            />
            <Detail label="السائق / المشغل" value={asset.drv} />
            <Detail label="المسؤول / المستخدم" value={asset.cust} />
            <Detail label="نوع الوقود" value={asset.fuel} />
            <Detail label="قراءة العداد" value={`${fmt(asset.meter)} ${asset.mt}`} />
          </AssetInfoGroup>

          <AssetInfoGroup title="الامتثال والقيمة">
            <Detail label="تاريخ الشراء / الاستلام" value={formatDate(asset.buy)} />
            <Detail label="انتهاء الترخيص" value={<ExpiryValue value={asset.lic} />} />
            <Detail label="انتهاء التأمين" value={<ExpiryValue value={asset.ins} />} />
            <Detail label="عقد الإيجار" value={<ReferenceValue field="contract" value={asset.contract} lookups={lookups} compact />} />
            <Detail label="الاستهلاك المعياري" value={asset.std ? `${fmt(asset.std)} ${asset.mt === 'كم' ? 'لتر/100 كم' : 'لتر/ساعة'}` : undefined} />
            <Detail label="تكلفة الاقتناء" value={financial ? formatMoney(financial.acquisitionCost) : formatMoney(asset.capex)} />
            <Detail label="القيمة المتبقية" value={financial ? formatMoney(financial.residualValue) : formatMoney(asset.resid)} />
            <Detail label="العمر الإنتاجي" value={financial ? `${fmt(financial.usefulLifeYears)} سنة` : asset.life ? `${fmt(asset.life)} سنة` : undefined} />
          </AssetInfoGroup>
        </div>

        <div className="asset-overview-foot">
          <div>
            <span>الوقود المسجل</span>
            <strong>{fuelTotal ? `${fmt(fuelTotal)} لتر` : 'لا توجد سجلات'}</strong>
          </div>
          <div>
            <span>تكلفة الوقود المسجلة</span>
            <strong>{fuelCost ? formatMoney(fuelCost) : '—'}</strong>
          </div>
        </div>
      </div>
    </section>
  )
}

function FuelTab({
  formatMoney,
  asset,
  fuel,
  totalQty,
  totalCost,
  consumption,
  lookups,
}: {
  formatMoney: (value: number | null | undefined) => string
  asset: Asset
  fuel: FuelOperation[]
  totalQty: number
  totalCost: number
  consumption: number | null
  lookups: ReferenceLookups
}) {
  return (
    <section className="panel asset-detail-section">
      <SectionHeading
        icon={<Gauge size={18} />}
        title="الوقود والاستهلاك"
        meta={
          consumption
            ? `${fmt(consumption)} لتر/${asset.mt === 'كم' ? '100 كم' : 'ساعة'}`
            : 'المعدل غير متاح'
        }
      />
      <div className="ds-stat-grid asset-stat-grid">
        <FinancialMetric label="إجمالي الكمية" value={`${fmt(totalQty)} لتر`} icon={<Gauge size={16} />} />
        <FinancialMetric label="إجمالي التكلفة" value={formatMoney(totalCost)} icon={<CircleDollarSign size={16} />} />
        <FinancialMetric
          label="المعدل المحسوب"
          value={
            consumption
              ? `${fmt(consumption)} ${asset.mt === 'كم' ? 'لتر/100 كم' : 'لتر/ساعة'}`
              : 'لا توجد بيانات كافية'
          }
          icon={<Truck size={16} />}
        />
      </div>
      {fuel.length ? (
        <DataTable
          rows={fuel}
          columns={fuelColumns(lookups, formatMoney)}
          rowKey={row => row.id}
          pageSize={12}
          searchPlaceholder="بحث في عمليات الوقود..."
        />
      ) : (
        <EmptyState title="لا توجد عمليات وقود" description="لم يتم تسجيل تعبئة وقود مرتبطة بهذا الأصل بعد." />
      )}
    </section>
  )
}

function CostsTab({
  formatMoney,
  entries,
  summary,
  loading,
}: {
  formatMoney: (value: number | null | undefined) => string
  entries: AssetCostEntry[]
  summary: {
    fuelCost30d: number
    maintenanceCost30d: number
    tireCost30d: number
    totalCost30d: number
  } | null
  loading: boolean
}) {
  return (
    <section className="panel asset-detail-section">
      <SectionHeading icon={<CircleDollarSign size={18} />} title="التكاليف" meta="آخر 30 يوم" />
      {loading && !summary ? (
        <div className="ds-stat-grid asset-stat-grid">
          <Skeleton width="100%" height="82px" />
          <Skeleton width="100%" height="82px" />
          <Skeleton width="100%" height="82px" />
        </div>
      ) : (
        <div className="ds-stat-grid asset-stat-grid">
          <FinancialMetric label="وقود" value={formatMoney(summary?.fuelCost30d ?? 0)} icon={<Gauge size={16} />} />
          <FinancialMetric label="صيانة" value={formatMoney(summary?.maintenanceCost30d ?? 0)} icon={<Wrench size={16} />} />
          <FinancialMetric label="إطارات" value={formatMoney(summary?.tireCost30d ?? 0)} icon={<Truck size={16} />} />
          <FinancialMetric label="الإجمالي" value={formatMoney(summary?.totalCost30d ?? 0)} icon={<CircleDollarSign size={16} />} />
        </div>
      )}
      {entries.length ? (
        <DataTable
          rows={entries}
          columns={costColumns(formatMoney)}
          rowKey={row => row.id}
          pageSize={12}
          searchPlaceholder="بحث في قيود التكاليف..."
        />
      ) : (
        <EmptyState title="لا توجد قيود تكلفة" description="لم يتم تسجيل قيود تكلفة فعلية مرتبطة بهذا الأصل." />
      )}
    </section>
  )
}

function DocumentsTab({ documents, loading }: { documents: AssetDocument[]; loading: boolean }) {
  if (loading && !documents.length) {
    return (
      <section className="panel asset-detail-section">
        <Skeleton width="100%" height="130px" />
        <br />
        <Skeleton width="100%" height="130px" />
      </section>
    )
  }

  if (!documents.length) {
    return <EmptyState title="لا توجد مستندات" description="لم يتم تسجيل مستندات لهذا الأصل بعد." />
  }

  return (
    <section className="panel asset-detail-section">
      <SectionHeading
        icon={<FileText size={18} />}
        title="المستندات"
        meta={`${documents.length} مستند`}
      />
      <div className="ds-document-list">
        {documents.map(document => (
          <article className="ds-document-card" key={document.id}>
            <div className="ds-document-icon">
              <FileText size={20} />
            </div>
            <div className="ds-document-body">
              <div className="ds-document-top">
                <strong>{documentTypeLabel(document.documentType)}</strong>
                <StatusBadge>{documentStatus(document)}</StatusBadge>
              </div>
              <div className="ds-document-meta">
                <span>رقم المستند: {document.documentNumber || 'غير مسجل'}</span>
                <span>جهة الإصدار: {document.issuer || 'غير مسجلة'}</span>
                <span>تاريخ الانتهاء: {formatDate(document.expiryDate)}</span>
              </div>
              {document.fileName && <span className="ds-document-file">{document.fileName}</span>}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function AuditTab({ records, loading }: { records: AuditEntry[]; loading: boolean }) {
  if (loading && !records.length) {
    return (
      <section className="panel asset-detail-section">
        <Skeleton width="100%" height="180px" />
      </section>
    )
  }

  if (!records.length) {
    return <EmptyState title="لا توجد أحداث تدقيق" description="لم يتم تسجيل تغييرات لهذا الأصل بعد." />
  }

  return (
    <section className="panel asset-detail-section">
      <SectionHeading icon={<ShieldCheck size={18} />} title="سجل التدقيق" meta={`${records.length} حدث`} />
      <DataTable
        rows={records}
        columns={auditColumns}
        rowKey={row => row.id}
        pageSize={12}
        searchPlaceholder="بحث في سجل التدقيق..."
      />
    </section>
  )
}

function RecordTable({
  title,
  rows,
  empty,
  lookups,
}: {
  title: string
  rows: Record<string, unknown>[]
  empty: string
  lookups: ReferenceLookups
}) {
  if (!rows.length) return <EmptyState title={`لا توجد ${title}`} description={empty} />

  const keys = Object.keys(rows[0]).filter(key => key !== 'id').slice(0, 8)

  return (
    <section className="panel asset-detail-section">
      <SectionHeading title={title} meta={`${rows.length} سجل`} />
      <DataTable
        rows={rows}
        columns={keys.map(key => ({
          id: key,
          header: fieldLabel(key),
          sortValue: (row: Record<string, unknown>) => String(row[key] ?? ''),
          render: (row: Record<string, unknown>) => (
            <ReferenceValue field={key} value={row[key]} lookups={lookups} />
          ),
        }))}
        rowKey={row => String(row.id)}
        pageSize={12}
        searchPlaceholder={`بحث في ${title}...`}
      />
    </section>
  )
}

function AssetInfoGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="asset-info-group">
      <header>
        <strong>{title}</strong>
      </header>
      <div className="asset-info-grid">{children}</div>
    </section>
  )
}

function SnapshotMetric({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'success' | 'warning'
}) {
  return (
    <article className={`asset-snapshot-card ${tone ?? ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function ExpiryValue({ value }: { value?: string }) {
  if (!value) return <>—</>
  const days = Math.ceil((new Date(value).getTime() - Date.now()) / 86400000)
  return (
    <span className="asset-expiry-value">
      <strong>{formatDate(value)}</strong>
      <StatusBadge tone={days < 0 ? 'red' : days <= 30 ? 'amber' : 'emerald'}>
        {days < 0 ? 'منتهية' : days <= 30 ? `متبقي ${days} يوم` : 'سارية'}
      </StatusBadge>
    </span>
  )
}

function SectionHeading({
  icon,
  title,
  meta,
}: {
  icon?: ReactNode
  title: string
  meta?: ReactNode
}) {
  return (
    <div className="panel-heading">
      <div className="panel-heading-main">
        {icon}
        <h2>{title}</h2>
      </div>
      {meta && <span className="panel-heading-meta">{meta}</span>}
    </div>
  )
}

function FinancialMetric({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <article className="ds-financial-metric">
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </article>
  )
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value ?? '—'}</strong>
    </div>
  )
}

function useFuelConsumption(fuel: FuelOperation[], meterType: string) {
  const previous = [...fuel]
    .filter(item => Number.isFinite(Number(item.meter)))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  if (!previous.length) return null

  const first = Number(previous[0].meter)
  const last = Number(previous[previous.length - 1].meter)
  const quantity = fuel.reduce((sum, item) => sum + Number(item.qty || 0), 0)

  if (quantity <= 0 || last <= first) return null

  const distance = last - first
  return meterType === 'كم' ? (quantity / distance) * 100 : quantity / distance
}

function documentStatus(doc: AssetDocument) {
  if (doc.status === 'ملغاة' || doc.status === 'معلقة') return doc.status
  if (!doc.expiryDate) return doc.status
  const days = Math.ceil((new Date(doc.expiryDate).getTime() - Date.now()) / 86400000)
  if (days < 0) return 'منتهية'
  if (days <= 30) return `متبقي ${days} يوم`
  return 'سارية'
}

function documentTypeLabel(type: AssetDocument['documentType']) {
  return (
    {
      license: 'ترخيص',
      insurance: 'تأمين',
      registration: 'استمارة / تسجيل',
      inspection: 'فحص',
      contract: 'عقد',
      other: 'أخرى',
    } as Record<AssetDocument['documentType'], string>
  )[type]
}

function costLabel(category: AssetCostEntry['category']) {
  return (
    {
      fuel: 'وقود',
      maintenance: 'صيانة',
      tires: 'إطارات',
      purchase: 'شراء',
      depreciation: 'إهلاك',
      other: 'أخرى',
    } as Record<AssetCostEntry['category'], string>
  )[category]
}

function fieldLabel(key: string) {
  return (
    {
      date: 'التاريخ',
      type: 'النوع',
      hours: 'الساعات',
      meter: 'العداد',
      qty: 'الكمية',
      total: 'الإجمالي',
      status: 'الحالة',
      desc: 'الوصف',
      opened: 'تاريخ الفتح',
      prio: 'الأولوية',
      proj: 'المشروع',
      drv: 'السائق / المشغل',
      notes: 'ملاحظات',
      name: 'الاسم',
      code: 'الكود',
    } as Record<string, string>
  )[key] ?? key
}

function fmt(value: number | undefined) {
  return new Intl.NumberFormat(APP_LOCALE, { maximumFractionDigits: 2 }).format(Number(value) || 0)
}

function formatDate(value?: string) {
  return value
    ? new Intl.DateTimeFormat(APP_LOCALE, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(value))
    : '—'
}

function formatDateTime(value: string) {
  return value
    ? new Intl.DateTimeFormat(APP_LOCALE, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value))
    : '—'
}


function tripColumns(
  onRoute: (route: string) => void,
  formatMoney: (value: number | null | undefined) => string,
): DataTableColumn<Trip>[] {
  return [
    {
      id: 'number',
      header: 'رقم النقل',
      render: row => (
        <button
          className="font-semibold text-primary-700 hover:underline"
          onClick={() => onRoute(`trips/${row.id}`)}
        >
          {row.trip_number}
        </button>
      ),
    },
    {
      id: 'route',
      header: 'المسار',
      render: row => `${row.from_location || '—'} ← ${row.to_location || '—'}`,
    },
    {
      id: 'status',
      header: 'الحالة',
      render: row => <StatusBadge>{row.status}</StatusBadge>,
    },
    {
      id: 'charge',
      header: 'القيمة',
      render: row => formatMoney(Number(row.total_charge || 0)),
    },
    {
      id: 'date',
      header: 'التاريخ',
      render: row => String(row.scheduled_start ?? '').slice(0, 16) || '—',
    },
  ]
}

function operationColumns(lookups: ReferenceLookups) {
  return [
    {
      id: 'date',
      header: 'التاريخ',
      sortValue: (row: Operation) => row.date,
      render: (row: Operation) => formatDate(row.date),
    },
    {
      id: 'meter',
      header: 'العداد',
      sortValue: (row: Operation) => row.meter,
      render: (row: Operation) => fmt(row.meter),
    },
    {
      id: 'hours',
      header: 'الساعات',
      sortValue: (row: Operation) => row.hours,
      render: (row: Operation) => fmt(row.hours),
    },
    {
      id: 'driver',
      header: 'السائق / المشغل',
      sortValue: (row: Operation) => row.drv ?? '',
      render: (row: Operation) => <ReferenceValue field="drv" value={row.drv} lookups={lookups} />,
    },
    {
      id: 'status',
      header: 'الحالة',
      sortValue: (row: Operation) => row.status,
      render: (row: Operation) => <StatusBadge>{row.status}</StatusBadge>,
    },
  ]
}

function fuelColumns(
  _lookups: ReferenceLookups,
  formatMoney: (value: number | null | undefined) => string,
) {
  return [
    {
      id: 'date',
      header: 'التاريخ',
      sortValue: (row: FuelOperation) => row.date,
      render: (row: FuelOperation) => formatDate(row.date),
    },
    {
      id: 'type',
      header: 'العملية',
      sortValue: (row: FuelOperation) => row.type,
      render: (row: FuelOperation) => row.type,
    },
    {
      id: 'qty',
      header: 'الكمية',
      sortValue: (row: FuelOperation) => row.qty,
      render: (row: FuelOperation) => `${fmt(row.qty)} لتر`,
    },
    {
      id: 'price',
      header: 'السعر',
      sortValue: (row: FuelOperation) => row.price,
      render: (row: FuelOperation) => formatMoney(row.price),
    },
    {
      id: 'total',
      header: 'الإجمالي',
      sortValue: (row: FuelOperation) => row.total,
      render: (row: FuelOperation) => formatMoney(row.total),
    },
    {
      id: 'status',
      header: 'الحالة',
      sortValue: (row: FuelOperation) => row.status,
      render: (row: FuelOperation) => <StatusBadge>{row.status}</StatusBadge>,
    },
  ]
}

function workOrderColumns(_lookups: ReferenceLookups) {
  return [
    {
      id: 'opened',
      header: 'الفتح',
      sortValue: (row: WorkOrder) => row.opened,
      render: (row: WorkOrder) => formatDate(row.opened),
    },
    {
      id: 'type',
      header: 'النوع',
      sortValue: (row: WorkOrder) => row.type,
      render: (row: WorkOrder) => row.type,
    },
    {
      id: 'desc',
      header: 'الوصف',
      sortValue: (row: WorkOrder) => row.desc,
      render: (row: WorkOrder) => row.desc,
    },
    {
      id: 'prio',
      header: 'الأولوية',
      sortValue: (row: WorkOrder) => row.prio,
      render: (row: WorkOrder) => row.prio,
    },
    {
      id: 'status',
      header: 'الحالة',
      sortValue: (row: WorkOrder) => row.status,
      render: (row: WorkOrder) => <StatusBadge>{row.status}</StatusBadge>,
    },
  ]
}

function costColumns(formatMoney: (value: number | null | undefined) => string) {
  return [
    {
      id: 'date',
      header: 'التاريخ',
      sortValue: (row: AssetCostEntry) => row.costDate,
      render: (row: AssetCostEntry) => formatDate(row.costDate),
    },
    {
      id: 'category',
      header: 'البند',
      sortValue: (row: AssetCostEntry) => row.category,
      render: (row: AssetCostEntry) => costLabel(row.category),
    },
    {
      id: 'amount',
      header: 'القيمة',
      sortValue: (row: AssetCostEntry) => row.amount,
      render: (row: AssetCostEntry) => formatMoney(row.amount),
    },
    {
      id: 'vendor',
      header: 'المورد',
      sortValue: (row: AssetCostEntry) => row.vendor ?? '',
      render: (row: AssetCostEntry) => row.vendor || '—',
    },
    {
      id: 'status',
      header: 'الحالة',
      sortValue: (row: AssetCostEntry) => row.status,
      render: (row: AssetCostEntry) => <StatusBadge>{row.status}</StatusBadge>,
    },
  ]
}

const auditColumns = [
  {
    id: 'occurredAt',
    header: 'التاريخ والوقت',
    sortValue: (row: AuditEntry) => row.occurredAt,
    render: (row: AuditEntry) => formatDateTime(row.occurredAt),
  },
  {
    id: 'action',
    header: 'العملية',
    sortValue: (row: AuditEntry) => row.action,
    render: (row: AuditEntry) => row.action,
  },
  {
    id: 'username',
    header: 'المستخدم',
    sortValue: (row: AuditEntry) => row.username,
    render: (row: AuditEntry) => row.username || '—',
  },
  {
    id: 'details',
    header: 'التفاصيل',
    sortValue: (row: AuditEntry) => row.details ?? '',
    render: (row: AuditEntry) => row.details || '—',
  },
]
