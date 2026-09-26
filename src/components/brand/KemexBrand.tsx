import type { HTMLAttributes } from 'react'

type KemexBrandProps = HTMLAttributes<HTMLDivElement> & {
  variant?: 'shell' | 'auth'
  compact?: boolean
}

/**
 * KEMEX visual lockup.
 * - shell: clean icon + KEMEX wordmark for the application navbar
 * - auth: full bilingual lockup for login/change-password surfaces
 */
export function KemexBrand({ variant = 'shell', compact = false, className = '', ...props }: KemexBrandProps) {
  const classes = ['kemex-brand-lockup', `kemex-brand-lockup--${variant}`, compact ? 'is-compact' : '', className]
    .filter(Boolean)
    .join(' ')
  const isAuth = variant === 'auth'

  return (
    <div className={classes} {...props}>
      <img
        className={isAuth ? 'kemex-brand-image kemex-brand-image--full' : 'kemex-brand-image kemex-brand-image--wordmark'}
        src={isAuth ? '/kemex-full.png' : '/kemex-wordmark.png'}
        alt={isAuth ? 'KEMEX — منصة إدارة اللوجستيات والعمليات' : 'KEMEX'}
        width={isAuth ? 1010 : 1019}
        height={isAuth ? 276 : 290}
        decoding="async"
        fetchPriority="high"
        draggable={false}
      />
    </div>
  )
}
