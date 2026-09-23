import { supabase, supabaseConfigured } from './supabase'

let lastFingerprint = ''
let lastReportedAt = 0

function fingerprint(message: string, route: string) {
  return `${route}|${message.slice(0, 300)}`
}

/** Best-effort production telemetry. It never blocks the user-facing error boundary. */
export function reportClientError(error: unknown, context: { route?: string; componentStack?: string; metadata?: Record<string, unknown> } = {}) {
  if (!supabaseConfigured || !supabase) return
  const err = error instanceof Error ? error : new Error(String(error))
  const route = context.route ?? (window.location.hash || window.location.pathname)
  const fp = fingerprint(err.message, route)
  const now = Date.now()
  if (fp === lastFingerprint && now - lastReportedAt < 15_000) return
  lastFingerprint = fp
  lastReportedAt = now
  void supabase.rpc('report_client_error', {
    p_route: route,
    p_error_name: err.name,
    p_message: err.message,
    p_stack: err.stack ?? null,
    p_component_stack: context.componentStack ?? null,
    p_metadata: { ...(context.metadata ?? {}), userAgent: navigator.userAgent },
  }).then(({ error: rpcError }) => {
    if (rpcError && import.meta.env.DEV) console.warn('KEMEX telemetry failed', rpcError.message)
  })
}
