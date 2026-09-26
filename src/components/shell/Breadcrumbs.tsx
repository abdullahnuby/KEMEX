import { ChevronLeft, Home } from 'lucide-react'
import { NAVIGATION_GROUPS, REPORT_NAV_ITEMS } from '../../config/app'
import { findMatchingRouteDefinition } from '../../app/routing/routeRegistry'

function groupForRoute(route: string) {
  if (route === 'dashboard') return 'الرئيسية'
  if (route === 'alerts') return 'التنبيهات'
  if (route.startsWith('reports/') || route === 'true-cost') return 'التقارير والتحليلات'
  for (const group of NAVIGATION_GROUPS) {
    if (group.items.some(item => item.route === route || item.key === route || route.startsWith(`${item.route}/`))) return group.group
  }
  if (route.startsWith('asset/') || route.startsWith('assets/edit/')) return 'الأسطول والأصول'
  if (route.startsWith('project/')) return 'العمليات واللوجستيات'
  if (route.startsWith('breakdowns/')) return 'الصيانة'
  if (route.startsWith('trips/')) return 'العمليات واللوجستيات'
  if (route === 'movements') return 'المخازن والتوريد'
  return null
}

export function Breadcrumbs({ route, onNavigate }: { route: string; onNavigate: (route: string) => void }) {
  const definition = findMatchingRouteDefinition(route)
  const group = groupForRoute(route)
  if (!definition || route === 'dashboard') return null

  const reportItem = REPORT_NAV_ITEMS.find(item => item.route === route)
  const groupLabel = reportItem?.section ?? group

  return (
    <nav className="shell-breadcrumbs" aria-label="مسار الصفحة">
      <button className="shell-breadcrumb-home" onClick={() => onNavigate('dashboard')} aria-label="الرئيسية"><Home size={14} /></button>
      <ChevronLeft size={13} aria-hidden="true" />
      {groupLabel && <><span className="shell-breadcrumb-group">{groupLabel}</span><ChevronLeft size={13} aria-hidden="true" /></>}
      <span className="shell-breadcrumb-current" aria-current="page">{definition.title}</span>
    </nav>
  )
}
