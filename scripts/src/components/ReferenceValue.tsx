import type { ReferenceLookups } from '../utils/referenceLabels'
import { resolveReference } from '../utils/referenceLabels'

export function ReferenceValue({ field, value, lookups, compact = false }: { field: string; value: unknown; lookups: ReferenceLookups; compact?: boolean }) {
  if (value === null || value === undefined || value === '') return <span className="reference-empty">—</span>
  const items = resolveReference(field, value, lookups)
  return <span className={`reference-value ${compact ? 'compact' : ''}`}>
    {items.map((item, index) => <span className="reference-item" key={`${item.label}-${item.code ?? ''}-${index}`}>
      <strong title={item.code ? `${item.label} — ${item.code}` : item.label}>{item.label}</strong>{item.code && item.label !== item.code && <small>{item.code}</small>}
    </span>)}
  </span>
}
