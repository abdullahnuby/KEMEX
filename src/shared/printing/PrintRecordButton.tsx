import { useEffect, useId, useState, type ReactNode } from 'react'
import { Printer } from 'lucide-react'
import type { PrintableMetaItem, PrintableSignature } from './PrintableDocument'
import { printDocument, PrintableDocument } from './PrintableDocument'

type Props = {
  documentTitle: string
  documentNumber?: string
  documentDate?: string
  documentStatus?: string
  reference?: string
  meta?: PrintableMetaItem[]
  signatures?: PrintableSignature[]
  footerNote?: string
  orientation?: 'portrait' | 'landscape'
  children: ReactNode
  label?: string
}

/** One-click printing for a single business document. The print-only document
 * is mounted only after the user asks for it, so large list pages do not carry
 * hundreds of hidden document trees. */
export function PrintRecordButton({
  documentTitle,
  documentNumber,
  documentDate,
  documentStatus,
  reference,
  meta,
  signatures,
  footerNote,
  orientation = 'portrait',
  children,
  label = 'طباعة',
}: Props) {
  const [ready, setReady] = useState(false)
  const instanceId = useId().replace(/:/g, '')
  const printId = `kemex-record-print-${instanceId}`

  useEffect(() => {
    if (!ready) return
    let timer: number | undefined
    const done = () => setReady(false)
    window.addEventListener('afterprint', done, { once: true })
    timer = window.setTimeout(() => printDocument(printId, documentTitle), 80)
    const fallback = window.setTimeout(done, 60000)
    return () => {
      if (timer) window.clearTimeout(timer)
      window.clearTimeout(fallback)
      window.removeEventListener('afterprint', done)
    }
  }, [ready, printId, documentTitle])

  return (
    <>
      <button
        type="button"
        className="ui-data-table__tool-button"
        aria-label={`${label} ${documentTitle}`}
        onClick={() => setReady(true)}
      >
        <Printer size={14} aria-hidden="true" />
        {label}
      </button>
      {ready && (
        <PrintableDocument
          printId={printId}
          documentTitle={documentTitle}
          documentNumber={documentNumber}
          documentDate={documentDate}
          documentStatus={documentStatus}
          reference={reference}
          meta={meta}
          signatures={signatures}
          footerNote={footerNote}
          orientation={orientation}
        >
          {children}
        </PrintableDocument>
      )}
    </>
  )
}
