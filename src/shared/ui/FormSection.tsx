import type { ReactNode } from 'react'

export function FormSection({ title, description, children, columns = 2 }: { title: string; description?: string; children: ReactNode; columns?: 1 | 2 | 3 | 4 }) {
  const sectionId = `form-section-${title.replace(/\s+/g, '-').replace(/[^\u0600-\u06FF\w-]/g, '')}`
  return (
    <section className="form-section ds-form-section" aria-labelledby={sectionId}>
      <header className="form-section-head ds-form-section__head">
        <div>
          <strong id={sectionId}>{title}</strong>
          {description && <span>{description}</span>}
        </div>
      </header>
      <div className={`form-grid ds-form-section__grid cols-${columns}`}>{children}</div>
    </section>
  )
}

export function FormField({ label, required = false, help, error, children, full = false }: { label?: string; required?: boolean; help?: string; error?: string; children: ReactNode; full?: boolean }) {
  return (
    <label className={`field ds-form-field ${full ? 'field-full is-full' : ''}`.trim()}>
      {label && <span className="ds-form-field__label">{label}{required && <em aria-hidden="true">*</em>}</span>}
      {children}
      {error ? <small className="ds-form-field__error" role="alert">{error}</small> : help ? <small className="ds-form-field__help">{help}</small> : null}
    </label>
  )
}
