import type { ReactNode } from 'react'

export function FormSection({ title, description, children, columns = 2 }: { title: string; description?: string; children: ReactNode; columns?: 1 | 2 | 3 | 4 }) {
  return (
    <section className="ds-form-section" aria-labelledby={`form-section-${title}`}>
      <header className="ds-form-section__head">
        <div>
          <h3 id={`form-section-${title}`}>{title}</h3>
          {description && <p>{description}</p>}
        </div>
      </header>
      <div className={`ds-form-section__grid cols-${columns}`}>{children}</div>
    </section>
  )
}

export function FormField({ label, required = false, help, error, children, full = false }: { label?: string; required?: boolean; help?: string; error?: string; children: ReactNode; full?: boolean }) {
  return (
    <label className={`ds-form-field ${full ? 'is-full' : ''}`.trim()}>
      {label && <span className="ds-form-field__label">{label}{required && <em aria-hidden="true">*</em>}</span>}
      {children}
      {error ? <small className="ds-form-field__error" role="alert">{error}</small> : help ? <small className="ds-form-field__help">{help}</small> : null}
    </label>
  )
}
