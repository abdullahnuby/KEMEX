import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AppProviders } from './app/providers/AppProviders'
import { AppErrorBoundary } from './app/providers/AppErrorBoundary'
import './index.css'
import './styles/global.css'
import './shared/ui/design-system.css'
import './styles/compact-final.css'
import './styles/enterprise-sprint03.css'
import './styles/enterprise-sprint04.css'
import './styles/dashboard-page.css'
import './styles/brand-identity.css'
import './styles/mobile-viewport.css'
import './styles/platform-companies-page.css'
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
