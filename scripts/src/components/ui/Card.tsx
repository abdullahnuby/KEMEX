import type { ReactNode } from 'react'

export interface CardProps {
  title?: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  noPadding?: boolean
  accent?: 'teal' | 'amber' | 'red' | 'blue'
  span2?: boolean
}

export function Card({ title, description, action, children, className = '', noPadding = false, accent, span2 = false }: CardProps) {
  return (
    <section className={`ui-card ${span2 ? 'ui-card--span2' : ''} ${accent ? `ui-card--accent-${accent}` : ''} ${className}`.trim()}>
      {(title || description || action) && (
        <div className="ui-card__header">
          <div className="ui-card__header-copy">
            {title && <h2>{title}</h2>}
            {description && <p>{description}</p>}
          </div>
          {action && <div className="ui-card__header-action">{action}</div>}
        </div>
      )}
      <div className={noPadding ? 'ui-card__body ui-card__body--flush' : 'ui-card__body'}>{children}</div>
    </section>
  )
}

export interface StatCardProps {
  label: string
  value: string | number
  icon?: ReactNode
  trend?: { value: string; positive: boolean }
  accent?: CardProps['accent']
  className?: string
}

export function StatCard({ label, value, icon, trend, accent = 'teal', className = '' }: StatCardProps) {
  return (
    <Card accent={accent} className={className}>
      <div className="ui-stat-card">
        <div className="ui-stat-card__copy">
          <p>{label}</p>
          <strong>{value}</strong>
          {trend && <span className={trend.positive ? 'ui-stat-card__trend ui-stat-card__trend--up' : 'ui-stat-card__trend ui-stat-card__trend--down'}>{trend.value}</span>}
        </div>
        {icon && <span className="ui-stat-card__icon">{icon}</span>}
      </div>
    </Card>
  )
}
