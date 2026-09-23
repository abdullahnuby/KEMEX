import { AlertCircle, ArrowLeft, Check } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { WorkflowStage } from '../workflows/workflowDefinitions'

export type WorkflowTimelineProps = {
  stages: readonly WorkflowStage[]
  currentStageId: string
  label: string
  currentStatus: string
  cancelled?: boolean
  nextActions?: Array<{ label: string; onClick: () => void; tone?: 'primary' | 'secondary' | 'danger' }>
  busy?: boolean
  compact?: boolean
}

export function WorkflowTimeline({
  stages,
  currentStageId,
  label,
  currentStatus,
  cancelled = false,
  nextActions = [],
  busy = false,
  compact = false,
}: WorkflowTimelineProps) {
  const currentIndex = Math.max(0, stages.findIndex(stage => stage.id === currentStageId))

  return (
    <section className={`workflow-timeline ${compact ? 'workflow-timeline-compact' : ''}`} aria-label={label}>
      <div className="workflow-timeline-head">
        <div>
          <span className="workflow-eyebrow">دورة التشغيل</span>
          <h2>{label}</h2>
          <p>الحالة الحالية: <strong>{currentStatus}</strong></p>
        </div>
        {nextActions.length > 0 && !cancelled ? (
          <div className="workflow-next-actions">
            {nextActions.map(action => (
              <button key={action.label} type="button" className={`workflow-next-action ${action.tone === 'danger' ? 'is-danger' : action.tone === 'secondary' ? 'is-secondary' : ''}`} onClick={action.onClick} disabled={busy}>
                <ArrowLeft size={15} aria-hidden="true" />
                {busy ? 'جارٍ التنفيذ…' : action.label}
              </button>
            ))}
          </div>
        ) : null}
        {cancelled ? (
          <div className="workflow-terminal workflow-terminal-danger"><AlertCircle size={16} /> العملية متوقفة</div>
        ) : null}
      </div>

      <div className="workflow-track" role="list" style={{ '--workflow-stage-count': stages.length } as CSSProperties}>
        {stages.map((stage, index) => {
          const done = !cancelled && index < currentIndex
          const active = !cancelled && index === currentIndex
          return (
            <div className={`workflow-stage ${done ? 'is-done' : ''} ${active ? 'is-active' : ''} ${cancelled ? 'is-muted' : ''}`} key={stage.id} role="listitem">
              <div className="workflow-node" aria-hidden="true">{done ? <Check size={14} strokeWidth={2.7} /> : index + 1}</div>
              <div className="workflow-stage-copy">
                <strong>{stage.label}</strong>
                {!compact ? <span>{stage.description}</span> : null}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
