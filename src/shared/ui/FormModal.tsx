import type { ReactNode } from 'react'
import { X } from 'lucide-react'

type FormModalProps = {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  actions?: ReactNode
  wide?: boolean
  busy?: boolean
}

export function FormModal({ title, subtitle, onClose, children, actions, wide = true, busy = false }: FormModalProps) {
  return (
    <div className="modal-backdrop" onMouseDown={() => !busy && onClose()}>
      <section className={`modal-card ui-modal ${wide ? 'wide' : ''} form-modal-premium`} role="dialog" aria-modal="true" onMouseDown={e => e.stopPropagation()}>
        <div className="modal-head ui-modal__head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="icon-button ui-modal__close" disabled={busy} onClick={onClose} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>
        <div className="form-modal-content ui-modal__content">{children}</div>
        {actions ? <div className="modal-actions ui-modal__actions">{actions}</div> : null}
      </section>
    </div>
  )
}
