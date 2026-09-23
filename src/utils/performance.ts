const marks = new Map<string, number>()

export function markPerformance(name: string) {
  if (typeof performance === 'undefined') return
  marks.set(name, performance.now())
  performance.mark(`kemex:${name}:start`)
}

export function measurePerformance(name: string) {
  if (typeof performance === 'undefined') return null
  const started = marks.get(name)
  if (started == null) return null
  const duration = performance.now() - started
  performance.measure(`kemex:${name}`, `kemex:${name}:start`)
  marks.delete(name)
  return duration
}

export function getNavigationTiming() {
  if (typeof performance === 'undefined') return null
  const entry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
  if (!entry) return null
  return {
    domContentLoaded: entry.domContentLoadedEventEnd,
    domInteractive: entry.domInteractive,
    loadEventEnd: entry.loadEventEnd,
  }
}
