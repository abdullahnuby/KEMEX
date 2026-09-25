import { useMemo, useState } from 'react'
import {
  BarChart3,
  CircleDollarSign,
  Clock,
  Download,
  FileSpreadsheet,
  Layers,
  RotateCcw,
  TrendingUp,
  Truck,
  Wallet,
} from 'lucide-react'
import type { TrueCostAssetRow } from '../types/breakdown'
import { useTrueCostReport } from '../hooks/useBreakdown'
import { Button, DataTable, FilterBar, MetricCard, PageHeader, StatusBadge, type DataTableColumn } from '../components/ui'
import { useCurrency } from '../features/settings'
import { PrintButton, PrintableDocument } from '../shared/printing'

export function TrueCostReportPage() {
  const { formatMoney } = useCurrency()

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [sortBy, setSortBy] = useState<'total_full' | 'downtime_hours' | 'breakdown_count'>('total_full')

  const { data: rows = [], isLoading, error } = useTrueCostReport({
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  })

  // Sorted rows
  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (sortBy === 'total_full') return b.total_full - a.total_full
      if (sortBy === 'downtime_hours') return b.downtime_hours - a.downtime_hours
      return b.breakdown_count - a.breakdown_count
    })
  }, [rows, sortBy])

  // KPIs
  const totalDirect = useMemo(() => rows.reduce((s, r) => s + r.total_direct, 0), [rows])
  const totalIndirect = useMemo(() => rows.reduce((s, r) => s + r.total_indirect, 0), [rows])
  const totalGrand = useMemo(() => rows.reduce((s, r) => s + r.total_full, 0), [rows])
  const totalDowntimeHours = useMemo(() => rows.reduce((s, r) => s + r.downtime_hours, 0), [rows])

  // CSV Export with UTF-8 BOM
  function handleExportCsv() {
    const headers = [
      'كود الأصل',
      'اسم الأصل',
      'عدد الأعطال',
      'التكاليف المباشرة (ج.م)',
      'التكاليف غير المباشرة (ج.م)',
      'التكلفة الحقيقية الكاملة (ج.م)',
      'ساعات التوقف',
    ]

    const csvRows = sortedRows.map(r => [
      r.asset_code,
      r.asset_name,
      r.breakdown_count,
      r.total_direct.toFixed(2),
      r.total_indirect.toFixed(2),
      r.total_full.toFixed(2),
      r.downtime_hours.toFixed(1),
    ])

    const csvContent = [
      headers.map(h => `"${h}"`).join(','),
      ...csvRows.map(row => row.map(val => `"${String(val).replaceAll('"', '""')}"`).join(',')),
    ].join('\n')

    const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `KEMEX-TrueCost-Report-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 600)
  }

  const columns: DataTableColumn<TrueCostAssetRow>[] = [
    {
      id: 'asset',
      header: 'المعدة / الأصل',
      render: r => (
        <div>
          <strong className="text-sm font-semibold text-slate-900">{r.asset_name}</strong>
          <small className="mt-0.5 block text-xs font-medium text-slate-500">كود: {r.asset_code}</small>
        </div>
      ),
      searchable: true,
      sortValue: r => r.asset_name,
    },
    {
      id: 'breakdowns',
      header: 'عدد الأعطال',
      render: r => (
<StatusBadge tone="blue">{r.breakdown_count}</StatusBadge>
      ),
      sortValue: r => r.breakdown_count,
    },
    {
      id: 'direct',
      header: 'التكاليف المباشرة',
      render: r => (
        <span className="font-semibold text-primary-700">
          {formatMoney(r.total_direct)}
        </span>
      ),
      sortValue: r => r.total_direct,
    },
    {
      id: 'indirect',
      header: 'التكاليف غير المباشرة',
      render: r => (
        <span className="font-semibold text-red-600">
          {formatMoney(r.total_indirect)}
        </span>
      ),
      sortValue: r => r.total_indirect,
    },
    {
      id: 'full',
      header: 'الإجمالي الكامل (True Cost)',
      render: r => (
        <strong className="text-base font-bold text-primary-700">
          {formatMoney(r.total_full)}
        </strong>
      ),
      sortValue: r => r.total_full,
    },
    {
      id: 'downtime',
      header: 'ساعات التوقف',
      render: r => (
        <strong className={`font-bold ${r.downtime_hours >= 72 ? 'text-red-700' : 'text-slate-700'}`}>
          {r.downtime_hours.toFixed(1)} س
        </strong>
      ),
      sortValue: r => r.downtime_hours,
    },
  ]

  return (
    <div className="report-page">
      <PageHeader
        title="تقرير التكلفة الحقيقية للأعطال (True Cost Report)"
        description="التحليل المالي والتشغيلي الشامل لكل أصل: يجمع التكاليف المباشرة (النقل، الفحص، قطع الغيار) مع التكاليف غير المباشرة (خسارة الإيرادات وبدلات السائقين)."
        meta={
          <div className="eyebrow">
            <BarChart3 size={14} /> تقرير التكلفة الحقيقية للأصول
          </div>
        }
        action={
          <div className="flex flex-wrap gap-2">
            <PrintButton
              printId="true-cost-report"
              documentTitle="تقرير التكلفة الحقيقية للأصول"
              label="طباعة التقرير"
              disabled={!sortedRows.length}
            />
            <Button variant="primary" icon={<Download size={16} />} onClick={handleExportCsv} disabled={!sortedRows.length}>تصدير CSV</Button>
          </div>
        }
      />

      {error && (
        <div className="global-error" role="alert">
          <span>{error instanceof Error ? error.message : 'تعذر تحميل بيانات التقرير.'}</span>
        </div>
      )}

      <FilterBar
        className="mb-6"
        filters={[
          { id: 'from', label: 'من تاريخ العطل', value: fromDate, options: fromDate ? [{ value: fromDate, label: fromDate }] : [], onChange: setFromDate },
          { id: 'to', label: 'إلى تاريخ العطل', value: toDate, options: toDate ? [{ value: toDate, label: toDate }] : [], onChange: setToDate },
          { id: 'sort', label: 'ترتيب التقرير', value: sortBy, options: [
            { value: 'total_full', label: 'الأعلى في إجمالي التكلفة' },
            { value: 'downtime_hours', label: 'الأعلى في ساعات التوقف' },
            { value: 'breakdown_count', label: 'الأكثر تكراراً في الأعطال' },
          ], onChange: value => setSortBy(value as typeof sortBy) },
        ]}
        actions={(fromDate || toDate) ? <Button variant="ghost" size="sm" icon={<RotateCcw size={13} />} onClick={() => { setFromDate(''); setToDate('') }}>إعادة ضبط الفترة</Button> : undefined}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
        <MetricCard label="إجمالي التكاليف المباشرة" value={formatMoney(totalDirect)} meta="فحص، نقل، قطع غيار، مصنعيات" icon={CircleDollarSign} tone="teal" />
        <MetricCard label="إجمالي التكاليف غير المباشرة" value={formatMoney(totalIndirect)} meta="خسارة إيراد وبدلات توقف السائقين" icon={TrendingUp} tone="rose" />
        <MetricCard label="التكلفة الحقيقية الكاملة" value={formatMoney(totalGrand)} meta="المباشرة + غير المباشرة" icon={Wallet} tone="teal" />
        <MetricCard label="إجمالي ساعات التوقف" value={`${totalDowntimeHours.toFixed(1)} س`} meta={`ما يعادل ${(totalDowntimeHours / 24).toFixed(1)} يوم تشغيلي`} icon={Clock} tone="blue" />
      </div>

      {/* Aggregate Report Table */}
      <section className="panel">
        <div className="panel-head flex items-center justify-between gap-3">
          <div>
            <h2>بيانات التكلفة الحقيقية مجمعة حسب الأصل</h2>
            <p>
              عدد الأصول المتأثرة: {sortedRows.length} أصل | إجمالي الأعطال:{' '}
              {sortedRows.reduce((s, r) => s + r.breakdown_count, 0)} عطل
            </p>
          </div>
          <StatusBadge tone="blue">{sortedRows.length} سجلات</StatusBadge>
        </div>

        {isLoading ? (
          <div className="loading-page min-h-[260px]">
            <div className="spinner" />
            <strong>جارٍ تجميع واحتساب التكاليف الحقيقية...</strong>
          </div>
        ) : (
          <DataTable
            rows={sortedRows}
            columns={columns}
            rowKey={r => r.asset_id}
            searchPlaceholder="بحث باسم أو كود الأصل..."
            pageSize={10}
            emptyState={
              <div className="empty">
                <FileSpreadsheet size={28} className="text-slate-400" />
                <span>لا توجد بيانات أعطال مسجلة خلال الفترة المحددة.</span>
              </div>
            }
          />
        )}
      </section>

      <PrintableDocument
        printId="true-cost-report"
        documentTitle="تقرير التكلفة الحقيقية للأصول"
        documentNumber="TRUE-COST"
        documentDate={new Date().toLocaleDateString('ar-EG')}
        companyName="KEMEX"
        reference={`عدد الأصول: ${sortedRows.length}`}
        meta={[
          { label: 'الفترة من', value: fromDate || 'بداية البيانات' },
          { label: 'الفترة إلى', value: toDate || 'حتى تاريخ الإصدار' },
          { label: 'إجمالي التكاليف المباشرة', value: formatMoney(totalDirect) },
          { label: 'إجمالي التكاليف غير المباشرة', value: formatMoney(totalIndirect) },
          { label: 'التكلفة الحقيقية الكاملة', value: formatMoney(totalGrand) },
          { label: 'إجمالي ساعات التوقف', value: `${totalDowntimeHours.toFixed(1)} س` },
        ]}
        signatures={[
          { label: 'إعداد التقرير' },
          { label: 'مراجعة' },
          { label: 'اعتماد' },
        ]}
        footerNote="هذا المستند صادر من نظام KEMEX ويعرض التكلفة الحقيقية المسجلة للأصول خلال الفترة المحددة."
        orientation="landscape"
      >
        <h2 className="print-section-title">بيانات التكلفة الحقيقية مجمعة حسب الأصل</h2>
        <table>
          <thead>
            <tr>
              <th>المعدة / الأصل</th>
              <th>عدد الأعطال</th>
              <th>التكاليف المباشرة</th>
              <th>التكاليف غير المباشرة</th>
              <th>الإجمالي الكامل</th>
              <th>ساعات التوقف</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map(row => (
              <tr key={`print-${row.asset_id}`}>
                <td>
                  <strong>{row.asset_name}</strong>
                  <div style={{ color: '#71858d', fontSize: '8pt', marginTop: 2 }}>كود: {row.asset_code}</div>
                </td>
                <td>{row.breakdown_count}</td>
                <td>{formatMoney(row.total_direct)}</td>
                <td>{formatMoney(row.total_indirect)}</td>
                <td><strong>{formatMoney(row.total_full)}</strong></td>
                <td>{row.downtime_hours.toFixed(1)} س</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PrintableDocument>
    </div>
  )
}
