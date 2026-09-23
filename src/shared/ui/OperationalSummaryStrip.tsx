import type { ReactNode } from 'react'

export type OperationalSummaryItem = {
  id: string
  label: string
  value: ReactNode
  tone?: 'default' | 'success' | 'alert'
  meta?: string
}

export function OperationalSummaryStrip({ items }: { items: readonly OperationalSummaryItem[] }) {
  return (
    <section className="module-status-strip" aria-label="ملخص التشغيل">
      {items.map(item => (
        <div key={item.id} className={`module-status-strip__item ${item.tone === 'success' ? 'is-success' : item.tone === 'alert' ? 'is-alert' : ''}`.trim()}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.meta && <small>{item.meta}</small>}
        </div>
      ))}
    </section>
  )
}
