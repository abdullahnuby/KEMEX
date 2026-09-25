import type { ReactNode } from 'react'
import { Breadcrumbs } from './shell/Breadcrumbs'
import { AppNavbar } from './shell/AppNavbar'
import { ModuleSubNav } from './shell/ModuleSubNav'

export function Layout({ user, route, onRoute, onLogout, children, alertCount }: {
  user: Parameters<typeof AppNavbar>[0]['user']
  route: string
  onRoute: (route: string) => void
  onLogout: () => void
  children: ReactNode
  alertCount: number
}) {
  return <div className="app-shell">
    <main className="main-shell">
      <AppNavbar user={user} route={route} onRoute={onRoute} onLogout={onLogout} alertCount={alertCount} />
      <ModuleSubNav route={route} user={user} onRoute={onRoute} />
      <div className="page-body">
        <Breadcrumbs route={route} onNavigate={onRoute} />
        {children}
      </div>
    </main>
  </div>
}
