import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'warning'
type Size = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
  iconEnd?: ReactNode
  fullWidth?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconEnd,
  fullWidth = false,
  disabled,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  const isDisabled = Boolean(disabled || loading)
  return (
    <button
      {...rest}
      disabled={isDisabled}
      className={`ui-button ui-button--${variant} ui-button--${size} ${fullWidth ? 'ui-button--full' : ''} ${className}`.trim()}
    >
      {loading ? <span className="ui-button__spinner" aria-hidden="true" /> : icon}
      {children && <span className="ui-button__label">{children}</span>}
      {!loading && iconEnd}
    </button>
  )
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  variant?: Variant
  size?: Size
  label: string
  loading?: boolean
}

export function IconButton({ icon, variant = 'secondary', size = 'md', label, loading = false, className = '', disabled, ...rest }: IconButtonProps) {
  const box = size === 'sm' ? 'ui-icon-button--sm' : size === 'lg' ? 'ui-icon-button--lg' : 'ui-icon-button--md'
  return (
    <button
      {...rest}
      aria-label={label}
      title={rest.title ?? label}
      disabled={disabled || loading}
      className={`ui-icon-button ${box} ui-icon-button--${variant} ${className}`.trim()}
    >
      {loading ? <span className="ui-button__spinner" aria-hidden="true" /> : icon}
    </button>
  )
}
