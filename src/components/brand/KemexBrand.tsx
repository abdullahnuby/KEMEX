import type { HTMLAttributes } from 'react'

type KemexBrandProps = HTMLAttributes<HTMLDivElement> & {
  variant?: 'shell' | 'auth'
  compact?: boolean
}

export function KemexBrand({ variant = 'shell', compact = false, className = '', ...props }: KemexBrandProps) {
  const classes = ['kemex-brand-lockup', `kemex-brand-lockup--${variant}`, compact ? 'is-compact' : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} {...props}>
      <img className="kemex-brand-symbol" src="/kemex-mark.png" alt="" aria-hidden="true" />
      <span className="kemex-brand-copy">
        <strong>KEMEX</strong>
        {!compact && (
          <>
            <span className="kemex-brand-ar">منصة إدارة اللوجستيات والعمليات</span>
            <span className="kemex-brand-en">Logistics &amp; Operations Management Platform</span>
          </>
        )}
      </span>
    </div>
  )
}
