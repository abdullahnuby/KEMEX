import { createPortal } from 'react-dom'
import { Printer } from 'lucide-react'
import type { ReactNode } from 'react'
import { DEFAULT_PRINT_SETTINGS, usePrintSettings } from './PrintSettingsContext'
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
  orientation?: 'portrait' | 'landscape'
  /** Use the administrator's global print settings for this document. Defaults to true. */
  useGlobalSettings?: boolean
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

/** Starts a native browser print job while isolating one KEMEX printable document. */
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
    document.head.querySelectorAll('style[data-kemex-print-runtime]').forEach(style => style.remove())
    window.removeEventListener('afterprint', cleanup)
  }

  const getCssVar = (name: string, fallback: string) => {
    const value = getComputedStyle(target).getPropertyValue(name).trim()
    return value || fallback
  }
  const paper = target.classList.contains('kemex-print-paper-letter') ? 'Letter' : 'A4'
  const orientation = target.classList.contains('kemex-print-layer--landscape') ? 'landscape' : 'portrait'
  const minBottom = target.classList.contains('kemex-print-signature-mode--every-page') ? (target.classList.contains('kemex-print-density--comfortable') ? '48mm' : '42mm') : getCssVar('--kemex-print-margin-bottom', '30mm')
  const requestedBottom = getCssVar('--kemex-print-margin-bottom', minBottom)
  const bottomMargin = `${Math.max(parseFloat(requestedBottom) || 0, parseFloat(minBottom) || 0)}mm`
  const runtimeStyle = document.createElement('style')
  runtimeStyle.setAttribute('data-kemex-print-runtime', 'true')
  runtimeStyle.textContent = `@media print { @page { size: ${paper} ${orientation}; margin: ${getCssVar('--kemex-print-margin-top', '10mm')} ${getCssVar('--kemex-print-margin-right', '12mm')} ${bottomMargin} ${getCssVar('--kemex-print-margin-left', '12mm')}; } }`
  document.head.appendChild(runtimeStyle)

  const previousRuntimeStyles = Array.from(document.head.querySelectorAll('style[data-kemex-print-runtime]')).slice(0, -1)
  previousRuntimeStyles.forEach(style => style.remove())

  body.classList.add('kemex-printing')
  body.dataset.kemexPrintTarget = printId
  document.title = safeDocumentTitle(documentTitle)
  window.addEventListener('afterprint', cleanup)
  window.setTimeout(() => cleanup(), 60_000)
  window.print()
}

