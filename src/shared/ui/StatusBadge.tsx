import type { ReactNode } from 'react'
import { resolveStatusTone, type BadgeTone } from './statusMap'

export type { BadgeTone }

export interface StatusBadgeProps { children: ReactNode; tone?: BadgeTone; className?: string; dot?: boolean }

export function StatusBadge({ children, tone, className = '', dot = false }: StatusBadgeProps) {
  const resolvedTone: BadgeTone = tone ?? resolveStatusTone(children)
  return (
    <span className={`ui-status-badge ui-status-badge--${resolvedTone} ${className}`.trim()}>
      {dot && <span className="ui-status-badge__dot" aria-hidden="true" />}
      <span>{children}</span>
    </span>
  )
}
