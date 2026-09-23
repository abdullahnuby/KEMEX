import type { ReactNode } from 'react'
import { ArrowLeft, CircleCheck, Clock3 } from 'lucide-react'

export function WorkflowActionCard({
  eyebrow = 'الإجراء التالي',
  title,
  description,
  status,
  action,
  secondary,
}: {
  eyebrow?: string
  title: string
  description: string
  status?: ReactNode
  action?: ReactNode
  secondary?: ReactNode
}) {
  return (
    <section className="workflow-action-card" aria-label={title}>
      <div className="workflow-action-icon" aria-hidden="true"><Clock3 size={19} /></div>
      <div className="workflow-action-content">
        <span className="workflow-eyebrow">{eyebrow}</span>
        <div className="workflow-action-title-row"><h3>{title}</h3>{status}</div>
        <p>{description}</p>
        <div className="workflow-action-buttons">
          {action}
          {secondary}
        </div>
      </div>
      <CircleCheck size={18} className="workflow-action-check" aria-hidden="true" />
      <ArrowLeft size={15} className="workflow-action-arrow" aria-hidden="true" />
    </section>
  )
}
