import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'

export type ToastTone = 'success' | 'error' | 'info'
export interface ToastOptions { message: string; tone?: ToastTone; durationMs?: number }
interface ToastItem extends Required<ToastOptions> { id: string }
interface ToastContextValue { show: (options: ToastOptions) => void; dismiss: (id: string) => void }

const ToastContext = createContext<ToastContextValue | null>(null)

/** مزود Toast مركزي لكل عمليات النظام، مع إزالة تلقائية بعد مدة قصيرة. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const dismiss = useCallback((id: string) => setItems(current => current.filter(item => item.id !== id)), [])
  const show = useCallback(({ message, tone = 'info', durationMs = 4000 }: ToastOptions) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setItems(current => [...current.slice(-3), { id, message, tone, durationMs }])
    window.setTimeout(() => dismiss(id), durationMs)
  }, [dismiss])
  const value = useMemo(() => ({ show, dismiss }), [dismiss, show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="ds-toast-region" aria-live="polite" aria-atomic="false">
        {items.map(item => (
          <div key={item.id} className={`ds-toast ${item.tone}`} role={item.tone === 'error' ? 'alert' : 'status'} aria-live={item.tone === 'error' ? 'assertive' : 'polite'}>
            {item.tone === 'success' ? <CheckCircle2 size={18} /> : item.tone === 'error' ? <XCircle size={18} /> : <Info size={18} />}
            <span>{item.message}</span>
            <button type="button" aria-label="إغلاق" onClick={() => dismiss(item.id)}><X size={15} /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast يجب استخدامه داخل ToastProvider.')
  return context
}
