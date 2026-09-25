import { NAVIGATION_GROUPS, canViewModule, type NavigationItem } from '../../config/app'
import type { User } from '../../types/tfms'

/**
 * Mobile-only horizontal tab strip showing the sibling pages of whichever
 * module group the current route belongs to (e.g. inside "الصيانة":
 * أوامر العمل | الأعطال | الخطط | الزيوت | الإطارات).
 *
 * On desktop this module's sibling pages are reachable from the navbar's
 * group dropdown at any time. On mobile there was previously no way to
 * move between them without leaving to the global "المزيد" sheet — this
 * closes that gap without touching any individual page.
 *
 * Rendered once in Layout.tsx so every route gets it automatically.
 * Hidden by CSS above 900px (desktop keeps using its existing navbar
 * dropdown) and hidden entirely when the current route has no group
 * (e.g. dashboard) or the group has only one item.
 */
export function ModuleSubNav({ route, user, onRoute }: {
  route: string
  user: User
  onRoute: (route: string) => void
}) {
  const group = NAVIGATION_GROUPS.find(g => g.items.some(item => matchesRoute(item, route)))
  if (!group) return null

  const items = group.items.filter(item => canViewModule(user.role, item.permissionModule ?? item.key))
  if (items.length < 2) return null

  return <nav className="module-sub-nav" aria-label={`أقسام ${group.group}`}>
    {items.map(item => {
      const active = matchesRoute(item, route)
      return <button key={item.key} type="button" className={`module-sub-nav-item ${active ? 'active' : ''}`} onClick={() => onRoute(item.route)}>
        {item.label}
      </button>
    })}
  </nav>
}

function matchesRoute(item: NavigationItem, route: string) {
  if (route === item.route || route === item.key) return true
  // Detail/edit sub-routes of the same module still count as "inside" this tab
  // (e.g. asset/123 belongs to the assets tab, breakdowns/456 to breakdowns).
  if (item.key === 'assets' && (route.startsWith('asset/') || route.startsWith('assets/'))) return true
  if (item.key === 'breakdowns' && route.startsWith('breakdowns/')) return true
  if (item.key === 'trips' && route.startsWith('trips/')) return true
  if (item.key === 'projects' && route.startsWith('project/')) return true
  if (item.key === 'assignments' && route.startsWith('assignments/')) return true
  return false
}