export function PrintButton({ printId, documentTitle, label = 'طباعة', className = '', disabled = false }: PrintButtonProps) {
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

function renderSignatures(signatures: PrintableSignature[] | undefined, labels: string[]) {
  const effective = signatures?.length ? signatures : labels.map(label => ({ label }))
  if (!effective.length) return null

  return (
    <section className={`kemex-print-signatures signatures-${Math.min(effective.length, 4)}`}>
      {effective.map((signature, index) => (
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

export function PrintableDocument({
  printId,
  documentTitle,
  documentNumber,
  documentDate,
  documentStatus,
  companyName,
  groupName,
  logoSrc,
  reference,
  meta,
  signatures,
  footerNote,
  orientation,
  useGlobalSettings = true,
  children,
}: PrintableDocumentProps) {
  if (typeof document === 'undefined') return null
  const global = usePrintSettings()
  const settings = useGlobalSettings && global.applyGlobalTemplate ? global : DEFAULT_PRINT_SETTINGS

  const resolvedCompanyName = companyName ?? settings.companyName ?? ''
  const resolvedGroupName = groupName ?? settings.groupName ?? ''
  const resolvedLogo = logoSrc ?? settings.logoSrc
  const resolvedFooterNote = footerNote ?? settings.footerText
  const resolvedSignatures = settings.signatureMode === 'none' ? undefined : signatures
  const resolvedOrientation = settings.orientation === 'landscape' ? 'landscape' : settings.orientation === 'portrait' ? 'portrait' : (orientation ?? 'portrait')
  const paperClass = settings.paperSize === 'Letter' ? 'kemex-print-paper-letter' : 'kemex-print-paper-a4'
  const resolvedLabels = settings.signatureLabels.length ? settings.signatureLabels : DEFAULT_PRINT_SETTINGS.signatureLabels
  const showSignatureArea = settings.signatureMode !== 'none' && Boolean(resolvedSignatures?.length || resolvedLabels.length)
  const signatureClass = settings.signatureMode === 'every-page' ? 'kemex-print-fixed-area kemex-print-fixed-area--repeat' : 'kemex-print-fixed-area'
  const fontClass = `kemex-print-font--${settings.fontFamily}`
  const layoutClass = `kemex-print-layout--${settings.layoutStyle}`

  return createPortal(
    <div
      className={`kemex-print-layer kemex-print-layer--${resolvedOrientation} kemex-print-density--${settings.tableDensity} kemex-print-signature-mode--${settings.signatureMode} ${paperClass} ${fontClass} ${layoutClass}`}
      data-kemex-print-id={printId}
      dir="rtl"
      role="document"
      aria-label={documentTitle}
      style={{
        ['--kemex-print-primary' as string]: settings.primaryColor,
        ['--kemex-print-margin-top' as string]: `${settings.marginTopMm}mm`,
        ['--kemex-print-margin-right' as string]: `${settings.marginRightMm}mm`,
        ['--kemex-print-margin-bottom' as string]: `${settings.marginBottomMm}mm`,
        ['--kemex-print-margin-left' as string]: `${settings.marginLeftMm}mm`,
        ['--kemex-print-logo-width' as string]: `${settings.logoWidthMm}mm`,
        ['--kemex-print-signature-height' as string]: `${settings.signatureHeightMm}mm`,
      }}
    >
      <article className="kemex-print-document">
        <header className="kemex-print-header">
          <div className="kemex-print-brand">
            {settings.showLogo && resolvedLogo && <img src={resolvedLogo} alt="" className="kemex-print-logo" />}
            {(settings.showCompanyName || (settings.showGroupName && resolvedGroupName) || (settings.showCompanyDetails && (settings.companyAddress || settings.companyContact))) && (
              <div className="kemex-print-brand-text">
                {settings.showCompanyName && resolvedCompanyName && <div className="kemex-print-company">{resolvedCompanyName}</div>}
                {settings.showGroupName && resolvedGroupName && <div className="kemex-print-group">{resolvedGroupName}</div>}
                {settings.showCompanyDetails && settings.companyAddress && <div className="kemex-print-company-detail">{settings.companyAddress}</div>}
                {settings.showCompanyDetails && settings.companyContact && <div className="kemex-print-company-detail">{settings.companyContact}</div>}
              </div>
            )}
          </div>

          <div className="kemex-print-title">
            {settings.showDocumentLabel && <span>مستند</span>}
            <h1>{documentTitle}</h1>
            {documentNumber && <strong>{documentNumber}</strong>}
          </div>
        </header>

        {settings.showDocumentMeta && <div className="kemex-print-document-bar">
          {documentDate && <span><b>التاريخ:</b> {documentDate}</span>}
          {documentStatus && <span><b>الحالة:</b> {documentStatus}</span>}
          {reference && <span><b>المرجع:</b> {reference}</span>}
        </div>}

        {renderMeta(meta)}
        <main className="kemex-print-content">{children}</main>

        <div className={`${signatureClass} ${showSignatureArea ? '' : 'kemex-print-fixed-area--no-signatures'}`.trim()}>
          {showSignatureArea && renderSignatures(resolvedSignatures, resolvedLabels)}
          {settings.showFooter && (
            <footer className="kemex-print-footer">
              {settings.showAppName ? <div className="kemex-print-app-name">{settings.appName}</div> : <div />}
              <div className="kemex-print-footer-text">{resolvedFooterNote}</div>
              {settings.showPageNumbers ? <div className="kemex-print-page-number" aria-label="رقم الصفحة" /> : <div />}
            </footer>
          )}
        </div>
      </article>
    </div>,
    document.body,
  )
}
