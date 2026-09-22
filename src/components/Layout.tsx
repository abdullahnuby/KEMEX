import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { BarChart3, Bell, ChevronDown, LayoutDashboard, LogOut, Menu, Search, Truck, X, type LucideIcon } from 'lucide-react'
import { APP, NAVIGATION_GROUPS, REPORT_NAV_ITEMS, ROLE_LABELS, canViewModule, type NavigationGroup, type NavigationItem } from '../config/app'
import type { Role, User } from '../types/tfms'

const ICONS: Record<string, LucideIcon> = {}
export function registerModuleIcons(icons: Record<string, LucideIcon>) { Object.assign(ICONS, icons) }

const GROUP_ICONS: Record<string, LucideIcon> = {}

function iconFor(name: string, fallback?: LucideIcon) {
  return ICONS[name] ?? fallback
}

export function Layout({ user, route, onRoute, onLogout, children, alertCount }: {
  user: User; route: string; onRoute: (route:string)=>void; onLogout:()=>void; children:ReactNode; alertCount:number
}) {
  const [mobileOpen,setMobileOpen]=useState(false)
  const [openGroup,setOpenGroup]=useState<string|null>(null)
  const [query,setQuery]=useState('')
  const navRef=useRef<HTMLDivElement>(null)

  const routeModule = resolveRouteModule(route)
  const currentGroup = useMemo(() => findGroupForRoute(route), [route])
  const q = query.trim().toLocaleLowerCase('ar-EG')

  const groups = useMemo(() => {
    const canSee = (item: NavigationItem) => canViewModule(user.role, permissionKeyForNavItem(item))
    const base = NAVIGATION_GROUPS.map(group => ({
      ...group,
      items: group.group === 'التقارير'
        ? REPORT_NAV_ITEMS.filter(item => canViewModule(user.role, 'reports') && (!q || item.label.includes(query.trim()) || item.hint.includes(query.trim())))
        : group.items.filter(item => canSee(item) && (!q || item.label.includes(query.trim()) || item.hint.includes(query.trim()) || item.key.includes(q))),
    })).filter(group => group.items.length)
    return base
  }, [user.role, q, query])

  useEffect(()=>{
    const close=(event:MouseEvent)=>{if(navRef.current&&!navRef.current.contains(event.target as Node))setOpenGroup(null)}
    window.addEventListener('mousedown',close)
    return()=>window.removeEventListener('mousedown',close)
  },[])

  const navigate=(next:string)=>{setOpenGroup(null);setMobileOpen(false);onRoute(next)}
  const homeIcon = iconFor('LayoutDashboard', LayoutDashboard)

  return <div className="app-shell">
    {mobileOpen&&<button className="mobile-nav-scrim" onClick={()=>setMobileOpen(false)} aria-label="إغلاق القائمة"/>}
    <main className="main-shell">
      <header className="site-navbar" ref={navRef}>
        <div className="navbar-brand navbar-context" onClick={()=>navigate('dashboard')} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter')navigate('dashboard')}} aria-label="العودة إلى لوحة المعلومات">
          <div className="brand-mark"><Truck size={18} strokeWidth={2.3}/></div>
          <div className="navbar-context-copy"><strong>{APP.name}</strong><span>إدارة النقل والأسطول والمعدات</span></div>
        </div>

        <nav className="desktop-nav" aria-label="التنقل الرئيسي">
          <button className={`nav-direct ${routeModule==='dashboard'?'active':''}`} onClick={()=>navigate('dashboard')}>
            {homeIcon&&<homeIcon size={15}/>}<span>الرئيسية</span>
          </button>

          {groups.map(group=>{
            const GroupIcon = iconFor(group.icon)
            const active=currentGroup===group.group
            const isOpen=openGroup===group.group
            const isReports=group.group==='التقارير'
            return <div className="nav-dropdown" key={group.group}>
              <button className={`nav-group-trigger ${active?'active':''}`} aria-expanded={isOpen} onClick={()=>setOpenGroup(isOpen?null:group.group)}>
                {GroupIcon&&<GroupIcon size={15}/>}<span>{group.group}</span><ChevronDown size={14} className={isOpen?'rotate':''}/>
              </button>
              {isOpen&&<div className={`nav-menu-panel ${isReports?'nav-reports-panel':'nav-domain-panel'}`}>
                {isReports
                  ? renderReportMenu(group.items as readonly typeof REPORT_NAV_ITEMS[number][], route, navigate)
                  : renderDomainMenu(group.items, routeModule, navigate)}
              </div>}
            </div>
          })}
        </nav>

        <div className="navbar-actions">
          <button className="navbar-icon-btn" onClick={()=>navigate('alerts')} title="التنبيهات" aria-label={`التنبيهات${alertCount>0?`، ${alertCount} تنبيه`:''}`}><Bell size={18}/>{alertCount>0&&<span>{alertCount>9?'9+':alertCount}</span>}</button>
          <div className="navbar-user"><div className="avatar">{user.name?.slice(0,1)??'م'}</div><div className="navbar-user-copy"><strong>{user.name}</strong><small>{ROLE_LABELS[user.role as Role]}</small></div></div>
          <button className="navbar-logout" onClick={onLogout}><LogOut size={15}/> خروج</button>
          <button className="navbar-menu-btn" onClick={()=>setMobileOpen(v=>!v)} aria-label="فتح قائمة النظام" aria-expanded={mobileOpen}>{mobileOpen?<X size={20}/>:<Menu size={20}/>}</button>
        </div>

        {mobileOpen&&<div className="mobile-nav-panel">
          <div className="mobile-account-row">
            <div className="mobile-account-identity"><div className="avatar">{user.name?.slice(0,1)??'م'}</div><div><strong>{user.name}</strong><small>{ROLE_LABELS[user.role as Role]}</small></div></div>
            <button className="mobile-logout-button" onClick={()=>{setMobileOpen(false);onLogout()}}><LogOut size={16}/> تسجيل الخروج</button>
          </div>
          <div className="mobile-nav-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="بحث في أقسام النظام..."/></div>
          <button className={`mobile-group-title ${routeModule==='dashboard'?'open':''}`} onClick={()=>navigate('dashboard')}><span>الرئيسية</span><LayoutDashboard size={15}/></button>
          {groups.map(group=><MobileGroup key={group.group} group={group} route={route} onNavigate={navigate}/>)}
        </div>}
      </header>
      <div className="page-body">{children}</div>
    </main>
  </div>
}

