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
import { markPerformance, measurePerformance } from './utils/performance'

markPerformance('app-startup')
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
