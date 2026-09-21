import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeftRight,
  Bell,
  Boxes,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  ChartColumn,
  ChartNoAxesCombined,
  CircleCheckBig,
  CircleDot,
  ClipboardCheck,
  ClipboardList,
  ClipboardPenLine,
  Coins,
  Container,
  Droplets,
  FileCheck2,
  Fuel,
  Gauge,
  LayoutDashboard,
  ReceiptText,
  Settings2,
  ShoppingCart,
  Truck,
  UserRound,
  Users,
  Wrench,
} from 'lucide-react'
import { Layout, registerModuleIcons } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { AssetsPage } from './pages/AssetsPage'
import { AssetDetailPage } from './pages/AssetDetailPage'
import { MaintenancePage } from './pages/MaintenancePage'
import { FuelPage } from './pages/FuelPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { ModulePlaceholderPage } from './pages/ModulePlaceholderPage'
import { AssignmentCreatePage } from './pages/AssignmentCreatePage'
import { ModuleRecordsPage } from './pages/ModuleRecordsPage'
import { InventoryPage } from './pages/InventoryPage'
import { PlansPage } from './pages/PlansPage'
import { OilsPage } from './pages/OilsPage'
import { TiresPage } from './pages/TiresPage'
import { PurchasesPage } from './pages/PurchasesPage'
import { AlertsPage } from './pages/AlertsPage'
import { ReportsPage } from './pages/ReportsPage'
import { UsersPage } from './pages/UsersPage'
import { SettingsPage } from './pages/SettingsPage'
import { CostsPage } from './pages/CostsPage'
import { ChargingPage } from './pages/ChargingPage'
import { InvoicesPage } from './pages/InvoicesPage'
import { CustomersPage } from './pages/CustomersPage'
import { AuditPage } from './pages/AuditPage'
import { GENERIC_MODULES } from './config/modules'
import { repository } from './services/repository'
import { canViewModule } from './config/app'
import type { Asset, FuelOperation, Operation, Project, User, WorkOrder } from './types/tfms'

registerModuleIcons({
  LayoutDashboard, Bell, ClipboardList, FileCheck2, Gauge, Truck, Building2, Container, UserRound,
  BriefcaseBusiness, CalendarClock, Wrench, Droplets, CircleDot, Fuel, Boxes, ArrowLeftRight,
  ShoppingCart, Coins, ChartColumn, ReceiptText, ChartNoAxesCombined, Users, ClipboardPenLine, Settings2,
})

const SESSION_KEY = 'tfms-web-user'
const TITLES: Record<string,string> = {
  dashboard:'لوحة المعلومات', alerts:'التنبيهات', assets:'الأصول والأسطول', maintenance:'أوامر العمل', fuel:'الوقود', projects:'المشروعات',
  requests:'طلبات المعدات', assignments:'التخصيصات', operations:'التشغيل اليومي', trips:'الرحلات', drivers:'السائقون والمشغلون', contracts:'عقود الإيجار', customers:'العملاء',
  plans:'خطط الصيانة', oils:'الزيوت والفلاتر', tires:'الإطارات', inventory:'المخازن وقطع الغيار', movements:'حركة المخزون', purchases:'المشتريات',
  costs:'التكاليف والإهلاك', charging:'التحميل الداخلي', invoices:'الفواتير والمستحقات', reports:'التقارير', users:'المستخدمون والصلاحيات', audit:'سجل التدقيق', settings:'الإعدادات',
}

