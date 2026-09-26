import { useEffect, useMemo, useRef, useState } from 'react'
import { BarChart3, Bell, ChevronDown, Gauge, LayoutDashboard, LogOut, Menu, MoreHorizontal, Search, Truck, Wrench, X, type LucideIcon } from 'lucide-react'
import { APP, NAVIGATION_GROUPS, REPORT_NAV_ITEMS, ROLE_LABELS, canViewModule, type NavigationGroup, type NavigationItem, type ReportNavigationItem } from '../../config/app'
import type { Role, User } from '../../types/tfms'
import type { AppNotification } from '../../features/notifications/types'
import { GlobalSearchPanel, NotificationPopover, UserMenu } from './ShellPopovers'
import { KemexBrand } from '../brand/KemexBrand'

const ICONS: Record<string, LucideIcon> = {}
export function registerModuleIcons(icons: Record<string, LucideIcon>) { Object.assign(ICONS, icons) }
function iconFor(name: string, fallback?: LucideIcon) { return ICONS[name] ?? fallback }

// Groups already reachable directly from the mobile bottom tab bar — hidden
// from the "المزيد" sheet by default to avoid listing the same destination twice.
const PRIMARY_TAB_GROUPS = new Set(['العمليات واللوجستيات', 'الأسطول والأصول', 'الصيانة'])

