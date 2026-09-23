import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'

export interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
  className?: string
  /** 'ds' (افتراضي): مظهر نظام التصميم ds-empty-state. 'ui': المظهر القديم ui-empty-state للشاشات الموروثة. */
  variant?: 'ds' | 'ui'
}

/** حالة فراغ واضحة بدل المساحات البيضاء أو رسائل الخطأ المضللة. */
export function EmptyState({ title, description, action, icon, className = '', variant = 'ds' }: EmptyStateProps) {
  if (variant === 'ui') {
    return (
      <div className={`ui-empty-state ${className}`.trim()}>
        <div className="ui-empty-state__icon">{icon ?? <Inbox size={21} aria-hidden="true" />}</div>
        <h3>{title}</h3>
        {description && <p>{description}</p>}
        {action && <div className="ui-empty-state__action">{action}</div>}
      </div>
    )
  }
  return (
    <div className={`ds-empty-state ${className}`.trim()}>
      <div className="ds-empty-icon">{icon ?? <Inbox size={24} aria-hidden="true" />}</div>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {action && <div>{action}</div>}
    </div>
  )
}