function renderDomainMenu(items:readonly NavigationItem[], routeModule:string, navigate:(route:string)=>void) {
  return <div className="nav-menu-section">
    <div className="nav-menu-section-title">الوحدات</div>
    <div className="nav-menu-section-grid">
      {items.map(item=>{
        const Icon=iconFor(item.icon)
        const active=routeModule===item.key || (item.key==='trips' && routeModule==='trips')
        return <button key={item.key} className={`nav-menu-item ${active?'active':''}`} onClick={()=>navigate(item.route)}>
          <span className="nav-menu-icon">{Icon&&<Icon size={16}/>}</span>
          <span><strong>{item.label}</strong><small>{item.hint}</small></span>
        </button>
      })}
    </div>
  </div>
}

function renderReportMenu(items:readonly typeof REPORT_NAV_ITEMS[number][], route:string, navigate:(route:string)=>void) {
  const sections = Array.from(new Set(items.map(x=>x.section)))
  return <>
    {sections.map(section=><div className="nav-menu-section" key={section}>
      <div className="nav-menu-section-title">{section}</div>
      <div className="nav-menu-section-grid">
        {items.filter(x=>x.section===section).map(item=>{
          const Icon=iconFor(item.icon, BarChart3)
          const active=route===item.route || (item.key==='true-cost'&&route==='true-cost')
          return <button key={item.key} className={`nav-menu-item ${active?'active':''}`} onClick={()=>navigate(item.route)}>
            <span className="nav-menu-icon">{Icon&&<Icon size={16}/>}</span>
            <span><strong>{item.label}</strong><small>{item.hint}</small></span>
          </button>
        })}
      </div>
    </div>)}
  </>
}

function MobileGroup({group,route,onNavigate}:{group:NavigationGroup;route:string;onNavigate:(route:string)=>void}){
  const routeModule = resolveRouteModule(route)
  const [open,setOpen]=useState(false)
  const isReports=group.group==='التقارير'
  return <section className="mobile-nav-group">
    <button className={`mobile-group-title ${open?'open':''}`} onClick={()=>setOpen(v=>!v)}>
      <span>{group.group}</span><ChevronDown size={15} className={open?'rotate':''}/>
    </button>
    {open&&<div className="mobile-group-items">
      {isReports
        ? renderMobileReports(group.items as readonly typeof REPORT_NAV_ITEMS[number][], route, onNavigate)
        : <div className="mobile-nav-section"><div className="mobile-nav-section-title">الوحدات</div>{group.items.map(item=>{const Icon=iconFor(item.icon);const active=routeModule===item.key;return <button key={item.key} className={`mobile-nav-item ${active?'active':''}`} onClick={()=>onNavigate(item.route)}>{Icon&&<Icon size={16}/>}<span>{item.label}</span></button>})}</div>}
    </div>}
  </section>
}

function renderMobileReports(items:readonly typeof REPORT_NAV_ITEMS[number][], route:string, navigate:(route:string)=>void){
  return Array.from(new Set(items.map(x=>x.section))).map(section=><div className="mobile-nav-section" key={section}>
    <div className="mobile-nav-section-title">{section}</div>
    {items.filter(x=>x.section===section).map(item=>{const active=route===item.route || (item.key==='true-cost'&&route==='true-cost');return <button key={item.key} className={`mobile-nav-item ${active?'active':''}`} onClick={()=>navigate(item.route)}><BarChart3 size={16}/><span>{item.label}</span></button>})}
  </div>)
}

function permissionKeyForNavItem(item:NavigationItem){
  if(item.key==='trips-dispatch') return 'trips'
  return item.key
}

function findGroupForRoute(route:string){
  if(route==='dashboard') return 'الرئيسية'
  if(route==='alerts') return null
  if(route.startsWith('reports/') || route==='true-cost' || route==='reports/true-cost') return 'التقارير'
  for(const group of NAVIGATION_GROUPS){
    if(group.items.some(item=>item.route===route || item.key===route)) return group.group
  }
  if(route.startsWith('asset/') || route.startsWith('assets/edit/')) return 'الأسطول'
  if(route.startsWith('project/')) return 'التشغيل'
  if(route.startsWith('breakdowns/')) return 'الصيانة'
  if(route.startsWith('trips/')) return 'النقل'
  if(route==='movements') return 'المخازن'
  if(route==='assignments/new') return 'التشغيل'
  return null
}

function resolveRouteModule(route:string){
  if(route==='dashboard') return 'dashboard'
  if(route.startsWith('asset/') || route.startsWith('assets/edit/')) return 'assets'
  if(route.startsWith('project/')) return 'projects'
  if(route.startsWith('breakdowns/')) return 'breakdowns'
  if(route.startsWith('trips/')) return 'trips'
  if(route.startsWith('assignments/new/')) return 'assignments'
  if(route.startsWith('reports/') || route==='true-cost' || route==='reports/true-cost') return 'reports'
  if(route==='movements') return 'inventory'
  return route
}
