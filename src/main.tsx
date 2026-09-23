import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AppProviders } from './app/providers/AppProviders'
import { AppErrorBoundary } from './app/providers/AppErrorBoundary'
import './index.css'
import './styles/global.css'
import './styles/frontend-overhaul.css'
import './styles/reference-overhaul.css'
import './styles/modal-overhaul.css'
import './shared/ui/design-system.css'
import './styles/phase11-responsive.css'
import './styles/phase12-rtl.css'
import './styles/phase17-visual-stability.css'
import './styles/phase18-form-visibility.css'
import './styles/phase19-typography.css'
import './styles/enterprise-tokens.css'
import './styles/compact-final.css'
import { markPerformance, measurePerformance } from './utils/performance'
import { reportClientError } from './services/telemetry'

markPerformance('app-startup')
window.addEventListener('error', event => reportClientError(event.error ?? new Error(event.message), { route: window.location.hash || window.location.pathname, metadata: { source: 'window.error' } }))
window.addEventListener('unhandledrejection', event => reportClientError(event.reason ?? new Error('Unhandled promise rejection'), { route: window.location.hash || window.location.pathname, metadata: { source: 'unhandledrejection' } }))
function StartupTelemetry() {
  useEffect(() => {
    const id = window.requestAnimationFrame(() => measurePerformance('app-startup'))
    return () => window.cancelAnimationFrame(id)
  }, [])
  return null
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <AppErrorBoundary>
        <StartupTelemetry />
        <App />
      </AppErrorBoundary>
    </AppProviders>
  </StrictMode>,
)
