import type { LucideIcon } from 'lucide-react'

const toneClasses: Record<string, string> = {
  teal: 'ui-metric-card--teal',
  green: 'ui-metric-card--green',
  purple: 'ui-metric-card--blue',
  amber: 'ui-metric-card--amber',
  rose: 'ui-metric-card--rose',
  blue: 'ui-metric-card--blue',
}

export function MetricCard({ label, value, meta, icon: Icon, tone = 'teal' }: { label: string; value: string | number; meta?: string; icon: LucideIcon; tone?: string }) {
  return (
    <article className={`ui-metric-card ${toneClasses[tone] ?? toneClasses.teal}`}>
      <div className="ui-metric-card__copy">
        <span>{label}</span>
        <strong>{value}</strong>
        {meta && <small>{meta}</small>}
      </div>
      <span className="ui-metric-card__icon"><Icon size={19} /></span>
    </article>
  )
}
