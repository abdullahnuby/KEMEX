import type { ReactNode } from 'react'

export type ChartPoint = { label: string; value: number; secondary?: number }

const nfmt = new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 0 })
const num = (value: number) => nfmt.format(Math.round(Number.isFinite(value) ? value : 0))

export function AnalyticsLineChart({ points, height = 230, valueSuffix = '', secondarySuffix = '', primaryLabel, secondaryLabel }: { points: ChartPoint[]; height?: number; valueSuffix?: string; secondarySuffix?: string; primaryLabel?: string; secondaryLabel?: string }) {
  const safe = points.length ? points : [{ label: '—', value: 0 }]
  const hasSecondary = safe.some(point => Number(point.secondary || 0) > 0)
  const hasSignal = safe.some(point => Number(point.value || 0) > 0 || Number(point.secondary || 0) > 0)
  if (!hasSignal) return <EmptyChart message="لا توجد بيانات تكلفة أو وقود كافية للفترة الحالية." />

  const max = Math.max(1, ...safe.flatMap(point => [point.value, ...(hasSecondary ? [point.secondary || 0] : [])]))
  const min = 0
  const range = Math.max(1, max - min)
  const left = 56
  const right = 14
  const top = 18
  const bottom = 38
  const width = 760
  const chartW = width - left - right
  const chartH = height - top - bottom
  const x = (i: number) => safe.length === 1 ? left + chartW / 2 : left + (i / (safe.length - 1)) * chartW
  const y = (v: number) => top + ((max - v) / range) * chartH
  const pathFor = (key: 'value' | 'secondary') => safe.map((point, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(Number(point[key] || 0)).toFixed(1)}`).join(' ')
  const primaryPath = pathFor('value')
  const secondaryPath = hasSecondary ? pathFor('secondary') : ''
  const area = `${primaryPath} L ${x(safe.length - 1)} ${top + chartH} L ${x(0)} ${top + chartH} Z`
  const numberFormat = new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 0 })

  return <div className="analytics-chart" dir="ltr">
    {(primaryLabel || secondaryLabel) && <div className="analytics-line-legend" dir="rtl"><span>{primaryLabel && <i className="legend-dot primary" />}{primaryLabel}</span>{secondaryLabel && hasSecondary && <span><i className="legend-dot secondary" />{secondaryLabel}</span>}</div>}
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="رسم بياني خطي للتكاليف">
      {[0, .25, .5, .75, 1].map(tick => {
        const yy = top + chartH * tick
        const val = max - range * tick
        return <g key={tick}><line x1={left} x2={width - right} y1={yy} y2={yy} className="chart-grid-line" /><text x={left - 10} y={yy + 4} textAnchor="end" className="chart-axis-label">{numberFormat.format(Math.round(val))}</text></g>
      })}
      <path d={area} className="chart-area" />
      <path d={primaryPath} className="chart-line primary-line" fill="none" />
      {hasSecondary && <path d={secondaryPath} className="chart-line secondary-line" fill="none" />}
      {safe.map((point, i) => <g key={`${point.label}-${i}`}>
        <circle cx={x(i)} cy={y(point.value)} r="4.5" className="chart-point primary-point" />
        {hasSecondary && <circle cx={x(i)} cy={y(Number(point.secondary || 0))} r="4" className="chart-point secondary-point" />}
        <text x={x(i)} y={height - 12} textAnchor="middle" className="chart-x-label">{point.label}</text>
        <title>{`${point.label}: ${numberFormat.format(Math.round(point.value))}${valueSuffix}${hasSecondary ? ` · ${numberFormat.format(Math.round(Number(point.secondary || 0)))}${secondarySuffix}` : ''}`}</title>
      </g>)}
    </svg>
  </div>
}

export function AnalyticsBarChart({ points, valueSuffix = '', limit = 7 }: { points: ChartPoint[]; valueSuffix?: string; limit?: number }) {
  const ranked = [...points].sort((a, b) => b.value - a.value).slice(0, limit)
  const max = Math.max(1, ...ranked.map((p) => p.value))
  return <div className="analytics-bars">
    {ranked.length ? ranked.map((p) => <div className="analytics-bar-row" key={p.label}>
      <div className="analytics-bar-meta"><span title={p.label}>{p.label}</span><strong>{num(p.value)}{valueSuffix}</strong></div>
      <div className="analytics-bar-track"><span style={{ width: `${Math.max(4, (p.value / max) * 100)}%` }} /></div>
    </div>) : <EmptyChart />}
  </div>
}

export function AnalyticsDualBars({ points, firstLabel = 'المؤشر 1', secondLabel = 'المؤشر 2' }: { points: ChartPoint[]; firstLabel?: string; secondLabel?: string }) {
  const ranked = [...points].slice(0, 7)
  const max = Math.max(1, ...ranked.flatMap((p) => [p.value, p.secondary ?? 0]))
  return <div className="analytics-dual-bars">
    <div className="analytics-legend"><span><i className="legend-dot primary" />{firstLabel}</span><span><i className="legend-dot secondary" />{secondLabel}</span></div>
    {ranked.length ? ranked.map((p) => <div className="analytics-dual-row" key={p.label}>
      <div className="analytics-bar-meta"><span title={p.label}>{p.label}</span><strong>{num(p.value)}</strong></div>
      <div className="analytics-dual-track"><span className="primary-bar" style={{ width: `${Math.max(3, p.value / max * 100)}%` }} /><span className="secondary-bar" style={{ width: `${Math.max(2, (p.secondary ?? 0) / max * 100)}%` }} /></div>
    </div>) : <EmptyChart />}
  </div>
}

export function AnalyticsDonut({ segments, centerValue, centerLabel }: { segments: Array<{ label: string; value: number }>; centerValue: string; centerLabel: string }) {
  const clean = segments.filter((s) => s.value > 0)
  const total = clean.reduce((s, x) => s + x.value, 0)
  let cursor = 0
  const colors = ['#0e7490', '#16a34a', '#d97706', '#7c3aed', '#dc2626', '#64748b']
  return <div className="analytics-donut-wrap">
    <div className="analytics-donut" dir="ltr">
      <svg viewBox="0 0 120 120" role="img" aria-label="رسم توزيع دائري">
        <circle cx="60" cy="60" r="44" className="donut-track" />
        {total > 0 && clean.map((seg, i) => {
          const start = cursor
          cursor += seg.value / total
          const end = cursor
          const circumference = 2 * Math.PI * 44
          const dash = `${Math.max(1, (end - start) * circumference)} ${circumference}`
          const offset = -start * circumference - circumference / 4
          return <circle key={seg.label} cx="60" cy="60" r="44" className="donut-segment" stroke={colors[i % colors.length]} strokeDasharray={dash} strokeDashoffset={offset} />
        })}
        <circle cx="60" cy="60" r="33" className="donut-center" />
      </svg>
      <div className="donut-center-copy"><strong>{centerValue}</strong><span>{centerLabel}</span></div>
    </div>
    <div className="analytics-donut-legend">{segments.map((seg, i) => <div key={seg.label}><span><i style={{ background: colors[i % colors.length] }} />{seg.label}</span><strong>{num(seg.value)}</strong></div>)}</div>
  </div>
}

export function ChartShell({ title, description, action, children, className = '' }: { title: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`analytics-panel ${className}`.trim()}>
    <header className="analytics-panel-head">
      <div><h2>{title}</h2>{description && <p>{description}</p>}</div>
      {action}
    </header>
    <div className="analytics-panel-body">{children}</div>
  </section>
}

function EmptyChart({ message = 'لا توجد بيانات كافية للتحليل.' }: { message?: string }) {
  return <div className="analytics-empty"><span>{message}</span></div>
}