export function AppNavbar({ user, route, onRoute, onLogout, alertCount, notifications, notificationUnreadCount, notificationsLoading, onRefreshNotifications, onMarkNotificationRead, onMarkAllRead }: {
  user: User
  route: string
  onRoute: (route: string) => void
  onLogout: () => void
  alertCount: number
  notifications: AppNotification[]
  notificationUnreadCount: number
  notificationsLoading: boolean
  onRefreshNotifications: () => Promise<void>
  onMarkNotificationRead: (id: string) => Promise<void>
  onMarkAllRead: () => Promise<void>
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [popover, setPopover] = useState<'search' | 'notifications' | 'user' | null>(null)
  const [query, setQuery] = useState('')
  const navRef = useRef<HTMLDivElement>(null)

  const routeModule = resolveRouteModule(route)
  const currentGroup = useMemo(() => findGroupForRoute(route), [route])
  const q = query.trim().toLocaleLowerCase('ar-EG')

  const groups = useMemo(() => {
    const canSee = (item: NavigationItem) => item.permissionModule === 'platform'
      ? user.isPlatformOwner === true
      : canViewModule(user.role, permissionKeyForNavItem(item))
    return NAVIGATION_GROUPS.filter(group => group.group !== 'التقارير والتحليلات').map(group => ({
      ...group,
      items: group.items.filter(item => canSee(item) && matchesQuery(item, q)),
    })).filter(group => group.items.length)
  }, [user.role, user.isPlatformOwner, q])

  const searchResults = useMemo(() => {
    const items = NAVIGATION_GROUPS.flatMap(group => group.items
      .filter(item => item.permissionModule === 'platform'
        ? user.isPlatformOwner === true
        : canViewModule(user.role, permissionKeyForNavItem(item)))
      .map(item => ({ ...item, section: group.group })))
    const reports = canViewModule(user.role, 'reports')
      ? REPORT_NAV_ITEMS.map(item => ({ ...item, section: item.section ?? '' }))
      : []
    const merged = [...items, ...reports]
    if (!q) return merged.slice(0, 12)
    return merged.filter(item => [item.label, item.hint, item.key, item.route, item.section ?? ''].some(value => value.toLocaleLowerCase('ar-EG').includes(q))).slice(0, 12)
  }, [user.role, user.isPlatformOwner, q])

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenGroup(null)
        setPopover(null)
      }
    }
    const keydown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpenGroup(null)
        setPopover(current => current === 'search' ? null : 'search')
      }
      if (event.key === 'Escape') {
        setOpenGroup(null)
        setPopover(null)
        setMobileOpen(false)
      }
    }
    window.addEventListener('mousedown', close)
    window.addEventListener('keydown', keydown)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', keydown)
    }
  }, [])

  useEffect(() => {
    if (popover !== 'search') setQuery('')
  }, [popover])
  useEffect(() => {
    if (!mobileOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [mobileOpen])


  const navigate = (next: string) => {
    setOpenGroup(null)
    setPopover(null)
    setMobileOpen(false)
    setQuery('')
    onRoute(next)
  }

  const HomeIcon = iconFor('LayoutDashboard', LayoutDashboard)

  return <>
    {mobileOpen && <button className="mobile-nav-scrim" onClick={() => setMobileOpen(false)} aria-label="إغلاق القائمة" />}
    <header className="site-navbar" ref={navRef}>
      <div className="navbar-brand navbar-context kemex-navbar-brand" onClick={() => navigate('dashboard')} role="button" tabIndex={0} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate('dashboard') } }} aria-label="العودة إلى لوحة المعلومات">
        <KemexBrand compact />
      </div>

      <nav className="desktop-nav" aria-label="التنقل الرئيسي">
        <button type="button" className={`nav-direct ${routeModule === 'dashboard' ? 'active' : ''}`} onClick={() => navigate('dashboard')}>
          {HomeIcon && <HomeIcon size={15} />}<span>الرئيسية</span>
        </button>
        <button type="button" className={`nav-direct ${routeModule === 'reports' ? 'active' : ''}`} onClick={() => navigate('reports')}>
          <BarChart3 size={15} /><span>التقارير والتحليلات</span>
        </button>
        {groups.map(group => {
          const GroupIcon = iconFor(group.icon)
          const active = currentGroup === group.group
          const isOpen = openGroup === group.group
          return <div className="nav-dropdown" key={group.group}>
            <button type="button" className={`nav-group-trigger ${active ? 'active' : ''}`} aria-haspopup="menu" aria-expanded={isOpen} onClick={() => { setPopover(null); setOpenGroup(isOpen ? null : group.group) }}>
              {GroupIcon && <GroupIcon size={15} />}<span>{group.group}</span><ChevronDown size={14} className={isOpen ? 'rotate' : ''} />
            </button>
            {isOpen && <div className="nav-menu-panel nav-domain-panel">
              {renderDomainMenu(group.items, routeModule, navigate)}
            </div>}
          </div>
        })}
      </nav>

      <div className="navbar-actions">
        <div className="shell-control shell-search-control">
          <button type="button" className={`navbar-search-btn ${popover === 'search' ? 'active' : ''}`} onClick={() => { setOpenGroup(null); setPopover(current => current === 'search' ? null : 'search') }} aria-label="البحث في النظام" aria-expanded={popover === 'search'}>
            <Search size={17} /><span>بحث</span><kbd>Ctrl K</kbd>
          </button>
          {popover === 'search' && <GlobalSearchPanel query={query} results={searchResults.map(item => ({ key: item.key, label: item.label, hint: item.hint, route: item.route, section: item.section, icon: iconFor(item.icon) }))} onQueryChange={setQuery} onNavigate={navigate} onClose={() => setPopover(null)} />}
        </div>
        <div className="shell-control">
          <button type="button" className={`navbar-icon-btn ${popover === 'notifications' ? 'active' : ''}`} onClick={() => { setOpenGroup(null); setPopover(current => current === 'notifications' ? null : 'notifications') }} title="التنبيهات" aria-label={`التنبيهات${alertCount > 0 ? `، ${alertCount} تنبيه` : ''}`} aria-expanded={popover === 'notifications'}>
            <Bell size={18} />{alertCount > 0 && <span>{alertCount > 9 ? '9+' : alertCount}</span>}
          </button>
          {popover === 'notifications' && <NotificationPopover notifications={notifications} unreadCount={notificationUnreadCount} loading={notificationsLoading} onRefresh={onRefreshNotifications} onMarkRead={onMarkNotificationRead} onMarkAllRead={onMarkAllRead} onOpenAlerts={() => navigate('alerts')} />}
        </div>
        <div className="shell-control shell-user-control">
          <button type="button" className={`navbar-user ${popover === 'user' ? 'active' : ''}`} onClick={() => { setOpenGroup(null); setPopover(current => current === 'user' ? null : 'user') }} aria-label="فتح قائمة المستخدم" aria-expanded={popover === 'user'}>
            <div className="avatar">{user.name?.slice(0, 1) ?? 'م'}</div>
            <div className="navbar-user-copy"><strong>{user.name}</strong><small>{ROLE_LABELS[user.role as Role]}</small></div>
            <ChevronDown size={14} className={popover === 'user' ? 'rotate' : ''} />
          </button>
          {popover === 'user' && <UserMenu user={user} onChangePassword={() => navigate('change-password')} onLogout={onLogout} />}
        </div>
        <button type="button" className="navbar-logout navbar-logout-desktop" onClick={onLogout}><LogOut size={15} /> خروج</button>
        <button type="button" className="navbar-menu-btn" onClick={() => { setPopover(null); setMobileOpen(value => !value) }} aria-label="فتح قائمة النظام" aria-expanded={mobileOpen}>{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>
      </div>

    </header>
    {mobileOpen && <MobileNavigation groups={groups} route={route} query={query} onQueryChange={setQuery} onNavigate={navigate} user={user} onLogout={onLogout} onClose={() => setMobileOpen(false)} />}
    <MobileTabBar routeModule={routeModule} onNavigate={navigate} onOpenMore={() => { setMobileOpen(value => !value) }} moreOpen={mobileOpen} alertCount={notificationUnreadCount || alertCount} notificationUnreadCount={notificationUnreadCount} />
  </>
}

