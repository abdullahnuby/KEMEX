import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AppProviders } from './app/providers/AppProviders'
import './index.css'
import './styles/global.css'
import './shared/ui/design-system.css'
import './styles/frontend-overhaul.css'
import './styles/reference-overhaul.css'
import './styles/modal-overhaul.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)