export default function App() {
  const [user,setUser]=useState<User|null>(()=>safeParse(localStorage.getItem(SESSION_KEY)))
  const [route,setRoute]=useState(()=>location.hash.replace(/^#\//,'')||'dashboard')
  const [assets,setAssets]=useState<Asset[]>([])
  const [projects,setProjects]=useState<Project[]>([])
  const [workOrders,setWorkOrders]=useState<WorkOrder[]>([])
  const [fuelOps,setFuelOps]=useState<FuelOperation[]>([])
  const [loading,setLoading]=useState(true)
  const [sessionChecked,setSessionChecked]=useState(()=>!repository.isRemote())
  const [error,setError]=useState('')
  const [moduleData,setModuleData]=useState<Record<string,Record<string,unknown>[]>>({})
  const [systemSettings,setSystemSettings]=useState({alertDays:30,alertKm:1500,alertHours:80,vat:14,diesel:12.5,petrol:15.25})

  useEffect(()=>{
    // Remove the retired Demo database cache. KEMEX data now comes from Supabase only.
    localStorage.removeItem('tfms-web-demo-v1')
    if(!repository.isRemote()){setSessionChecked(true);return}
    let active=true
    repository.getCurrentUser().then(u=>{if(!active)return;if(u){setUser(u);localStorage.setItem(SESSION_KEY,JSON.stringify(u))}else{setUser(null);localStorage.removeItem(SESSION_KEY)};setSessionChecked(true)}).catch(err=>{if(active){setUser(null);localStorage.removeItem(SESSION_KEY);setError(err instanceof Error?`تعذر التحقق من جلسة المستخدم: ${err.message}`:'تعذر التحقق من جلسة المستخدم');setSessionChecked(true)}})
    return ()=>{active=false}
  },[])

  useEffect(()=>{
    if(user) repository.setAuditActor(user); else repository.clearAuditActor()
  },[user])

  useEffect(()=>{
    const syncRoute=()=>setRoute(location.hash.replace(/^#\//,'')||'dashboard'); window.addEventListener('hashchange',syncRoute);
    let alive=true
    async function load(){
      setLoading(true);setError('')
      const jobs = await Promise.allSettled([
        repository.listAssets(), repository.listProjects(), repository.listWorkOrders(), repository.listFuel(),
        ...GENERIC_MODULES.map(key => repository.listModuleRecords(key)),
        repository.listModuleRecords('oilChanges'),
        repository.listModuleRecords('tireOps'),
      ])
      if(!alive)return
      const labels = ['الأصول','المشروعات','أوامر الصيانة','الوقود',...GENERIC_MODULES.map(key => TITLES[key] ?? key),'سجل تغييرات الزيوت','سجل أعمال الإطارات']
      const failures: string[] = []
      const valueAt = <T,>(index:number, fallback:T):T => {
        const result=jobs[index]
        if(result.status==='fulfilled') return result.value as T
        failures.push(`${labels[index]}: ${result.reason instanceof Error ? result.reason.message : 'تعذر تحميل البيانات'}`)
        return fallback
      }
      setAssets(valueAt(0,[] as Asset[])); setProjects(valueAt(1,[] as Project[]));
      setWorkOrders(valueAt(2,[] as WorkOrder[])); setFuelOps(valueAt(3,[] as FuelOperation[]))
      const loadedModules:Record<string,Record<string,unknown>[]>={}
      GENERIC_MODULES.forEach((key,index)=>{loadedModules[key]=valueAt(index+4,[])})
      loadedModules.oilChanges=valueAt(4+GENERIC_MODULES.length,[])
      loadedModules.tireOps=valueAt(5+GENERIC_MODULES.length,[])
      setModuleData(loadedModules)
      try {
        const settings=await repository.getSettings()
        setSystemSettings({alertDays:Number(settings.alert_days??30),alertKm:Number(settings.alert_km??1500),alertHours:Number(settings.alert_hours??80),vat:Number(settings.vat??14),diesel:Number(settings.diesel??12.5),petrol:Number(settings.petrol??15.25)})
      } catch (settingsError) {
        failures.push(`الإعدادات: ${settingsError instanceof Error ? settingsError.message : 'تعذر تحميل الإعدادات'}`)
      }
      setError(failures.length ? `تعذر تحميل بعض البيانات؛ يمكنك متابعة استخدام الأجزاء المتاحة. ${failures.join(' | ')}` : '')
      setLoading(false)
    }
    load(); return ()=>{alive=false;window.removeEventListener('hashchange',syncRoute)}
  },[user])

  async function login(username:string,password:string){const u=await repository.signIn(username,password);repository.setAuditActor(u);setUser(u);localStorage.setItem(SESSION_KEY,JSON.stringify(u));location.hash='#/dashboard';setRoute('dashboard')}
  async function logout(){repository.clearAuditActor();await repository.signOut();localStorage.removeItem(SESSION_KEY);setUser(null)}
  function navigate(next:string){location.hash='#/'+next;setRoute(next)}

  function formatError(err:unknown){return err instanceof Error ? err.message : 'تعذر تنفيذ العملية. حاول مرة أخرى.'}

  async function saveProject(p:Project){
    try { await repository.saveProject(p); setError(''); setProjects(prev=>prev.some(x=>x.id===p.id)?prev.map(x=>x.id===p.id?p:x):[...prev,p]) }
    catch(err){ const message=formatError(err); setError(`تعذر حفظ المشروع: ${message}`); throw err }
  }

  async function saveAsset(a:Asset){
    const normalized=a.id.startsWith('NEW-')?{...a,id:`A-${Date.now()}`} : a
    try {
      await repository.saveAsset(normalized)
      setError('')
      setAssets(prev=>prev.some(x=>x.id===normalized.id)?prev.map(x=>x.id===normalized.id?normalized:x):[...prev,normalized])
    } catch(err){ const message=formatError(err); setError(`تعذر حفظ الأصل: ${message}`); throw err }
  }

  async function saveWorkOrder(w:WorkOrder){
    try { await repository.saveWorkOrder(w); setError(''); setWorkOrders(prev=>prev.some(x=>x.id===w.id)?prev.map(x=>x.id===w.id?w:x):[w,...prev]) }
    catch(err){ const message=formatError(err); setError(`تعذر حفظ أمر الصيانة: ${message}`); throw err }
  }

  async function saveFuelOperation(x:FuelOperation){
    try { await repository.saveFuelOperation(x); setError(''); setFuelOps(prev=>prev.some(v=>v.id===x.id)?prev.map(v=>v.id===x.id?x:v):[x,...prev]) }
    catch(err){ const message=formatError(err); setError(`تعذر حفظ حركة الوقود: ${message}`); throw err }
  }

  async function saveModule(module:string, record:Record<string,unknown>):Promise<void>{
    try {
      const saved=await repository.saveModuleRecord(module,record)
      setError('')
      setModuleData(prev=>({...prev,[module]:(prev[module]??[]).some(x=>x.id===saved.id)?(prev[module]??[]).map(x=>x.id===saved.id?saved:x):[saved,...(prev[module]??[])]}))
    } catch(err){ const message=formatError(err); setError(`تعذر حفظ السجل: ${message}`); throw err }
  }
  async function createMaintenanceFromPlan(workOrder:WorkOrder,_plan:Record<string,unknown>){await saveWorkOrder(workOrder);navigate('maintenance')}
  async function createPurchaseFromInventory(item:Record<string,unknown>){const records=moduleData.purchases??[];const next={id:`PR-${Date.now()}`,number:`PR-${100+records.length+1}`,date:new Date().toISOString().slice(0,10),req:user?.name??'',desc:String(item.name??''),qty:Number(item.min||1),unit:String(item.unit??''),est:Number(item.min||1)*Number(item.cost||0),proj:'',status:'قيد الاعتماد',po:'',supplier:'',notes:`طلب إعادة طلب للصنف ${String(item.code??'')}`} ;await saveModule('purchases',next);navigate('purchases')}

  async function workflowModule(record:Record<string,unknown>, previous:Record<string,unknown>, action:{key:string;label:string;to:string;from:string[];roles:string[]}){
    const module = route
    const today = new Date().toISOString().slice(0,10)

    // Operations approval changes the asset's trusted meter/status, matching the reference workflow.
    if(module==='operations' && action.key==='approve'){
      const assetId=String(record.assetId??'')
      const asset=assets.find(a=>a.id===assetId)
      if(asset){
        const nextMeter=Number(record.meter??0)
        const nextAsset={...asset,meter:Number.isFinite(nextMeter)&&nextMeter>asset.meter?nextMeter:asset.meter,status:(asset.status==='متاح'||asset.status==='محجوز')?(asset.own==='مملوك'?'مخصص لمشروع':'يعمل'):asset.status}
        if(JSON.stringify(nextAsset)!==JSON.stringify(asset))await saveAsset(nextAsset)
      }
    }

    // Ending an assignment returns the asset and closes its linked request, as in the legacy reference.
    if(module==='assignments' && action.key==='end'){
      const assetId=String(record.asset??'')
      const asset=assets.find(a=>a.id===assetId)
      if(asset){
        const approvedMeters=(moduleData.operations??[]).filter(x=>String(x.assetId??'')===asset.id&&String(x.status??'')==='معتمد').map(x=>Number(x.meter??0)).filter(Number.isFinite)
        const maxApproved=approvedMeters.length?Math.max(...approvedMeters):asset.meter
        await saveAsset({...asset,meter:Math.max(asset.meter,maxApproved),status:'متاح',proj:asset.own==='مملوك'?'':asset.proj})
      }
      const reqId=String(record.req??'')
      if(reqId){
        const req=(moduleData.requests??[]).find(x=>String(x.id??'')===reqId)
        if(req)await saveModule('requests',{...req,status:'مكتمل',apprs:[...(Array.isArray(req.apprs)?req.apprs:[]),{by:user?.name??'النظام',act:'إغلاق بعد إنهاء التخصيص'}]})
      }
    }

    // Closing a request also closes its active assignment and releases its asset.
    if(module==='requests' && action.key==='close'){
      const reqId=String(record.id??'')
      const assignment=(moduleData.assignments??[]).find(x=>String(x.req??'')===reqId&&String(x.status??'')==='ساري')
      if(assignment){
        const updatedAssignment={...assignment,status:'منتهي',toA:today}
        await saveModule('assignments',updatedAssignment)
        const asset=assets.find(a=>a.id===String(assignment.asset??''))
        if(asset)await saveAsset({...asset,status:'متاح',proj:asset.own==='مملوك'?'':asset.proj})
      }
    }

    await saveModule(module,record)
  }

  async function deleteModule(module:string,id:string){await repository.deleteModuleRecord(module,id);setModuleData(prev=>({...prev,[module]:(prev[module]??[]).filter(x=>x.id!==id)}))}

  const alertCount=useMemo(()=>assets.filter(a=>(a.lic?daysTo(a.lic)<=30:false)||['تحت الصيانة','بانتظار الإصلاح','بانتظار الفحص'].includes(a.status)).length,[assets])

  if(!sessionChecked)return <div className="loading-page"><div className="spinner"/><strong>جارٍ التحقق من جلسة المستخدم...</strong></div>
  if(!user)return <LoginPage onLogin={login}/>
  if(loading)return <div className="loading-page"><div className="spinner"/><strong>جارٍ تحميل KEMEX...</strong></div>

  let content
  const routeRoot = route.split('/')[0] === 'asset' ? 'assets' : route.split('/')[0]
  if (!canViewModule(user.role, routeRoot)) {
    content=<ModulePlaceholderPage title="غير مصرح" description="هذا القسم غير متاح للدور الحالي وفق مصفوفة الصلاحيات المرجعية." onRoute={navigate}/>
  }
  const drivers=(moduleData.drivers as any[])||[]
  const contracts=(moduleData.contracts as any[])||[]
  const operations=(moduleData.operations as unknown as Operation[])||[]
  const assetDetailMatch=route.match(/^asset\/(.+)$/)
  const assignmentCreateMatch=route.match(/^assignments\/new\/(.+)$/)
  if (canViewModule(user.role, routeRoot)) {
  if(assetDetailMatch){ const selected=assets.find(a=>a.id===decodeURIComponent(assetDetailMatch[1])); content=<AssetDetailPage asset={selected} assets={assets} projects={projects} operations={operations} fuelOps={fuelOps} workOrders={workOrders} moduleData={moduleData} onBack={()=>navigate('assets')} onEdit={()=>navigate('assets')} onRoute={navigate}/> }
  else if(assignmentCreateMatch){
    const requestId=decodeURIComponent(assignmentCreateMatch[1])
    const request=(moduleData.requests??[]).find(x=>String(x.id??'')===requestId)||null
    const allowed=['admin','fleet'].includes(user.role)
    content=allowed
      ? <AssignmentCreatePage request={request} assets={assets} projects={projects} userName={user.name} onSaveAssignment={(record)=>saveModule('assignments',record)} onSaveAsset={saveAsset} onUpdateRequest={(next)=>saveModule('requests',next)} onBack={()=>navigate('requests')}/>
      : <ModulePlaceholderPage title="غير مصرح" description="لا تملك صلاحية إنشاء تخصيص أصل من طلب معدات." onRoute={navigate}/>
  }
  if(!assetDetailMatch && !assignmentCreateMatch) switch(route){
    case 'dashboard': content=<DashboardPage assets={assets} projects={projects} workOrders={workOrders} fuelOps={fuelOps} operations={operations} onRoute={navigate}/>; break
    case 'alerts': content=<AlertsPage assets={assets} workOrders={workOrders} drivers={drivers as any} contracts={contracts as any} onRoute={navigate} alertDays={systemSettings.alertDays} alertKm={systemSettings.alertKm} alertHours={systemSettings.alertHours} plans={moduleData.plans??[]} oils={moduleData.oils??[]}/>; break
    case 'assets': content=<AssetsPage assets={assets} projects={projects} onSave={saveAsset} onRoute={navigate} canEdit={['admin','fleet','pm'].includes(user.role)}/>; break
    case 'asset': content=<ModulePlaceholderPage title={TITLES.asset??'بطاقة الأصل'} description="بطاقة الأصل" onRoute={navigate}/>; break
    case 'maintenance': content=<MaintenancePage workOrders={workOrders} assets={assets} projects={projects} onSave={['admin','fleet','maint'].includes(user.role)?saveWorkOrder:undefined}/>; break
    case 'plans': content=<PlansPage records={moduleData.plans??[]} assets={assets} onSave={(record)=>saveModule('plans',record)} onCreateWorkOrder={createMaintenanceFromPlan}/>; break
    case 'oils': content=<OilsPage plans={moduleData.oils??[]} changes={moduleData.oilChanges??[]} assets={assets} workOrders={workOrders} moduleData={moduleData} userName={user.name} canEdit={['admin','fleet','maint'].includes(user.role)} onSavePlan={(record)=>saveModule('oils',record)} onSaveChange={(record)=>saveModule('oilChanges',record)}/>; break
    case 'tires': content=<TiresPage records={moduleData.tires??[]} operations={moduleData.tireOps??[]} assets={assets} canEdit={['admin','fleet','maint'].includes(user.role)} onSave={(record)=>saveModule('tires',record)} onSaveOperation={(record)=>saveModule('tireOps',record)}/>; break
    case 'inventory': content=<InventoryPage records={moduleData.inventory??[]} userName={user.name} assets={assets} projects={projects} workOrders={workOrders} onSave={(record)=>saveModule('inventory',record)} onSaveMovement={(record)=>saveModule('movements',record)} onCreatePurchase={createPurchaseFromInventory}/>; break
    case 'fuel': content=<FuelPage fuelOps={fuelOps} assets={assets} projects={projects} onSave={['admin','fleet'].includes(user.role)?saveFuelOperation:undefined} defaultPrices={{diesel:systemSettings.diesel,petrol:systemSettings.petrol}}/>; break
    case 'projects': content=<ProjectsPage projects={projects} assets={assets} onSave={['admin','fleet','pm','acct'].includes(user.role)?saveProject:undefined}/>; break
    case 'purchases': content=<PurchasesPage records={moduleData.purchases??[]} user={user} projects={projects} canEdit={['admin','fleet','maint'].includes(user.role)} onSave={(record)=>saveModule('purchases',record)}/>; break
    case 'costs': content=<CostsPage assets={assets} projects={projects} workOrders={workOrders} fuelOps={fuelOps} moduleData={moduleData}/>; break
    case 'charging': content=<ChargingPage assets={assets} projects={projects} moduleData={moduleData} workOrders={workOrders} fuelOps={fuelOps}/>; break
    case 'invoices': content=<InvoicesPage records={moduleData.invoices??[]} user={user} canEdit={['admin','acct'].includes(user.role)} vatRate={systemSettings.vat} assets={assets} projects={projects} drivers={drivers} workOrders={workOrders} moduleData={moduleData} onSave={(record)=>saveModule('invoices',record)}/>; break
    case 'customers': content=<CustomersPage customers={moduleData.customers??[]} invoices={moduleData.invoices??[]} canEdit={['admin','acct'].includes(user.role)} onSave={(record)=>saveModule('customers',record)}/>; break
    case 'reports': content=<ReportsPage assets={assets} projects={projects} workOrders={workOrders} fuelOps={fuelOps} operations={operations} moduleData={moduleData}/>; break
    case 'users': content=<UsersPage user={user} repository={repository}/>; break
    case 'audit': content=<AuditPage records={moduleData.audit??[]} assets={assets} projects={projects} drivers={drivers} workOrders={workOrders} moduleData={moduleData}/>; break
    case 'settings': content=<SettingsPage user={user} repository={repository} onSaved={s=>setSystemSettings({alertDays:s.alert_days,alertKm:s.alert_km,alertHours:s.alert_hours,vat:s.vat,diesel:s.diesel,petrol:s.petrol})}/>; break
    default: content=GENERIC_MODULES.includes(route)
      ? <ModuleRecordsPage module={route} records={moduleData[route]??[]} assets={assets} projects={projects} drivers={drivers} workOrders={workOrders} moduleData={moduleData} onSave={(record)=>saveModule(route,record)} onWorkflow={(record,previous,action)=>workflowModule(record,previous,action)} onNavigate={navigate} onDelete={(id)=>deleteModule(route,id)} user={user}/>
      : <ModulePlaceholderPage title={TITLES[route]??route} description={descriptionFor(route)} onRoute={navigate}/>;
  }

  }

  return <Layout user={user} route={route} onRoute={navigate} onLogout={logout} alertCount={alertCount}>
    {error && <div className="global-error"><AlertTriangle size={17}/><span>{error}</span></div>}
    {content}
  </Layout>
}

function safeParse(value:string|null):User|null{try{return value?JSON.parse(value):null}catch{return null}}
function daysTo(value:string){return Math.ceil((new Date(value).getTime()-Date.now())/86400000)}
function descriptionFor(key:string){
  const map:Record<string,string>={requests:'طلبات المعدات ومسار الاعتماد',assignments:'تخصيص الأصول للمشروعات ومتابعة الإنهاء',operations:'الساعات والعدادات التشغيلية اليومية والاعتماد',trips:'الرحلات وكميات النقل والمسافات',drivers:'السائقون والمشغلون والرخص',customers:'العملاء والخدمات الخارجية',plans:'الصيانة الوقائية القائمة على الوقت والكم والساعة',oils:'خطط وتغييرات الزيوت والفلاتر',tires:'المخزون والحالات وحركة الإطارات',inventory:'قطع الغيار والأرصدة والحد الأدنى',movements:'حركة دخول وخروج المخزون',purchases:'طلبات الشراء ومسار الاعتماد',costs:'التكاليف المباشرة والإهلاك',charging:'التحميل الداخلي حسب المشروع',invoices:'الدورة المستندية للفواتير والمستحقات',reports:'تقارير الإدارة والتشغيل والمالية',users:'المستخدمون والأدوار والصلاحيات',audit:'سجل العمليات الحساسة والتدقيق',contracts:'عقود الإيجار وشروطها',settings:'إعدادات النظام وقواعد التنبيهات'}
  return map[key]??'وحدة من وحدات إدارة النقل والأسطول.'
}
