import { useEffect, useRef, type ReactNode } from 'react'
import { useDialogA11y } from './useDialogA11y'
import { AlertTriangle, X } from 'lucide-react'

type FormModalProps = {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  actions?: ReactNode
  wide?: boolean
  busy?: boolean
  dirty?: boolean
  protectUnsaved?: boolean
}

export function FormModal({ title, subtitle, onClose, children, actions, wide = true, busy = false, dirty = false, protectUnsaved = true }: FormModalProps) {
  const close = useRef(onClose)
  const dialogRef = useDialogA11y(true)
  close.current = onClose

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || busy) return
      event.preventDefault()
      if (!dirty || !protectUnsaved || window.confirm('لديك تغييرات غير محفوظة. هل تريد إغلاق النموذج؟')) close.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [busy, dirty, protectUnsaved])

  function requestClose() {
    if (busy) return
    if (!dirty || !protectUnsaved || window.confirm('لديك تغييرات غير محفوظة. هل تريد إغلاق النموذج؟')) onClose()
  }

  return (
    <div className="modal-backdrop" onMouseDown={requestClose}>
      <section ref={dialogRef} className={`modal-card ui-modal ${wide ? 'wide' : ''} form-modal-premium`} role="dialog" aria-modal="true" aria-labelledby="form-modal-title" aria-describedby={subtitle ? 'form-modal-subtitle' : undefined} onMouseDown={e => e.stopPropagation()}>
        <div className="modal-head ui-modal__head">
          <div className="ui-modal__title-block">
            {dirty && protectUnsaved && <span className="ui-modal__dirty-indicator"><AlertTriangle size={13} /> تغييرات غير محفوظة</span>}
            <h2 id="form-modal-title">{title}</h2>
            {subtitle && <p id="form-modal-subtitle">{subtitle}</p>}
          </div>
          <button type="button" className="icon-button ui-modal__close" disabled={busy} onClick={requestClose} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>
        <div className="form-modal-content ui-modal__content">{children}</div>
        {actions ? <div className="modal-actions ui-modal__actions">{actions}</div> : null}
      </section>
    </div>
  )
}
