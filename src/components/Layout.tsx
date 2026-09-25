import type { ReactNode } from 'react'
import { Breadcrumbs } from './shell/Breadcrumbs'
import { AppNavbar } from './shell/AppNavbar'
import { ModuleSubNav } from './shell/ModuleSubNav'
import type { AppNotification } from '../features/notifications/types'

export function Layout({ user, route, onRoute, onLogout, children, alertCount, notifications, notificationUnreadCount, notificationsLoading, onRefreshNotifications, onMarkNotificationRead, onMarkAllRead }: {
  user: Parameters<typeof AppNavbar>[0]['user']
  route: string
  onRoute: (route: string) => void
  onLogout: () => void
  children: ReactNode
  alertCount: number
  notifications: AppNotification[]
  notificationUnreadCount: number
  notificationsLoading: boolean
  onRefreshNotifications: () => Promise<void>
  onMarkNotificationRead: (id: string) => Promise<void>
  onMarkAllRead: () => Promise<void>
}) {
  return <div className="app-shell">
    <main className="main-shell">
      <AppNavbar user={user} route={route} onRoute={onRoute} onLogout={onLogout} alertCount={alertCount} notifications={notifications} notificationUnreadCount={notificationUnreadCount} notificationsLoading={notificationsLoading} onRefreshNotifications={onRefreshNotifications} onMarkNotificationRead={onMarkNotificationRead} onMarkAllRead={onMarkAllRead} />
      <ModuleSubNav route={route} user={user} onRoute={onRoute} />
      <div className="page-body">
        <Breadcrumbs route={route} onNavigate={onRoute} />
        {children}
      </div>
    </main>
  </div>
}
