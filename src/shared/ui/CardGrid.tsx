import type { ReactElement, ReactNode } from 'react'

export interface ItemCardGridProps<T> {
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

export interface SlotCardGridProps {
  /** وضع الشبكة الحرة: تمرير كروت جاهزة كأبناء مباشرين. */
  children: ReactNode
  cols?: 1 | 2 | 3 | 4 | 5 | 6
  className?: string
}

export function CardGrid<T>(props: ItemCardGridProps<T>): ReactElement
export function CardGrid(props: SlotCardGridProps): ReactElement
export function CardGrid<T>(props: ItemCardGridProps<T> | SlotCardGridProps): ReactElement {
  if ('items' in props) {
    const { items, getKey, renderCard, minColumnWidth = 280, className = '' } = props
    return (
      <div
        className={`ui-card-grid ds-card-grid ${className}`.trim()}
        style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${Math.max(220, minColumnWidth)}px, 1fr))` }}
      >
        {items.map((item, index) => (
          <div key={getKey(item, index)}>{renderCard(item, index)}</div>
        ))}
      </div>
    )
  }

  const colsClass: Record<NonNullable<SlotCardGridProps['cols']>, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-5',
    6: 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-6',
  }
  const { children, cols = 4, className = '' } = props
  return <div className={`ui-card-grid grid gap-4 ${colsClass[cols]} ${className}`.trim()}>{children}</div>
}