function MobileTabBar({ routeModule, onNavigate, onOpenMore, moreOpen, alertCount, notificationUnreadCount }: {
  routeModule: string
  onNavigate: (route: string) => void
  onOpenMore: () => void
  moreOpen: boolean
  alertCount: number
  notificationUnreadCount: number
}) {
  const tabs: { key: string; label: string; icon: LucideIcon; route: string }[] = [
    { key: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard, route: 'dashboard' },
    { key: 'operations', label: 'العمليات', icon: Gauge, route: 'operations' },
    { key: 'assets', label: 'الأسطول', icon: Truck, route: 'assets' },
    { key: 'maintenance', label: 'الصيانة', icon: Wrench, route: 'maintenance' },
  ]
  return <nav className="mobile-tab-bar" aria-label="التنقل السريع">
    {tabs.map(tab => {
      const Icon = tab.icon
      const active = !moreOpen && (
        tab.key === 'dashboard'
          ? routeModule === 'dashboard'
          : tab.key === 'operations'
            ? ['operations', 'trips', 'trips-dispatch', 'requests', 'assignments', 'projects'].includes(routeModule)
            : tab.key === 'assets'
              ? ['assets', 'drivers', 'contracts'].includes(routeModule)
              : tab.key === 'maintenance'
                ? ['maintenance', 'breakdowns', 'plans', 'oils', 'tires'].includes(routeModule)
                : routeModule === tab.key
      )
      return <button key={tab.key} type="button" className={`mobile-tab-item ${active ? 'active' : ''}`} onClick={() => onNavigate(tab.route)}>
        <Icon size={20} /><span>{tab.label}</span>
      </button>
    })}
    <button type="button" className={`mobile-tab-item ${moreOpen ? 'active' : ''}`} onClick={onOpenMore} aria-expanded={moreOpen}>
      <span className="mobile-tab-more-icon"><MoreHorizontal size={20} />{(notificationUnreadCount || alertCount) > 0 && !moreOpen && <span className="mobile-tab-dot" />}</span>
      <span>المزيد</span>
    </button>
  </nav>
}

function MobileNavigation({ groups, route, query, onQueryChange, onNavigate, user, onLogout, onClose }: {
  groups: readonly NavigationGroup[]
  route: string
  query: string
  onQueryChange: (value: string) => void
  onNavigate: (route: string) => void
  user: User
  onLogout: () => void
  onClose: () => void
}) {
  const routeModule = resolveRouteModule(route)
  const [openGroup, setOpenGroup] = useState<string | null>(findGroupForRoute(route))
  return <aside className="mobile-nav-panel" aria-label="قائمة النظام المحمولة">
    <div className="mobile-nav-panel-head">
      <div>
        <span>التنقل</span>
        <strong>قائمة النظام</strong>
      </div>
      <button type="button" className="mobile-nav-close" onClick={onClose} aria-label="إغلاق قائمة النظام"><X size={19} /></button>
    </div>
    <div className="mobile-account-row">
      <div className="mobile-account-identity"><div className="avatar">{user.name?.slice(0, 1) ?? 'م'}</div><div><strong>{user.name}</strong><small>{ROLE_LABELS[user.role as Role]}</small></div></div>
      <button type="button" className="mobile-logout-button" onClick={onLogout}><LogOut size={16} /> تسجيل الخروج</button>
    </div>
    <div className="mobile-nav-search"><Search size={16} /><input value={query} onChange={event => onQueryChange(event.target.value)} placeholder="بحث في وحدات النظام..." aria-label="بحث في وحدات النظام" /></div>
    <button type="button" className={`mobile-group-title ${routeModule === 'reports' ? 'open' : ''}`} onClick={() => onNavigate('reports')}><span>التقارير والتحليلات</span><BarChart3 size={15} /></button>
    {/* الوجهات الأساسية تظهر في الشريط السفلي؛ أما التفاصيل والساحات الفرعية فتظل متاحة من "المزيد". */}
    {query.trim() && <button type="button" className={`mobile-group-title ${routeModule === 'dashboard' ? 'open' : ''}`} onClick={() => onNavigate('dashboard')}><span>الرئيسية</span><LayoutDashboard size={15} /></button>}
    {groups.filter(group => query.trim() || !PRIMARY_TAB_GROUPS.has(group.group)).map(group => <section className="mobile-nav-group" key={group.group}>
      <button type="button" className={`mobile-group-title ${openGroup === group.group ? 'open' : ''}`} onClick={() => setOpenGroup(openGroup === group.group ? null : group.group)}><span>{group.group}</span><ChevronDown size={15} className={openGroup === group.group ? 'rotate' : ''} /></button>
      {openGroup === group.group && <div className="mobile-group-items">
        {group.group === 'التقارير والتحليلات'
          ? renderMobileReports(group.items as unknown as readonly ReportNavigationItem[], route, onNavigate)
          : <div className="mobile-nav-section"><div className="mobile-nav-section-title">الوحدات</div>{group.items.map(item => { const Icon = iconFor(item.icon); const active = routeModule === item.key; return <button type="button" key={item.key} className={`mobile-nav-item ${active ? 'active' : ''}`} onClick={() => onNavigate(item.route)}>{Icon && <Icon size={16} />}<span>{item.label}</span></button> })}</div>}
      </div>}
    </section>)}
  </aside>
}

