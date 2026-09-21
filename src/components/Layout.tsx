import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { BarChart3, Bell, ChevronDown, Database, FileCog, LayoutDashboard, LogOut, Menu, Search, Settings2, ShieldCheck, Truck, WalletCards, Wrench, X, type LucideIcon } from 'lucide-react'
import { APP, MODULES, ROLE_LABELS, canViewModule } from '../config/app'
import type { Role, User } from '../types/tfms'

const ICONS: Record<string, LucideIcon> = {}
export function registerModuleIcons(icons: Record<string, LucideIcon>) { Object.assign(ICONS, icons) }

const GROUP_ICONS: Record<string, LucideIcon> = {
  'البيانات الأساسية': Database,
  'التشغيل': Wrench,
  'الصيانة والمواد': FileCog,
  'المالية': WalletCards,
  'التقارير والإدارة': BarChart3,
  'المستخدمون والإعدادات': ShieldCheck,
  'الرئيسية': LayoutDashboard,
}

type NavGroup = { group:string; items:readonly typeof MODULES[number][] }

export function Layout({ user, route, onRoute, onLogout, children, alertCount }: {
  user: User; route: string; onRoute: (route:string)=>void; onLogout:()=>void; children:ReactNode; alertCount:number
}) {
  const [mobileOpen,setMobileOpen]=useState(false)
  const [openGroup,setOpenGroup]=useState<string|null>(null)
  const [query,setQuery]=useState('')
  const navRef=useRef<HTMLDivElement>(null)

  const groups=useMemo<NavGroup[]>(()=>{
    const filtered=MODULES.filter(m=>canViewModule(user.role,m.key)).filter(m=>{
      const q=query.trim().toLowerCase(); return !q || m.label.includes(query.trim()) || m.key.toLowerCase().includes(q)
    })
    return Array.from(new Set(filtered.map(m=>m.group))).map(group=>({group,items:filtered.filter(m=>m.group===group)}))
  },[user.role,query])

  useEffect(()=>{
    const close=(event:MouseEvent)=>{if(navRef.current&&!navRef.current.contains(event.target as Node))setOpenGroup(null)}
    window.addEventListener('mousedown',close)
    return()=>window.removeEventListener('mousedown',close)
  },[])

  const activeGroup=MODULES.find(m=>m.key===route)?.group
  const navigate=(next:string)=>{setOpenGroup(null);setMobileOpen(false);onRoute(next)}
  const primary=(groups.find(g=>g.group==='الرئيسية')?.items??[]).filter(item=>item.key!=='alerts')
  const navGroups=groups.map(g=>g.group==='الرئيسية'?{...g,items:g.items.filter(item=>item.key!=='alerts')}:g).filter(g=>g.items.length)
  const dropdowns=navGroups.filter(g=>g.group!=='الرئيسية')

  return <div className="app-shell">
    {mobileOpen&&<button className="mobile-nav-scrim" onClick={()=>setMobileOpen(false)} aria-label="إغلاق القائمة"/>}
    <main className="main-shell">
      <header className="site-navbar" ref={navRef}>
        <div className="navbar-brand" onClick={()=>navigate('dashboard')} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter')navigate('dashboard')}}>
          <div className="brand-mark"><Truck size={21} strokeWidth={2.2}/></div>
          <div><strong>{APP.name}</strong><span>{APP.arabicName}</span></div>
        </div>

        <nav className="desktop-nav" aria-label="التنقل الرئيسي">
          {primary.map(item=>{const Icon=ICONS[item.icon]; const active=route===item.key||(route.startsWith('asset/')&&item.key==='assets'); return <button key={item.key} className={`nav-direct ${active?'active':''}`} onClick={()=>navigate(item.key)}>{Icon&&<Icon size={15}/>}<span>{item.label}</span></button>})}
          {dropdowns.map(group=>{
            const active=activeGroup===group.group
            const isOpen=openGroup===group.group
            const GroupIcon=GROUP_ICONS[group.group]
            return <div className="nav-dropdown" key={group.group}>
              <button className={`nav-group-trigger ${active?'active':''}`} aria-expanded={isOpen} onClick={()=>setOpenGroup(isOpen?null:group.group)}>{GroupIcon&&<GroupIcon size={15}/>}<span>{group.group}</span><ChevronDown size={14} className={isOpen?'rotate':''}/></button>
              {isOpen&&<div className="nav-menu-panel">
                {group.items.map(item=>{const Icon=ICONS[item.icon];const itemActive=route===item.key||(route.startsWith('asset/')&&item.key==='assets');return <button key={item.key} className={`nav-menu-item ${itemActive?'active':''}`} onClick={()=>navigate(item.key)}><span className="nav-menu-icon">{Icon&&<Icon size={16}/>}</span><span><strong>{item.label}</strong><small>{navHint(item.key)}</small></span>{item.key==='alerts'&&alertCount>0&&<em>{alertCount}</em>}</button>})}
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
          <div className="mobile-nav-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="بحث في أقسام النظام..."/></div>
          {navGroups.map(group=><MobileGroup key={group.group} group={group} route={route} alertCount={alertCount} onNavigate={navigate}/>) }
        </div>}
      </header>
      <div className="page-body">{children}</div>
    </main>
  </div>
}

function MobileGroup({group,route,alertCount,onNavigate}:{group:NavGroup;route:string;alertCount:number;onNavigate:(route:string)=>void}){
  const [open,setOpen]=useState(group.group==='الرئيسية')
  return <section className="mobile-nav-group">
    <button className={`mobile-group-title ${open?'open':''}`} onClick={()=>setOpen(v=>!v)}><span>{group.group}</span><ChevronDown size={15} className={open?'rotate':''}/></button>
    {open&&<div className="mobile-group-items">{group.items.map(item=>{const Icon=ICONS[item.icon];const active=route===item.key||(route.startsWith('asset/')&&item.key==='assets');return <button key={item.key} className={`mobile-nav-item ${active?'active':''}`} onClick={()=>onNavigate(item.key)}>{Icon&&<Icon size={16}/>}<span>{item.label}</span>{item.key==='alerts'&&alertCount>0&&<em>{alertCount}</em>}</button>})}</div>}
  </section>
}

function navHint(key:string){
  const hints:Record<string,string>={
    projects:'المشروعات والمواقع والتكليفات',assets:'الأصول والمركبات والمعدات',drivers:'السائقون والمشغلون والتراخيص',customers:'العملاء والخدمات الخارجية',
    plans:'برامج واستحقاقات الصيانة الوقائية',maintenance:'أوامر العمل والتنفيذ والتكلفة',oils:'الزيوت والفلاتر ودورات التغيير',tires:'الإطارات والتركيب والحركة',fuel:'حركات الوقود والاستهلاك',inventory:'الأصناف والأرصدة والحد الأدنى',movements:'دخول وصرف وتسويات المخزون',purchases:'طلبات الشراء وأوامر الشراء',
    requests:'احتياجات المعدات ومراجعة الطلبات',assignments:'تسليم واستلام وتخصيص الأصول',operations:'التشغيل اليومي والعدادات',trips:'رحلات النقل والمسافات',contracts:'عقود الإيجار وشروطها',
    costs:'التكلفة المباشرة والإهلاك التقديري',charging:'تحميل استخدام الأصول على المشروعات',invoices:'الفواتير والمستحقات ودورة الاعتماد',
    reports:'تقارير تشغيلية ومالية قابلة للتصفية',users:'المستخدمون والأدوار والصلاحيات',audit:'سجل العمليات الحساسة',settings:'بيانات المؤسسة والأسعار والتنبيهات',
  }
  return hints[key]??'إدارة هذه الوحدة داخل KEMEX'
}
