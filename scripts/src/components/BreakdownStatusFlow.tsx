import { Check, ArrowLeft, AlertCircle } from 'lucide-react'
import {
  type BreakdownStatus,
  BREAKDOWN_STATUS_LABELS,
  STATUS_TRANSITIONS,
} from '../types/breakdown'

const FLOW_ORDER: BreakdownStatus[] = [
  'reported',
  'inspecting',
  'awaiting_transport',
  'in_transit_to_workshop',
  'under_repair',
  'awaiting_return',
  'in_transit_to_site',
  'delivered',
  'closed',
]

interface BreakdownStatusFlowProps {
  currentStatus: BreakdownStatus
  onTransition?: (nextStatus: BreakdownStatus) => void
  busy?: boolean
}

export function BreakdownStatusFlow({
  currentStatus,
  onTransition,
  busy = false,
}: BreakdownStatusFlowProps) {
  const currentIndex = FLOW_ORDER.indexOf(currentStatus)
  const allowedNext = STATUS_TRANSITIONS[currentStatus] ?? []

  return (
    <section className="panel mb-[18px] px-5 py-4">
<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <strong className="text-sm font-bold text-slate-900">مسار دورة حياة العطل</strong>
          <span className="mt-0.5 block text-sm font-medium text-slate-500">
            الحالة الحالية: <strong className="text-primary-700">{BREAKDOWN_STATUS_LABELS[currentStatus]}</strong>
          </span>
        </div>

        {/* Transition action buttons */}
        {onTransition && allowedNext.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-500">الانتقال للحالة التالية:</span>
            {allowedNext.map(next => {
              const isClosed = next === 'closed'
              return (
                <button
                  key={next}
                  type="button"
                  className={`workflow-button ${isClosed ? 'secondary' : 'primary'} min-h-8`}
                  onClick={() => onTransition(next)}
                  disabled={busy}
                >
                  <ArrowLeft size={13} />
                  <span>{BREAKDOWN_STATUS_LABELS[next]}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Stepper track */}
<div className="relative flex items-start justify-between gap-2 overflow-x-auto pb-2">
        {FLOW_ORDER.map((status, idx) => {
          const isDone = currentIndex > idx
          const isCurrent = currentIndex === idx
          const label = BREAKDOWN_STATUS_LABELS[status]

          return (
<div key={status} className="relative flex min-w-[85px] flex-1 flex-col items-center text-center">
              {/* Node circle */}
<div className={`z-[2] grid h-7 w-7 place-items-center rounded-full border-2 text-sm font-bold transition-all ${isDone ? 'border-primary-600 bg-primary-600 text-white' : isCurrent ? 'border-primary-700 bg-primary-700 text-white ring-4 ring-primary-100' : 'border-slate-300 bg-slate-200 text-slate-500'}`}>
                {isDone ? <Check size={14} strokeWidth={2.6} /> : idx + 1}
              </div>

              {/* Label */}
<span className={`mt-2 text-sm leading-5 ${isCurrent ? 'font-bold text-primary-700' : isDone ? 'font-semibold text-slate-800' : 'font-medium text-slate-400'}`}>
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
