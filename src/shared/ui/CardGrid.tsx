import type { ReactNode } from 'react'

export interface CardGridProps<T> {
  /** السجلات التي سيتم تحويلها إلى كروت. */
  items: readonly T[]
  /** المفتاح الثابت لكل كارت. */
  getKey: (item: T, index: number) => string
  /** رسم محتوى الكارت. */
  renderCard: (item: T, index: number) => ReactNode
  /** عدد الأعمدة التقريبي على الشاشات الواسعة. */
  minColumnWidth?: number
  className?: string
}

/** شبكة كروت مرنة تدعم البيانات الحقيقية فقط ولا تنشئ أي سجلات افتراضية. */
export function CardGrid<T>({ items, getKey, renderCard, minColumnWidth = 280, className = '' }: CardGridProps<T>) {
  return (
    <div
      className={`ds-card-grid ${className}`.trim()}
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${Math.max(220, minColumnWidth)}px, 1fr))` }}
    >
      {items.map((item, index) => (
        <div key={getKey(item, index)}>{renderCard(item, index)}</div>
      ))}
    </div>
  )
}
