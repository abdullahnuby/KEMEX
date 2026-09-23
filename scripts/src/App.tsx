import { useEffect, useMemo, useState, Suspense, lazy, type ReactNode } from 'react'
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
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
  TrendingUp,
  Truck,
  UserRound,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react'
import { Layout, registerModuleIcons } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { AssetsPage } from './pages/AssetsPage'
import { AssetDetailPage } from './pages/AssetDetailPage'
import { BreakdownDetailPage } from './pages/BreakdownDetailPage'
import { NewBreakdownWizard } from './pages/NewBreakdownWizard'
import { ModulePlaceholderPage } from './pages/ModulePlaceholderPage'
import { AssignmentCreatePage } from './pages/AssignmentCreatePage'
import { ModuleRecordsPage } from './pages/ModuleRecordsPage'
import { AlertsPage } from './pages/AlertsPage'
import { ChangePasswordPage } from './pages/ChangePasswordPage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
import { TripsPage } from './pages/TripsPage'
import { TripDetailPage } from './pages/TripDetailPage'
import type { ReportKey } from './pages/ReportsPage'

// Code-split: these pages (and everything WorkspacesPage.tsx pulls in — 15 sub-pages)
// were previously bundled into a single ~1MB chunk loaded on every visit, even the
// login screen. Loading them on demand per route keeps the initial load light.
const AuditPage = lazy(() => import('./pages/AuditPage').then(m => ({ default: m.AuditPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const ReportsPage = lazy(() => import('./pages/ReportsPage').then(m => ({ default: m.ReportsPage })))
const TrueCostReportPage = lazy(() => import('./pages/TrueCostReportPage').then(m => ({ default: m.TrueCostReportPage })))
const FleetWorkspacePage = lazy(() => import('./pages/WorkspacesPage').then(m => ({ default: m.FleetWorkspacePage })))
const MaintenanceWorkspacePage = lazy(() => import('./pages/WorkspacesPage').then(m => ({ default: m.MaintenanceWorkspacePage })))
const OperationsWorkspacePage = lazy(() => import('./pages/WorkspacesPage').then(m => ({ default: m.OperationsWorkspacePage })))
const InventoryWorkspacePage = lazy(() => import('./pages/WorkspacesPage').then(m => ({ default: m.InventoryWorkspacePage })))
const FinanceWorkspacePage = lazy(() => import('./pages/WorkspacesPage').then(m => ({ default: m.FinanceWorkspacePage })))
const AdminWorkspacePage = lazy(() => import('./pages/WorkspacesPage').then(m => ({ default: m.AdminWorkspacePage })))
import { GENERIC_MODULES } from './config/modules'
import { repository } from './services/repositoryFactory'
import type { Repository } from './core/repository/types'
import { useAuth } from './features/auth'
import { CurrencyProvider } from './features/settings'
import { useKemexBootstrap } from './features/app/hooks/useKemexBootstrap'
import { canViewModule } from './config/app'
import type { Asset, Driver, FuelOperation, Operation, Project, WorkOrder } from './types/tfms'

registerModuleIcons({
  LayoutDashboard, Bell, ClipboardList, FileCheck2, Gauge, Truck, Building2, Container, UserRound,
  BriefcaseBusiness, CalendarClock, Wrench, Droplets, CircleDot, Fuel, Boxes, ArrowLeftRight,
  ShoppingCart, Coins, ChartColumn, ReceiptText, ChartNoAxesCombined, Users, ClipboardPenLine, Settings2,
  AlertTriangle, TrendingUp, Wallet,
})

const TITLES: Record<string,string> = {
  dashboard:'لوحة المعلومات', alerts:'التنبيهات', assets:'الأصول والأسطول', maintenance:'أوامر العمل', fuel:'الوقود', projects:'المشروعات',
  requests:'طلبات المعدات', assignments:'التخصيصات', operations:'التشغيل اليومي', trips:'النقل', drivers:'السائقون والمشغلون', contracts:'عقود الإيجار', customers:'العملاء',
  plans:'خطط الصيانة', oils:'الزيوت والفلاتر', tires:'الإطارات', inventory:'المخازن وقطع الغيار', movements:'حركة المخزون', purchases:'المشتريات',
  breakdowns:'الأعطال والتكاليف', 'breakdowns/new':'تسجيل عطل جديد', 'true-cost':'تقرير التكلفة الحقيقية', 'reports/true-cost':'تقرير التكلفة الحقيقية',
  costs:'التكاليف والإهلاك', charging:'التحميل الداخلي', invoices:'الفواتير والمستحقات', reports:'التقارير', users:'المستخدمون والصلاحيات', audit:'سجل التدقيق', settings:'الإعدادات',
}

// Route wrapper components: each reads the URL param(s) via useParams() and hands the
// resolved record to the existing page component, exactly like the old regex matches
// (`route.match(/^asset\/(.+)$/)` etc.) used to. Defined at module scope (not inside
// App's render) so they are stable component identities and never lose local state
// on re-render.
function AssetDetailRoute({assets,projects,operations,fuelOps,workOrders,trips,moduleData,onRoute}:{
  assets:Asset[]; projects:Project[]; operations:Operation[]; fuelOps:FuelOperation[]; workOrders:WorkOrder[]; trips:unknown[]; moduleData:Record<string,Record<string,unknown>[]>; onRoute:(r:string)=>void
}){
  const { id } = useParams()
  const selected = assets.find(a=>a.id===decodeURIComponent(id??''))
  return <AssetDetailPage asset={selected} assets={assets} projects={projects} operations={operations} fuelOps={fuelOps} workOrders={workOrders} trips={trips as never} moduleData={moduleData} onBack={()=>onRoute('assets')} onEdit={(selectedAsset:Asset)=>onRoute(`assets/edit/${selectedAsset.id}`)} onRoute={onRoute}/>
}

function AssetEditRoute({assets,projects,onSave,onRoute,canEdit}:{
  assets:Asset[]; projects:Project[]; onSave:(a:Asset)=>Promise<void>; onRoute:(r:string)=>void; canEdit:boolean
}){
  const { id } = useParams()
  return <AssetsPage assets={assets} projects={projects} onSave={onSave} onRoute={onRoute} canEdit={canEdit} focusAssetId={decodeURIComponent(id??'')}/>
}

function ProjectDetailRoute({projects,assets,operations,workOrders,fuelOps,trips,tripCosts,moduleData,onRoute}:{
  projects:Project[]; assets:Asset[]; operations:Operation[]; workOrders:WorkOrder[]; fuelOps:FuelOperation[]; trips:unknown[]; tripCosts:unknown[]; moduleData:Record<string,Record<string,unknown>[]>; onRoute:(r:string)=>void
}){
  const { id } = useParams()
  const selectedProject = projects.find(p=>p.id===decodeURIComponent(id??''))
  if(!selectedProject) return <ModulePlaceholderPage title="المشروع غير موجود" description="المشروع المطلوب غير موجود في قاعدة البيانات." onRoute={onRoute}/>
  return <ProjectDetailPage project={selectedProject} assets={assets} operations={operations} workOrders={workOrders} fuelOps={fuelOps} trips={trips as never} tripCosts={tripCosts as never} invoices={moduleData.invoices??[]} repository={repository} moduleData={moduleData} onBack={()=>onRoute('projects')} onRoute={onRoute}/>
}

function BreakdownDetailRoute({assets,projects,drivers,clients,workOrders,onCreateWorkOrder,canEdit,onRoute}:{
  assets:Asset[]; projects:Project[]; drivers:Driver[]; clients:unknown[]; workOrders:WorkOrder[]; onCreateWorkOrder:(w:WorkOrder)=>Promise<void>; canEdit:boolean; onRoute:(r:string)=>void
}){
  const { id } = useParams()
  return <BreakdownDetailPage id={decodeURIComponent(id??'')} assets={assets} projects={projects} drivers={drivers} clients={clients as never} workOrders={workOrders} onBack={()=>onRoute('breakdowns')} onCreateWorkOrder={onCreateWorkOrder} canEdit={canEdit}/>
}

function AssignmentCreateRoute({moduleData,assets,projects,userName,onSaveAssignment,onSaveAsset,onUpdateRequest,allowed,onRoute}:{
  moduleData:Record<string,Record<string,unknown>[]>; assets:Asset[]; projects:Project[]; userName:string
  onSaveAssignment:(record:Record<string,unknown>)=>Promise<void>; onSaveAsset:(a:Asset)=>Promise<void>
  onUpdateRequest:(next:Record<string,unknown>)=>Promise<void>; allowed:boolean; onRoute:(r:string)=>void
}){
  const { requestId } = useParams()
  if(!allowed) return <ModulePlaceholderPage title="غير مصرح" description="لا تملك صلاحية إنشاء تخصيص أصل من طلب معدات." onRoute={onRoute}/>
  const id = decodeURIComponent(requestId??'')
  const request = (moduleData.requests??[]).find(x=>String(x.id??'')===id)||null
  return <AssignmentCreatePage request={request} assets={assets} projects={projects} userName={userName} onSaveAssignment={onSaveAssignment} onSaveAsset={onSaveAsset} onUpdateRequest={onUpdateRequest} onBack={()=>onRoute('requests')}/>
}

function TripDetailRoute({assets,drivers,projects,currencyCode,onRoute}:{
  assets:Asset[]; drivers:Driver[]; projects:Project[]; currencyCode:string; onRoute:(r:string)=>void
}){
  const { id } = useParams()
  return <TripDetailPage id={decodeURIComponent(id??'')} assets={assets} drivers={drivers} projects={projects} currencyCode={currencyCode} onBack={()=>onRoute('trips')}/>
}

function ReportsKeyRoute(props: Omit<Parameters<typeof ReportsPage>[0],'initialKind'>){
  const { key } = useParams()
  return <ReportsPage {...props} initialKind={key as ReportKey}/>
}

function GenericModuleRoute({moduleData,assets,projects,drivers,workOrders,onSave,onWorkflow,onNavigate,onDelete,user,titleFallback}:{
  moduleData:Record<string,Record<string,unknown>[]>; assets:Asset[]; projects:Project[]; drivers:unknown[]; workOrders:WorkOrder[]
  onSave:(module:string,record:Record<string,unknown>)=>Promise<void>
  onWorkflow:(record:Record<string,unknown>,previous:Record<string,unknown>,action:{key:string;label:string;to:string;from:string[];roles:string[]})=>Promise<void>
  onNavigate:(r:string)=>void; onDelete:(module:string,id:string)=>Promise<void>; user:{role:string;name:string}; titleFallback:(key:string)=>string
}){
  const { moduleKey } = useParams()
  const route = moduleKey??''
  if(!GENERIC_MODULES.includes(route)) return <ModulePlaceholderPage title={TITLES[route]??route} description={titleFallback(route)} onRoute={onNavigate}/>
  return <ModuleRecordsPage module={route} records={moduleData[route]??[]} assets={assets} projects={projects} drivers={drivers as never} workOrders={workOrders} moduleData={moduleData} onSave={(record)=>onSave(route,record)} onWorkflow={(record,previous,action)=>onWorkflow(record,previous,action)} onNavigate={onNavigate} onDelete={(id)=>onDelete(route,id)} user={user as never}/>
}


function AppInner() {
  const { user, loading: authLoading, error: authError, login, logout, changePassword } = useAuth()
  const queryClient = useQueryClient()
  const location = useLocation()
  const routerNavigate = useNavigate()
  // `route` keeps the exact same shape every other part of this file (and Layout.tsx)
  // already expects: no leading slash, e.g. "dashboard", "reports/true-cost".
  const route = location.pathname.replace(/^\//,'')||'dashboard'
  const [error,setError]=useState('')
  const bootstrapQuery = useKemexBootstrap(user?.id && !user.mustChangePassword ? user.id : undefined)
  const assets = bootstrapQuery.data?.assets ?? []
  const projects = bootstrapQuery.data?.projects ?? []
  const workOrders = bootstrapQuery.data?.workOrders ?? []
  const clients = bootstrapQuery.data?.clients ?? []
  const costCenters = bootstrapQuery.data?.costCenters ?? []
  const assetTypes = bootstrapQuery.data?.assetTypes ?? []
  const chargingRates = bootstrapQuery.data?.chargingRates ?? []
  const warehouses = bootstrapQuery.data?.warehouses ?? []
  const inventoryItems = bootstrapQuery.data?.inventoryItems ?? []
  const stockMovements = bootstrapQuery.data?.stockMovements ?? []
  const trips = bootstrapQuery.data?.trips ?? []
  const tripCosts = bootstrapQuery.data?.tripCosts ?? []
  const maintenanceTechnicians = bootstrapQuery.data?.maintenanceTechnicians ?? []
  const maintenanceParts = bootstrapQuery.data?.maintenanceParts ?? []
  const fuelOps = bootstrapQuery.data?.fuelOps ?? []
  const moduleData = bootstrapQuery.data?.moduleData ?? {}
  const systemSettings = bootstrapQuery.data?.settings ?? {alertDays:30,alertKm:1500,alertHours:80,vat:0,diesel:0,petrol:0,currencyCode:'EGP'}

  useEffect(()=>{
    localStorage.removeItem('tfms-web-demo-v1')
  },[])

  useEffect(()=>{
    repository.clearAuditActor()
    if(user) repository.setAuditActor(user)
  },[user])

  useEffect(()=>{
    if (bootstrapQuery.data?.failures?.length) {
      setError(`تعذر تحميل بعض البيانات؛ يمكنك متابعة استخدام الأجزاء المتاحة. ${bootstrapQuery.data.failures.join(' | ')}`)
    } else if (!bootstrapQuery.isFetching) {
      setError('')
    }
  },[bootstrapQuery.data, bootstrapQuery.isFetching])

  async function handleLogin(username:string,password:string){await login(username,password);routerNavigate('/dashboard')}
  async function handleLogout(){await logout();queryClient.removeQueries({queryKey:['kemex','bootstrap']})}
  function navigate(next:string){routerNavigate('/'+next)}

  function formatError(err:unknown){return err instanceof Error ? err.message : 'تعذر تنفيذ العملية. حاول مرة أخرى.'}

  async function saveProject(p:Project){
    try { await repository.saveProject(p); setError(''); await queryClient.invalidateQueries({queryKey:['kemex','bootstrap',user?.id]}) }
    catch(err){ const message=formatError(err); setError(`تعذر حفظ المشروع: ${message}`); throw err }
  }

  async function saveClient(client: import('./types/tfms').Customer){
    try { await repository.saveClient(client); setError(''); await queryClient.invalidateQueries({queryKey:['kemex','bootstrap',user?.id]}) }
    catch(err){ const message=formatError(err); setError(`تعذر حفظ العميل: ${message}`); throw err }
  }

  async function saveAsset(a:Asset){
    const normalized=a.id.startsWith('NEW-')?{...a,id:`A-${Date.now()}`} : a
    try {
      await repository.saveAsset(normalized)
      setError('')
      await queryClient.invalidateQueries({queryKey:['kemex','bootstrap',user?.id]})
    } catch(err){ const message=formatError(err); setError(`تعذر حفظ الأصل: ${message}`); throw err }
  }

  async function saveMaintenanceTechnician(technician: import('./types/tfms').MaintenanceTechnician): Promise<void> {
    try { await repository.saveMaintenanceTechnician(technician); setError(''); await queryClient.invalidateQueries({queryKey:['kemex','bootstrap',user?.id]}) }
    catch(err){ const message=formatError(err); setError(`تعذر حفظ الفني: ${message}`); throw err }
  }
  async function saveWarehouse(warehouse: import('./types/tfms').Warehouse): Promise<void> {
    try { await repository.saveWarehouse(warehouse); setError(''); await queryClient.invalidateQueries({queryKey:['kemex','bootstrap',user?.id]}) }
    catch(err){ const message=formatError(err); setError(`تعذر حفظ المخزن: ${message}`); throw err }
  }
  async function saveInventoryItem(item: import('./types/tfms').InventoryItem): Promise<void> {
    try { await repository.updateInventoryItem(item); setError(''); await queryClient.invalidateQueries({queryKey:['kemex','bootstrap',user?.id]}) }
    catch(err){ const message=formatError(err); setError(`تعذر حفظ الصنف: ${message}`); throw err }
  }
  async function createInventoryItem(input: Omit<import('./types/tfms').InventoryItem,'currentQty'|'openingQty'> & {openingQty:number;openingUnitCost:number}): Promise<import('./types/tfms').InventoryItem> {
    try { const created=await repository.createInventoryItem(input); setError(''); await queryClient.invalidateQueries({queryKey:['kemex','bootstrap',user?.id]}); return created }
    catch(err){ const message=formatError(err); setError(`تعذر إنشاء الصنف: ${message}`); throw err }
  }
  async function postStockMovement(input: Parameters<Repository['postStockMovement']>[0]): Promise<{item: import('./types/tfms').InventoryItem; movement: import('./types/tfms').StockMovement}> {
    try { const result=await repository.postStockMovement(input); setError(''); await queryClient.invalidateQueries({queryKey:['kemex','bootstrap',user?.id]}); return result }
    catch(err){ const message=formatError(err); setError(`تعذر تسجيل حركة المخزون: ${message}`); throw err }
  }
  async function receivePurchase(input:{purchase:Record<string,unknown>;inventoryItemId:string;warehouseId:string;quantity:number;unitCost:number;notes:string}) {
    const result=await postStockMovement({
      id:`SM-${Date.now()}`,
      itemId:input.inventoryItemId,
      movementType:'استلام',
      quantity:input.quantity,
      movementDate:new Date().toISOString().slice(0,10),
      unitCost:input.unitCost,
      warehouseId:input.warehouseId,
      projectId:String(input.purchase.proj??'')||undefined,
      referenceType:'purchase',
      referenceId:String(input.purchase.po??input.purchase.number??input.purchase.id??''),
      notes:input.notes||`استلام مرتبط بأمر شراء ${String(input.purchase.po??input.purchase.number??'')}`,
    })
    return result.movement
  }

  async function saveWorkOrder(w:WorkOrder){
    try { await repository.saveWorkOrder(w); setError(''); await queryClient.invalidateQueries({queryKey:['kemex','bootstrap',user?.id]}) }
    catch(err){ const message=formatError(err); setError(`تعذر حفظ أمر الصيانة: ${message}`); throw err }
  }

  async function saveFuelOperation(x:FuelOperation){
    try { await repository.saveFuelOperation(x); setError(''); await queryClient.invalidateQueries({queryKey:['kemex','bootstrap',user?.id]}) }
    catch(err){ const message=formatError(err); setError(`تعذر حفظ حركة الوقود: ${message}`); throw err }
  }

  async function saveModule(module:string, record:Record<string,unknown>):Promise<void>{
    try {
      await repository.saveModuleRecord(module,record)
      setError('')
      await queryClient.invalidateQueries({queryKey:['kemex','bootstrap',user?.id]})
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

  async function deleteModule(module:string,id:string){await repository.deleteModuleRecord(module,id);await queryClient.invalidateQueries({queryKey:['kemex','bootstrap',user?.id]})}

  const alertCount=useMemo(()=>assets.filter(a=>(a.lic?daysTo(a.lic)<=30:false)||['تحت الصيانة','بانتظار الإصلاح','بانتظار الفحص'].includes(a.status)).length,[assets])

  if(authLoading)return <div className="loading-page"><div className="spinner"/><strong>جارٍ التحقق من جلسة المستخدم...</strong></div>
  if(!user)return <LoginPage onLogin={handleLogin}/>
  if(user.mustChangePassword) return <ChangePasswordPage user={user} onChangePassword={changePassword} onLogout={handleLogout}/>
  if(bootstrapQuery.isPending)return <div className="loading-page"><div className="spinner"/><strong>جارٍ تحميل بيانات KEMEX...</strong></div>

  const guard = (k:string, el: ReactNode) => canViewModule(user.role,k)
    ? el
    : <ModulePlaceholderPage title="غير مصرح" description="هذا القسم غير متاح للدور الحالي وفق مصفوفة الصلاحيات المرجعية." onRoute={navigate}/>
  const drivers=(moduleData.drivers as any[])||[]
  // Shared prop bundles for the workspace pages: each of these is rendered from several
  // route cases below with identical props and only `initialTab` differing. Extracted once
  // here so the routes below don't repeat the same 10-15 props per route (previously each
  // case re-typed the full list, which is where drift between cases used to creep in).
  const maintenanceWorkspaceProps = {
    assets, projects, drivers: drivers as Driver[], workOrders, technicians: maintenanceTechnicians,
    moduleData, onSaveWorkOrder: saveWorkOrder, onSaveTechnician: saveMaintenanceTechnician,
    onSaveModule: saveModule, onRoute: navigate, user, canEdit: ['admin','fleet','maint'].includes(user.role),
  }
  const operationsWorkspaceProps = {
    assets, projects, drivers: drivers as Driver[], workOrders, clients, costCenters, moduleData,
    fuelOps, user, onSaveFuel: saveFuelOperation, onSaveProject: saveProject, onSaveModule: saveModule,
    onDeleteModule: deleteModule, onWorkflow: workflowModule, onRoute: navigate,
  }
  const inventoryWorkspaceProps = {
    items: inventoryItems, warehouses, stockMovements, assets, projects, workOrders, user, moduleData,
    onCreate: createInventoryItem, onUpdate: saveInventoryItem, onPostMovement: postStockMovement,
    onCreatePurchase: async (item:{name:string;code:string;minimumQty:number;reorderPoint:number;currentQty:number;averageCost:number;unit:string})=>{
      await createPurchaseFromInventory({name:item.name,code:item.code,min:Math.max(item.minimumQty,item.reorderPoint),qty:item.currentQty,cost:item.averageCost,unit:item.unit})
    },
    onReceivePurchase: receivePurchase, onSaveWarehouse: saveWarehouse, onSaveModule: saveModule,
  }
  const financeWorkspaceProps = {
    assets, projects, workOrders, fuelOps, moduleData, chargingRates, assetTypes, drivers: drivers as Driver[],
    clients, user, onSaveModule: saveModule, repository, vatRate: Number(systemSettings.vat||0), onSaveClient: saveClient,
  }
  const fleetWorkspaceProps = {
    assets, projects, drivers: drivers as Driver[], moduleData, onSaveAsset: saveAsset, onRoute: navigate,
    canEditAssets: ['admin','fleet','pm'].includes(user.role), user, onSaveModule: saveModule,
    onDeleteModule: deleteModule, onWorkflow: workflowModule,
  }
  const contracts=(moduleData.contracts as any[])||[]
  const operations=(moduleData.operations as unknown as Operation[])||[]
  const assignmentAllowed = ['admin','fleet'].includes(user.role)
  const breakdownCanEdit = ['admin','fleet','maint','pm'].includes(user.role)
  const assetsCanEdit = ['admin','fleet','pm'].includes(user.role)

  const content = <Routes>
    <Route path="/" element={<Navigate to="/dashboard" replace/>}/>
    <Route path="dashboard" element={guard('dashboard', <DashboardPage assets={assets} projects={projects} workOrders={workOrders} fuelOps={fuelOps} operations={operations} onRoute={navigate}/>)}/>
    <Route path="alerts" element={guard('alerts', <AlertsPage assets={assets} workOrders={workOrders} drivers={drivers as any} contracts={contracts as any} onRoute={navigate} alertDays={systemSettings.alertDays} alertKm={systemSettings.alertKm} alertHours={systemSettings.alertHours} plans={moduleData.plans??[]} oils={moduleData.oils??[]}/>)}/>
    <Route path="operations" element={guard('operations', <OperationsWorkspacePage {...operationsWorkspaceProps}/>)}/>
    <Route path="assets" element={guard('assets', <FleetWorkspacePage {...fleetWorkspaceProps}/>)}/>
    <Route path="assets/edit/:id" element={guard('assets', <AssetEditRoute assets={assets} projects={projects} onSave={saveAsset} onRoute={navigate} canEdit={assetsCanEdit}/>)}/>
    <Route path="asset/:id" element={guard('assets', <AssetDetailRoute assets={assets} projects={projects} operations={operations} fuelOps={fuelOps} workOrders={workOrders} trips={trips} moduleData={moduleData} onRoute={navigate}/>)}/>
    <Route path="drivers" element={guard('drivers', <FleetWorkspacePage initialTab="drivers" {...fleetWorkspaceProps}/>)}/>
    <Route path="maintenance" element={guard('maintenance', <MaintenanceWorkspacePage {...maintenanceWorkspaceProps}/>)}/>
    <Route path="breakdowns" element={guard('breakdowns', <MaintenanceWorkspacePage initialTab="breakdowns" {...maintenanceWorkspaceProps}/>)}/>
    <Route path="breakdowns/new" element={guard('breakdowns', <NewBreakdownWizard assets={assets} projects={projects} drivers={drivers as Driver[]} onRoute={navigate} onBack={()=>navigate('breakdowns')}/>)}/>
    <Route path="breakdowns/:id" element={guard('breakdowns', <BreakdownDetailRoute assets={assets} projects={projects} drivers={drivers as Driver[]} clients={clients} workOrders={workOrders} onCreateWorkOrder={saveWorkOrder} canEdit={breakdownCanEdit} onRoute={navigate}/>)}/>
    <Route path="plans" element={guard('plans', <MaintenanceWorkspacePage initialTab="plans" {...maintenanceWorkspaceProps}/>)}/>
    <Route path="oils" element={guard('oils', <MaintenanceWorkspacePage initialTab="oils" {...maintenanceWorkspaceProps}/>)}/>
    <Route path="tires" element={guard('tires', <MaintenanceWorkspacePage initialTab="tires" {...maintenanceWorkspaceProps}/>)}/>
    <Route path="true-cost" element={guard('true-cost', <TrueCostReportPage/>)}/>
    <Route path="reports/true-cost" element={<Navigate to="/true-cost" replace/>}/>
    <Route path="inventory" element={guard('inventory', <InventoryWorkspacePage {...inventoryWorkspaceProps}/>)}/>
    <Route path="movements" element={<Navigate to="/inventory" replace/>}/>
    <Route path="purchases" element={guard('purchases', <InventoryWorkspacePage initialTab="purchases" {...inventoryWorkspaceProps}/>)}/>
    <Route path="fuel" element={guard('fuel', <OperationsWorkspacePage initialTab="fuel" {...operationsWorkspaceProps}/>)}/>
    <Route path="projects" element={guard('projects', <OperationsWorkspacePage initialTab="projects" {...operationsWorkspaceProps}/>)}/>
    <Route path="project/:id" element={guard('projects', <ProjectDetailRoute projects={projects} assets={assets} operations={operations} workOrders={workOrders} fuelOps={fuelOps} trips={trips} tripCosts={tripCosts} moduleData={moduleData} onRoute={navigate}/>)}/>
    <Route path="costs" element={guard('costs', <FinanceWorkspacePage initialTab="costs" {...financeWorkspaceProps}/>)}/>
    <Route path="charging" element={guard('charging', <FinanceWorkspacePage initialTab="charging" {...financeWorkspaceProps}/>)}/>
    <Route path="invoices" element={guard('invoices', <FinanceWorkspacePage initialTab="invoices" {...financeWorkspaceProps}/>)}/>
    <Route path="customers" element={guard('customers', <FinanceWorkspacePage initialTab="customers" {...financeWorkspaceProps}/>)}/>
    <Route path="reports" element={guard('reports', <ReportsPage assets={assets} projects={projects} workOrders={workOrders} fuelOps={fuelOps} operations={operations} moduleData={moduleData} trips={trips} tripCosts={tripCosts} onRoute={navigate}/>)}/>
    <Route path="reports/:key" element={guard('reports', <ReportsKeyRoute assets={assets} projects={projects} workOrders={workOrders} fuelOps={fuelOps} operations={operations} moduleData={moduleData} trips={trips} tripCosts={tripCosts} onRoute={navigate}/>)}/>
    <Route path="users" element={guard('users', <AdminWorkspacePage user={user} repository={repository} moduleData={moduleData} assets={assets} projects={projects} drivers={drivers as Driver[]} workOrders={workOrders} onSaved={async()=>{await queryClient.invalidateQueries({queryKey:['kemex','bootstrap',user?.id]})}}/>)}/>
    <Route path="audit" element={guard('audit', <AuditPage records={moduleData.audit??[]} assets={assets} projects={projects} drivers={drivers} workOrders={workOrders} moduleData={moduleData}/>)}/>
    <Route path="settings" element={guard('settings', <SettingsPage user={user} repository={repository} onSaved={async()=>{await queryClient.invalidateQueries({queryKey:['kemex','bootstrap',user?.id]})}}/>)}/>
    <Route path="trips" element={guard('trips', <TripsPage assets={assets} drivers={drivers as Driver[]} projects={projects} clients={clients} onRoute={navigate} initialView="list" currencyCode={systemSettings.currencyCode}/>)}/>
    <Route path="trips/dispatch" element={guard('trips', <TripsPage assets={assets} drivers={drivers as Driver[]} projects={projects} clients={clients} onRoute={navigate} initialView="board" currencyCode={systemSettings.currencyCode}/>)}/>
    <Route path="trips/:id" element={guard('trips', <TripDetailRoute assets={assets} drivers={drivers as Driver[]} projects={projects} currencyCode={systemSettings.currencyCode} onRoute={navigate}/>)}/>
    <Route path="assignments/new/:requestId" element={guard('assignments', <AssignmentCreateRoute moduleData={moduleData} assets={assets} projects={projects} userName={user.name} onSaveAssignment={(record)=>saveModule('assignments',record)} onSaveAsset={saveAsset} onUpdateRequest={(next)=>saveModule('requests',next)} allowed={assignmentAllowed} onRoute={navigate}/>)}/>
    <Route path=":moduleKey" element={<GenericModuleRoute moduleData={moduleData} assets={assets} projects={projects} drivers={drivers} workOrders={workOrders} onSave={saveModule} onWorkflow={workflowModule} onNavigate={navigate} onDelete={deleteModule} user={user} titleFallback={descriptionFor}/>}/>
    <Route path="*" element={<ModulePlaceholderPage title={TITLES[route]??route} description={descriptionFor(route)} onRoute={navigate}/>}/>
  </Routes>
  return <CurrencyProvider currencyCode={systemSettings.currencyCode}><Layout user={user} route={route} onRoute={navigate} onLogout={handleLogout} alertCount={alertCount}>
    {(authError || error) && <div className="global-error"><AlertTriangle size={17}/><span>{authError || error}</span></div>}
    <Suspense fallback={<div style={{padding:'40px',textAlign:'center',color:'var(--tfms-muted)'}}>...جارٍ التحميل</div>}>
      {content}
    </Suspense>
  </Layout></CurrencyProvider>
}

function daysTo(value:string){return Math.ceil((new Date(value).getTime()-Date.now())/86400000)}
function descriptionFor(key:string){
  const map:Record<string,string>={breakdowns:'إدارة الأعطال الميدانية والنقل والورش والتكاليف الحقيقية','true-cost':'تحليل التكلفة الحقيقية وساعات التوقف للأصول',requests:'طلبات المعدات ومسار الاعتماد',assignments:'تخصيص الأصول للمشروعات ومتابعة الإنهاء',operations:'الساعات والعدادات التشغيلية اليومية والاعتماد',trips:'الرحلات وكميات النقل والمسافات',drivers:'السائقون والمشغلون والرخص',customers:'العملاء والخدمات الخارجية',plans:'الصيانة الوقائية القائمة على الوقت والكم والساعة',oils:'خطط وتغييرات الزيوت والفلاتر',tires:'المخزون والحالات وحركة الإطارات',inventory:'قطع الغيار والأرصدة والحد الأدنى',movements:'حركة دخول وخروج المخزون',purchases:'طلبات الشراء ومسار الاعتماد',costs:'التكاليف المباشرة والإهلاك',charging:'التحميل الداخلي حسب المشروع',invoices:'الدورة المستندية للفواتير والمستحقات',reports:'تقارير الإدارة والتشغيل والمالية',users:'المستخدمون والأدوار والصلاحيات',audit:'سجل العمليات الحساسة والتدقيق',contracts:'عقود الإيجار وشروطها',settings:'إعدادات النظام وقواعد التنبيهات'}
  return map[key]??'وحدة من وحدات إدارة النقل والأسطول.'
}

// HashRouter keeps the exact same #/route URL scheme the app always used (so existing
// bookmarks and any saved links keep working) while replacing the hand-rolled
// hashchange listener + regex matching with react-router's tested route matching.
export default function App() {
  return <HashRouter><AppInner/></HashRouter>
}

