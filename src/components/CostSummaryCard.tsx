import type { ReactNode } from 'react'
import { CircleDollarSign, Clock, Gauge, Layers, TrendingUp, Truck, Wallet, ChevronDown } from 'lucide-react'
import type { BreakdownCostSummary } from '../types/breakdown'
import { useCurrency } from '../features/settings'
import { StatusBadge } from './ui'

interface CostSummaryCardProps {
  summary: BreakdownCostSummary | null
  loading?: boolean
}

export function CostSummaryCard({ summary, loading = false }: CostSummaryCardProps) {
  const { formatMoney } = useCurrency()

  if (loading || !summary) {
    return (
      <section className="panel cost-summary-card">
        <div className="panel-head">
          <h2>ملخص التكلفة الكاملة (True Cost)</h2>
          <p>جارٍ تحميل بيانات التكلفة...</p>
        </div>
        <div className="flex flex-col gap-3 p-5">
          <div className="skeleton h-9 rounded-lg" />
          <div className="skeleton h-[70px] rounded-lg" />
          <div className="skeleton h-[70px] rounded-lg" />
          <div className="skeleton h-[70px] rounded-lg" />
        </div>
      </section>
    )
  }

  const directBreakdown = [
    { label: 'كشف وتشخيص', value: summary.diagnosis },
    { label: 'نقل للورشة (ذهاب)', value: summary.outbound_transport },
    { label: 'قطع غيار ومستلزمات', value: summary.spare_parts },
    { label: 'مصنعيات وعمالة', value: summary.labor },
    { label: 'ورشة خارجية', value: summary.external_workshop },
    { label: 'نقل للموقع (عودة)', value: summary.return_transport },
    { label: 'بدلات ومصاريف', value: summary.per_diem },
    { label: 'مصاريف مباشرة أخرى', value: summary.other_direct },
  ].filter(item => item.value > 0)

  const indirectBreakdown = [
    { label: 'بدل توقف السائق/المشغل', value: summary.driver_downtime },
    { label: 'خسارة الإيراد اليومي', value: summary.lost_revenue },
    { label: 'غرامات وبدلات إضافية', value: summary.penalty },
  ].filter(item => item.value > 0)

  const isCriticalDowntime = summary.downtime_hours >= 72

  return (
    <section className="panel cost-summary-card">
      <div className="panel-head flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2">
            <Wallet size={18} className="text-primary-700" />
            <span>ملخص التكلفة الكاملة</span>
          </h2>
          <p>التكلفة الحقيقية (المباشرة وغير المباشرة) للعطل</p>
        </div>
        <StatusBadge tone="blue">True Cost</StatusBadge>
      </div>

      <div className="flex flex-col gap-3.5 p-4">
        {/* Grand Total Hero Box */}
<div className="flex items-center justify-between gap-4 rounded-xl bg-primary-700 px-4 py-4 text-white shadow-sm sm:px-5">
          <div>
            <span className="block text-sm font-semibold text-white/90">
              التكلفة الحقيقية الكاملة
            </span>
            <strong className="text-xl font-bold leading-tight tracking-tight sm:text-2xl">
              {formatMoney(summary.total_full)}
            </strong>
          </div>
<div className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[10px] bg-white/15">
            <Wallet size={22} />
          </div>
        </div>

        {/* Direct Costs Card */}
        <CostCategoryBlock
          title="التكاليف المباشرة"
          total={summary.total_direct}
          items={directBreakdown}
          icon={<CircleDollarSign size={18} className="text-primary-700" />}
          tone="teal"
          formatMoney={formatMoney}
        />

        {/* Indirect Costs Card */}
        <CostCategoryBlock
          title="التكاليف غير المباشرة (التوقف والفرص)"
          total={summary.total_indirect}
          items={indirectBreakdown}
          icon={<TrendingUp size={18} className="text-red-600" />}
          tone="rose"
          formatMoney={formatMoney}
        />

        {/* Downtime Statistics Bar */}
<div className="mt-1 grid grid-cols-1 gap-2.5 border-t border-dashed border-slate-200 pt-3.5 sm:grid-cols-2">
          <div className={`rounded-[10px] border px-3 py-2.5 ${isCriticalDowntime ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
            <div className="mb-1 flex items-center gap-1.5">
              <Clock size={14} className={isCriticalDowntime ? 'text-red-600' : 'text-slate-500'} />
              <small className={`text-sm font-semibold ${isCriticalDowntime ? 'text-red-800' : 'text-slate-500'}`}>
                ساعات التوقف
              </small>
            </div>
            <strong className={`text-base font-bold ${isCriticalDowntime ? 'text-red-700' : 'text-slate-900'}`}>
              {summary.downtime_hours.toFixed(1)} س
              {isCriticalDowntime && <span className="ms-1 text-xs font-semibold text-red-600">(حرجة)</span>}
            </strong>
          </div>

<div className="rounded-[10px] border border-slate-200 bg-slate-50 px-3 py-2.5">
            <div className="mb-1 flex items-center gap-1.5">
              <Truck size={14} className="text-slate-500" />
              <small className="text-sm font-semibold text-slate-500">
                أيام التوقف
              </small>
            </div>
            <strong className="text-base font-bold text-slate-900">
              {summary.days_down.toFixed(1)} يوم
            </strong>
          </div>
        </div>
      </div>
    </section>
  )
}

function CostCategoryBlock({
  title,
  total,
  items,
  icon,
  tone,
  formatMoney,
}: {
  title: string
  total: number
  items: Array<{ label: string; value: number }>
  icon: ReactNode
  tone: 'teal' | 'rose'
  formatMoney: (amount: number | null | undefined) => string
}) {
  return (
<div className={`rounded-[10px] border px-3.5 py-3 ${tone === 'teal' ? 'border-primary-100 bg-primary-50' : 'border-red-100 bg-red-50'}`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon}
          <strong className={`text-sm font-semibold ${tone === 'teal' ? 'text-primary-700' : 'text-red-700'}`}>{title}</strong>
        </div>
        <strong className={`text-base font-bold ${tone === 'teal' ? 'text-primary-700' : 'text-red-700'}`}>{formatMoney(total)}</strong>
      </div>

      {items.length > 0 ? (
        <details className="mt-1.5">
          <summary
className="flex cursor-pointer select-none items-center gap-1 text-sm font-medium text-slate-500"
          >
            <ChevronDown size={13} />
            <span>عرض التفاصيل ({items.length} بنود)</span>
          </summary>
          <ul
className="mt-2 flex list-none flex-col gap-1.5 rounded-lg bg-white/75 px-3 py-2"
          >
            {items.map(item => (
              <li
                key={item.label}
className="flex items-center justify-between gap-3 border-b border-dashed border-slate-200 pb-1 text-sm last:border-b-0"
              >
                <span className="text-slate-600">{item.label}</span>
                <strong className="font-semibold text-slate-800">{formatMoney(item.value)}</strong>
              </li>
            ))}
          </ul>
        </details>
      ) : (
        <small className="text-sm font-medium text-slate-400">لا توجد بنود مسجلة بعد</small>
      )}
    </div>
  )
}
