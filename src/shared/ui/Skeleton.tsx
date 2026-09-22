export interface SkeletonProps {
  width?: string
  height?: string
  radius?: string
  className?: string
}

/** عنصر Skeleton لإظهار بنية المحتوى أثناء التحميل دون بيانات وهمية. */
export function Skeleton({ width = '100%', height = '16px', radius = '8px', className = '' }: SkeletonProps) {
  return <span className={`ds-skeleton ${className}`.trim()} style={{ width, height, borderRadius: radius }} aria-hidden="true" />
}

export function SkeletonCard({ rows = 4 }: { rows?: number }) {
  return (
    <div className="ds-skeleton-card" aria-hidden="true">
      <Skeleton width="42%" height="22px" />
      <Skeleton width="70%" height="13px" />
      {Array.from({ length: rows }, (_, index) => <Skeleton key={index} width={`${78 - index * 8}%`} height="12px" />)}
    </div>
  )
}
