import { createPortal } from 'react-dom'
import { Printer } from 'lucide-react'
import type { ReactNode } from 'react'
import './print.css'

export type PrintableMetaItem = {
  label: string
  value: ReactNode
}

export type PrintableSignature = {
  label: string
  name?: string
  note?: string
}

export type PrintableDocumentProps = {
  /** Stable id used by PrintButton to isolate the document being printed. */
  printId: string
  documentTitle: string
  documentNumber?: string
  documentDate?: string
  documentStatus?: string
  companyName?: string
  groupName?: string
  logoSrc?: string
  reference?: string
  meta?: PrintableMetaItem[]
  signatures?: PrintableSignature[]
  footerNote?: string
  children: ReactNode
}

export type PrintButtonProps = {
  printId: string
  documentTitle: string
  label?: string
  className?: string
  disabled?: boolean
}

function safeDocumentTitle(value: string): string {
  return value
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'KEMEX'
}

/**
 * Starts a native browser print job while isolating one KEMEX printable document.
 *
 * This intentionally does not claim to create a PDF file itself. Browsers can
 * save the rendered print output as PDF through the system print dialog.
 */
export function printDocument(printId: string, documentTitle: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const previousTitle = document.title
  const body = document.body
  const target = Array.from(document.querySelectorAll<HTMLElement>('[data-kemex-print-id]'))
    .find(element => element.dataset.kemexPrintId === printId)

  if (!target) {
    window.alert('تعذر تجهيز المستند للطباعة. حاول تحديث الصفحة ثم أعد المحاولة.')
    return
  }

  let cleaned = false
  const cleanup = () => {
    if (cleaned) return
    cleaned = true
    body.classList.remove('kemex-printing')
    body.removeAttribute('data-kemex-print-target')
    document.title = previousTitle
    window.removeEventListener('afterprint', cleanup)
  }

  body.classList.add('kemex-printing')
  body.dataset.kemexPrintTarget = printId
  document.title = safeDocumentTitle(documentTitle)
  window.addEventListener('afterprint', cleanup)

  window.setTimeout(() => cleanup(), 60_000)
  window.print()
}

export function PrintButton({
  printId,
  documentTitle,
  label = 'طباعة',
  className = '',
  disabled = false,
}: PrintButtonProps) {
  return (
    <button
      type="button"
      className={`secondary-button print-trigger ${className}`.trim()}
      onClick={() => printDocument(printId, documentTitle)}
      disabled={disabled}
    >
      <Printer size={15} aria-hidden="true" />
      {label}
    </button>
  )
}

function renderMeta(meta: PrintableMetaItem[] | undefined) {
  if (!meta?.length) return null

  return (
    <dl className="kemex-print-meta">
      {meta.map((item, index) => (
        <div key={`${item.label}-${index}`} className="kemex-print-meta-item">
          <dt>{item.label}</dt>
          <dd>{item.value || '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

function renderSignatures(signatures: PrintableSignature[] | undefined) {
  if (!signatures?.length) return null

  return (
    <section className={`kemex-print-signatures signatures-${Math.min(signatures.length, 4)}`}>
      {signatures.map((signature, index) => (
        <div key={`${signature.label}-${index}`} className="kemex-print-signature">
          <strong>{signature.label}</strong>
          {signature.name && <span>{signature.name}</span>}
          {signature.note && <small>{signature.note}</small>}
          <div className="kemex-print-signature-line" aria-hidden="true" />
        </div>
      ))}
    </section>
  )
}

/**
 * Reusable print-only document shell.
 *
 * Page-specific screens remain unchanged. Pages add this component beside their
 * normal UI and provide the record content, company settings and signatures.
 */
export function PrintableDocument({
  printId,
  documentTitle,
  documentNumber,
  documentDate,
  documentStatus,
  companyName = 'KEMEX',
  groupName,
  logoSrc = '/kemex.svg',
  reference,
  meta,
  signatures,
  footerNote,
  children,
}: PrintableDocumentProps) {
  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="kemex-print-layer"
      data-kemex-print-id={printId}
      dir="rtl"
      role="document"
      aria-label={documentTitle}
    >
      <article className="kemex-print-document">
        <header className="kemex-print-header">
          <div className="kemex-print-brand">
            <img src={logoSrc} alt="" className="kemex-print-logo" />
            <div>
              <div className="kemex-print-company">{companyName}</div>
              {groupName && <div className="kemex-print-group">{groupName}</div>}
            </div>
          </div>

          <div className="kemex-print-title">
            <span>مستند KEMEX</span>
            <h1>{documentTitle}</h1>
            {documentNumber && <strong>{documentNumber}</strong>}
          </div>
        </header>

        <div className="kemex-print-document-bar">
          {documentDate && (
            <span>
              <b>التاريخ:</b> {documentDate}
            </span>
          )}
          {documentStatus && (
            <span>
              <b>الحالة:</b> {documentStatus}
            </span>
          )}
          {reference && (
            <span>
              <b>المرجع:</b> {reference}
            </span>
          )}
        </div>

        {renderMeta(meta)}

        <main className="kemex-print-content">{children}</main>

        {renderSignatures(signatures)}

        <footer className="kemex-print-footer">
          <div>{footerNote || 'مستند صادر من نظام KEMEX لإدارة الأسطول والأصول.'}</div>
          <div className="kemex-print-page-number" aria-label="رقم الصفحة" />
        </footer>
      </article>
    </div>,
    document.body,
  )
}
