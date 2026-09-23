import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalPortalProps {
  children: ReactNode
  onBackdropMouseDown?: () => void
}

/**
 * Application-level modal portal.
 * Mounts outside page/layout stacking contexts so dialogs always cover the
 * complete viewport, including the sticky navbar.
 */
export function ModalPortal({ children, onBackdropMouseDown }: ModalPortalProps) {
  const previousOverflow = useRef('')

  useEffect(() => {
    previousOverflow.current = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow.current
    }
  }, [])

  const content = (
    <div className="modal-portal-root" onMouseDown={onBackdropMouseDown}>
      {children}
    </div>
  )

  return createPortal(content, document.body)
}
