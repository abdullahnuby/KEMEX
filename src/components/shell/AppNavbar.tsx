import { useEffect, useMemo, useRef, useState } from 'react'
import { BarChart3, Bell, ChevronDown, LayoutDashboard, LogOut, Menu, Search, Truck, X, type LucideIcon } from 'lucide-react'
import { APP, NAVIGATION_GROUPS, REPORT_NAV_ITEMS, ROLE_LABELS, canViewModule, type NavigationGroup, type NavigationItem, type ReportNavigationItem } from '../../config/app'
import type { Role, User } from '../../types/tfms'
import { GlobalSearchPanel, NotificationPopover, UserMenu } from './ShellPopovers'

const ICONS: Record<string, LucideIcon> = {}
export function registerModuleIcons(icons: Record<string, LucideIcon>) { Object.assign(ICONS, icons) }
function iconFor(name: string, fallback?: LucideIcon) { return ICONS[name] ?? fallback }

export function AppNavbar({ user, route, onRoute, onLogout, alertCount }: {
  user: User
  route: string
  onRoute: (route: string) => void
  onLogout: () => void
  alertCount: number
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
    const canSee = (item: NavigationItem) => canViewModule(user.role, permissionKeyForNavItem(item))
    return NAVIGATION_GROUPS.map(group => ({
      ...group,
      items: group.group === 'التقارير'
        ? REPORT_NAV_ITEMS.filter(item => canViewModule(user.role, 'reports') && matchesQuery(item, q))
        : group.items.filter(item => canSee(item) && matchesQuery(item, q)),
    })).filter(group => group.items.length)
  }, [user.role, q])

  const searchResults = useMemo(() => {
    const items = NAVIGATION_GROUPS.flatMap(group => group.items
      .filter(item => canViewModule(user.role, permissionKeyForNavItem(item)))
      .map(item => ({ ...item, section: group.group })))
    const reports = canViewModule(user.role, 'reports')
      ? REPORT_NAV_ITEMS.map(item => ({ ...item, section: item.section ?? '' }))
      : []
    const merged = [...items, ...reports]
    if (!q) return merged.slice(0, 12)
    return merged.filter(item => [item.label, item.hint, item.key, item.route, item.section ?? ''].some(value => value.toLocaleLowerCase('ar-EG').includes(q))).slice(0, 12)
  }, [user.role, q])

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
      <div className="navbar-brand navbar-context" onClick={() => navigate('dashboard')} role="button" tabIndex={0} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate('dashboard') } }} aria-label="العودة إلى لوحة المعلومات">
        <div className="brand-mark"><Truck size={19} strokeWidth={2.3} /></div>
        <div className="navbar-context-copy"><strong>{APP.name}</strong><span>{APP.arabicName}</span></div>
      </div>

      <nav className="desktop-nav" aria-label="التنقل الرئيسي">
        <button type="button" className={`nav-direct ${routeModule === 'dashboard' ? 'active' : ''}`} onClick={() => navigate('dashboard')}>
          {HomeIcon && <HomeIcon size={15} />}<span>الرئيسية</span>
        </button>
        {groups.map(group => {
          const GroupIcon = iconFor(group.icon)
          const active = currentGroup === group.group
          const isOpen = openGroup === group.group
          const isReports = group.group === 'التقارير'
          return <div className="nav-dropdown" key={group.group}>
            <button type="button" className={`nav-group-trigger ${active ? 'active' : ''}`} aria-haspopup="menu" aria-expanded={isOpen} onClick={() => { setPopover(null); setOpenGroup(isOpen ? null : group.group) }}>
              {GroupIcon && <GroupIcon size={15} />}<span>{group.group}</span><ChevronDown size={14} className={isOpen ? 'rotate' : ''} />
            </button>
            {isOpen && <div className={`nav-menu-panel ${isReports ? 'nav-reports-panel' : 'nav-domain-panel'}`}>
              {isReports ? renderReportMenu(group.items as unknown as readonly ReportNavigationItem[], route, navigate) : renderDomainMenu(group.items, routeModule, navigate)}
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
          {popover === 'notifications' && <NotificationPopover alertCount={alertCount} onOpenAlerts={() => navigate('alerts')} />}
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

      {mobileOpen && <MobileNavigation groups={groups} route={route} query={query} onQueryChange={setQuery} onNavigate={navigate} user={user} onLogout={onLogout} />}
    </header>
  </>
}

function MobileNavigation({ groups, route, query, onQueryChange, onNavigate, user, onLogout }: {
  groups: readonly NavigationGroup[]
  route: string
  query: string
  onQueryChange: (value: string) => void
  onNavigate: (route: string) => void
  user: User
  onLogout: () => void
}) {
  const routeModule = resolveRouteModule(route)
  const [openGroup, setOpenGroup] = useState<string | null>(findGroupForRoute(route))
  return <div className="mobile-nav-panel">
    <div className="mobile-account-row">
      <div className="mobile-account-identity"><div className="avatar">{user.name?.slice(0, 1) ?? 'م'}</div><div><strong>{user.name}</strong><small>{ROLE_LABELS[user.role as Role]}</small></div></div>
      <button type="button" className="mobile-logout-button" onClick={onLogout}><LogOut size={16} /> تسجيل الخروج</button>
    </div>
    <div className="mobile-nav-search"><Search size={16} /><input value={query} onChange={event => onQueryChange(event.target.value)} placeholder="بحث في وحدات النظام..." aria-label="بحث في وحدات النظام" /></div>
    <button type="button" className={`mobile-group-title ${routeModule === 'dashboard' ? 'open' : ''}`} onClick={() => onNavigate('dashboard')}><span>الرئيسية</span><LayoutDashboard size={15} /></button>
    {groups.map(group => <section className="mobile-nav-group" key={group.group}>
      <button type="button" className={`mobile-group-title ${openGroup === group.group ? 'open' : ''}`} onClick={() => setOpenGroup(openGroup === group.group ? null : group.group)}><span>{group.group}</span><ChevronDown size={15} className={openGroup === group.group ? 'rotate' : ''} /></button>
      {openGroup === group.group && <div className="mobile-group-items">
        {group.group === 'التقارير'
          ? renderMobileReports(group.items as unknown as readonly ReportNavigationItem[], route, onNavigate)
          : <div className="mobile-nav-section"><div className="mobile-nav-section-title">الوحدات</div>{group.items.map(item => { const Icon = iconFor(item.icon); const active = routeModule === item.key; return <button type="button" key={item.key} className={`mobile-nav-item ${active ? 'active' : ''}`} onClick={() => onNavigate(item.route)}>{Icon && <Icon size={16} />}<span>{item.label}</span></button> })}</div>}
      </div>}
    </section>)}
  </div>
}

function renderDomainMenu(items: readonly NavigationItem[], routeModule: string, navigate: (route: string) => void) {
  return <div className="nav-menu-section"><div className="nav-menu-section-title">الوحدات</div><div className="nav-menu-section-grid">{items.map(item => { const Icon = iconFor(item.icon); const active = routeModule === item.key || (item.key === 'trips' && routeModule === 'trips'); return <button type="button" key={item.key} className={`nav-menu-item ${active ? 'active' : ''}`} onClick={() => navigate(item.route)}><span className="nav-menu-icon">{Icon && <Icon size={16} />}</span><span><strong>{item.label}</strong><small>{item.hint}</small></span></button> })}</div></div>
}

function renderReportMenu(items: readonly ReportNavigationItem[], route: string, navigate: (route: string) => void) {
  return <>{Array.from(new Set(items.map(x => x.section))).map(section => <div className="nav-menu-section" key={section}><div className="nav-menu-section-title">{section}</div><div className="nav-menu-section-grid">{items.filter(x => x.section === section).map(item => { const Icon = iconFor(item.icon, BarChart3); const active = route === item.route || (item.key === 'true-cost' && route === 'true-cost'); return <button type="button" key={item.key} className={`nav-menu-item ${active ? 'active' : ''}`} onClick={() => navigate(item.route)}><span className="nav-menu-icon">{Icon && <Icon size={16} />}</span><span><strong>{item.label}</strong><small>{item.hint}</small></span></button> })}</div></div>)}</>
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
  if (route.startsWith('reports/') || route === 'true-cost' || route === 'reports/true-cost') return 'التقارير'
  for (const group of NAVIGATION_GROUPS) if (group.items.some(item => item.route === route || item.key === route)) return group.group
  if (route.startsWith('asset/') || route.startsWith('assets/edit/')) return 'الأسطول'
  if (route.startsWith('project/')) return 'التشغيل'
  if (route.startsWith('breakdowns/')) return 'الصيانة'
  if (route.startsWith('trips/')) return 'النقل'
  if (route === 'movements') return 'المخازن'
  if (route.startsWith('assignments/new/')) return 'التشغيل'
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
