import type { ReactNode } from 'react'

export interface PageHeaderProps {
  title: string
  description?: ReactNode
  action?: ReactNode
  meta?: ReactNode
  className?: string
}

export function PageHeader({ title, description, action, meta, className = '' }: PageHeaderProps) {
  return (
    <header className={`ui-page-header ${className}`.trim()}>
      <div className="ui-page-header__copy">
        <div className="ui-page-header__title-row">
          <h1 className="ui-page-title">{title}</h1>
          {meta && <div className="ui-page-header__meta">{meta}</div>}
        </div>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="ui-page-header__action">{action}</div>}
    </header>
  )
}
