import type { ReactNode } from 'react'
import { useDialogA11y } from './useDialogA11y'
import { AlertTriangle, X } from 'lucide-react'

export interface ConfirmModalProps {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  busy?: boolean
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}

/** نافذة تأكيد موحدة للعمليات الحساسة مثل الحذف والإلغاء. */
export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const dialogRef = useDialogA11y(open)
  if (!open) return null
  return (
    <div className="ds-modal-backdrop" onMouseDown={onCancel}>
      <section ref={dialogRef} className="ds-confirm-modal ui-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title" aria-describedby="confirm-modal-description" onMouseDown={event => event.stopPropagation()}>
        <header>
          <div className="ds-confirm-icon"><AlertTriangle size={21} /></div>
          <div>
            <h2 id="confirm-modal-title">{title}</h2>
            <div id="confirm-modal-description" className="ds-confirm-description">{description}</div>
          </div>
          <button type="button" className="icon-button ui-modal__close" aria-label="إغلاق" onClick={onCancel}><X size={18} /></button>
        </header>
        <footer>
          <button type="button" className="secondary-button" disabled={busy} onClick={onCancel}>{cancelLabel}</button>
          <button type="button" className={`primary-button ${danger ? 'danger' : ''}`} disabled={busy} onClick={() => void onConfirm()}>{busy ? 'جارٍ التنفيذ...' : confirmLabel}</button>
        </footer>
      </section>
    </div>
  )
}
