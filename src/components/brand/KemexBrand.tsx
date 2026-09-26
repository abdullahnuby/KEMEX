import type { HTMLAttributes } from 'react'

type KemexBrandProps = HTMLAttributes<HTMLDivElement> & {
  variant?: 'shell' | 'auth'
  compact?: boolean
}

/** KEMEX visual lockup: compact wordmark in the shell, full bilingual mark on auth. */
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
        alt="KEMEX"
        draggable={false}
      />
    </div>
  )
}
