import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'

export interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
}

/** حالة فراغ واضحة بدل المساحات البيضاء أو رسائل الخطأ المضللة. */
export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="ds-empty-state">
      <div className="ds-empty-icon">{icon ?? <Inbox size={24} aria-hidden="true" />}</div>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {action && <div>{action}</div>}
    </div>
  )
}
