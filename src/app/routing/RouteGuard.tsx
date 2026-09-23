import type { ReactNode } from 'react'
import { ModulePlaceholderPage } from '../../pages/ModulePlaceholderPage'
import { canViewModule } from '../../config/app'

type RouteGuardProps = {
  role: string
  module: string
  onRoute: (route: string) => void
  children: ReactNode
}

/** Central route-level authorization boundary. It is intentionally UI-only and delegates
 * capability ownership to config/app.ts rather than duplicating role rules. */
export function RouteGuard({ role, module, onRoute, children }: RouteGuardProps) {
  if (canViewModule(role, module)) return <>{children}</>
  return (
    <ModulePlaceholderPage
      title="غير مصرح"
      description="هذا القسم غير متاح للدور الحالي وفق مصفوفة الصلاحيات المرجعية."
      onRoute={onRoute}
    />
  )
}