function renderDomainMenu(items: readonly NavigationItem[], routeModule: string, navigate: (route: string) => void) {
  return <div className="nav-menu-section"><div className="nav-menu-section-title">الوحدات</div><div className="nav-menu-section-grid">{items.map(item => { const Icon = iconFor(item.icon); const active = routeModule === item.key || (item.key === 'trips' && routeModule === 'trips'); return <button type="button" key={item.key} className={`nav-menu-item ${active ? 'active' : ''}`} onClick={() => navigate(item.route)}><span className="nav-menu-icon">{Icon && <Icon size={16} />}</span><span><strong>{item.label}</strong></span></button> })}</div></div>
}

function renderReportMenu(items: readonly ReportNavigationItem[], route: string, navigate: (route: string) => void) {
  return <>{Array.from(new Set(items.map(x => x.section))).map(section => <div className="nav-menu-section" key={section}><div className="nav-menu-section-title">{section}</div><div className="nav-menu-section-grid">{items.filter(x => x.section === section).map(item => { const Icon = iconFor(item.icon, BarChart3); const active = route === item.route || (item.key === 'true-cost' && route === 'true-cost'); return <button type="button" key={item.key} className={`nav-menu-item ${active ? 'active' : ''}`} onClick={() => navigate(item.route)}><span className="nav-menu-icon">{Icon && <Icon size={16} />}</span><span><strong>{item.label}</strong></span></button> })}</div></div>)}</>
}

function renderMobileReports(items: readonly ReportNavigationItem[], route: string, navigate: (route: string) => void) {
  return Array.from(new Set(items.map(x => x.section))).map(section => <div className="mobile-nav-section" key={section}><div className="mobile-nav-section-title">{section}</div>{items.filter(x => x.section === section).map(item => { const active = route === item.route || (item.key === 'true-cost' && route === 'true-cost'); return <button type="button" key={item.key} className={`mobile-nav-item ${active ? 'active' : ''}`} onClick={() => navigate(item.route)}><BarChart3 size={16} /><span>{item.label}</span></button> })}</div>)
}

function matchesQuery(item: NavigationItem | ReportNavigationItem, q: string) {
  if (!q) return true
  const values = [item.label, item.hint, item.key, item.route, 'section' in item ? item.section ?? '' : ''] as const
  return values.some(value => value.toLocaleLowerCase('ar-EG').includes(q))
}

function permissionKeyForNavItem(item: NavigationItem) { return item.permissionModule ?? item.key }

function findGroupForRoute(route: string) {
  if (route === 'dashboard') return 'الرئيسية'
  if (route === 'alerts') return null
  if (route.startsWith('reports/') || route === 'true-cost' || route === 'reports/true-cost') return 'التقارير والتحليلات'
  for (const group of NAVIGATION_GROUPS) if (group.items.some(item => item.route === route || item.key === route)) return group.group
  if (route.startsWith('asset/') || route.startsWith('assets/edit/')) return 'الأسطول والأصول'
  if (route.startsWith('project/')) return 'العمليات واللوجستيات'
  if (route.startsWith('breakdowns/')) return 'الصيانة'
  if (route.startsWith('trips/')) return 'العمليات واللوجستيات'
  if (route === 'movements') return 'المخازن والتوريد'
  if (route.startsWith('assignments/new/')) return 'العمليات واللوجستيات'
  return null
}

function resolveRouteModule(route: string) {
  if (route === 'dashboard') return 'dashboard'
  if (route.startsWith('asset/') || route.startsWith('assets/edit/')) return 'assets'
  if (route.startsWith('project/')) return 'projects'
  if (route.startsWith('breakdowns/')) return 'breakdowns'
  if (route.startsWith('trips/')) return 'trips'
  if (route.startsWith('assignments/new/')) return 'assignments'
  if (route.startsWith('reports/') || route === 'true-cost' || route === 'reports/true-cost') return 'reports'
  if (route === 'movements') return 'inventory'
  return route
}
