import React from 'react'
import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description?: string
  action?: React.ReactNode
  icon?: React.ReactNode
  className?: string
}

export function EmptyState({ title, description, action, icon, className = '' }: EmptyStateProps) {
  return (
    <div className={`ui-empty-state ${className}`.trim()}>
      <div className="ui-empty-state__icon">{icon ?? <Inbox size={21} aria-hidden="true" />}</div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div className="ui-empty-state__action">{action}</div>}
    </div>
  )
}
