import { useEffect, useMemo, useState } from 'react'
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
import { MaintenancePage } from './pages/MaintenancePage'
import { BreakdownListPage } from './pages/BreakdownListPage'
import { BreakdownDetailPage } from './pages/BreakdownDetailPage'
import { NewBreakdownWizard } from './pages/NewBreakdownWizard'
import { TrueCostReportPage } from './pages/TrueCostReportPage'
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
import { ReportsPage, type ReportKey } from './pages/ReportsPage'
import { UsersPage } from './pages/UsersPage'
import { SettingsPage } from './pages/SettingsPage'
import { ChangePasswordPage } from './pages/ChangePasswordPage'
import { CostsPage } from './pages/CostsPage'
import { ChargingPage } from './pages/ChargingPage'
import { InvoicesPage } from './pages/InvoicesPage'
import { CustomersPage } from './pages/CustomersPage'
import { DriversPage } from './pages/DriversPage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
import { AuditPage } from './pages/AuditPage'
import { TripsPage } from './pages/TripsPage'
import { TripDetailPage } from './pages/TripDetailPage'
import { FleetWorkspacePage, MaintenanceWorkspacePage, OperationsWorkspacePage, InventoryWorkspacePage, FinanceWorkspacePage, AdminWorkspacePage } from './pages/WorkspacesPage'
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


export default function App() {
  const { user, loading: authLoading, error: authError, login, logout, changePassword } = useAuth()
  const queryClient = useQueryClient()
  const [route,setRoute]=useState(()=>location.hash.replace(/^#\//,'')||'dashboard')
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
    const readRoute=()=>{ const current=location.hash.replace(/^#\//,'')||'dashboard'; const canonical=current==='reports/true-cost'?'true-cost':current==='movements'?'inventory':current; if(canonical!==current) location.hash='#/'+canonical; setRoute(canonical) }
    const syncRoute=readRoute
    window.addEventListener('hashchange',syncRoute)
    return ()=>window.removeEventListener('hashchange',syncRoute)
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

  async function handleLogin(username:string,password:string){await login(username,password);location.hash='#/dashboard';setRoute('dashboard')}
  async function handleLogout(){await logout();queryClient.removeQueries({queryKey:['kemex','bootstrap']})}
  function navigate(next:string){location.hash='#/'+next;setRoute(next)}

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

  let content
  const routeRoot = route.split('/')[0] === 'asset' || route.split('/')[0] === 'project'
    ? (route.split('/')[0] === 'project' ? 'projects' : 'assets')
    : route.startsWith('reports/')
    ? 'reports'
    : (route === 'reports/true-cost' || route === 'true-cost')
    ? 'true-cost'
    : route.split('/')[0]
  if (!canViewModule(user.role, routeRoot)) {
    content=<ModulePlaceholderPage title="غير مصرح" description="هذا القسم غير متاح للدور الحالي وفق مصفوفة الصلاحيات المرجعية." onRoute={navigate}/>
  }
  const drivers=(moduleData.drivers as any[])||[]
  const contracts=(moduleData.contracts as any[])||[]
  const operations=(moduleData.operations as unknown as Operation[])||[]
  const assetDetailMatch=route.match(/^asset\/(.+)$/)
  const projectDetailMatch=route.match(/^project\/(.+)$/)
  const breakdownDetailMatch=route.match(/^breakdowns\/(?!new$)(.+)$/)
  const assetEditMatch=route.match(/^assets\/edit\/(.+)$/)
  const assignmentCreateMatch=route.match(/^assignments\/new\/(.+)$/)
  const tripDetailMatch=route.match(/^trips\/(?!dispatch$)([^/]+)$/)
  if (canViewModule(user.role, routeRoot)) {
  if(tripDetailMatch){ content=<TripDetailPage id={decodeURIComponent(tripDetailMatch[1])} assets={assets} drivers={drivers as Driver[]} projects={projects} currencyCode={systemSettings.currencyCode} onBack={()=>navigate('trips')}/> }
  else if(projectDetailMatch){ const selectedProject=projects.find(p=>p.id===decodeURIComponent(projectDetailMatch[1])); content=selectedProject ? <ProjectDetailPage project={selectedProject} assets={assets} operations={operations} workOrders={workOrders} fuelOps={fuelOps} trips={trips} tripCosts={tripCosts} invoices={moduleData.invoices??[]} repository={repository} moduleData={moduleData} onBack={()=>navigate('projects')} onRoute={navigate}/> : <ModulePlaceholderPage title="المشروع غير موجود" description="المشروع المطلوب غير موجود في قاعدة البيانات." onRoute={navigate}/> }
  else if(assetDetailMatch){ const selected=assets.find(a=>a.id===decodeURIComponent(assetDetailMatch[1])); content=<AssetDetailPage asset={selected} assets={assets} projects={projects} operations={operations} fuelOps={fuelOps} workOrders={workOrders} trips={trips} moduleData={moduleData} onBack={()=>navigate('assets')} onEdit={(selectedAsset)=>navigate(`assets/edit/${selectedAsset.id}`)} onRoute={navigate}/> }
  else if(breakdownDetailMatch){
    const selectedId=decodeURIComponent(breakdownDetailMatch[1])
    content=<BreakdownDetailPage id={selectedId} assets={assets} projects={projects} drivers={drivers as Driver[]} clients={clients} workOrders={workOrders} onBack={()=>navigate('breakdowns')} onCreateWorkOrder={saveWorkOrder} canEdit={['admin','fleet','maint','pm'].includes(user.role)}/>
  }
  else if(assignmentCreateMatch){
    const requestId=decodeURIComponent(assignmentCreateMatch[1])
    const request=(moduleData.requests??[]).find(x=>String(x.id??'')===requestId)||null
    const allowed=['admin','fleet'].includes(user.role)
    content=allowed
      ? <AssignmentCreatePage request={request} assets={assets} projects={projects} userName={user.name} onSaveAssignment={(record)=>saveModule('assignments',record)} onSaveAsset={saveAsset} onUpdateRequest={(next)=>saveModule('requests',next)} onBack={()=>navigate('requests')}/>
      : <ModulePlaceholderPage title="غير مصرح" description="لا تملك صلاحية إنشاء تخصيص أصل من طلب معدات." onRoute={navigate}/>
  }
  if(assetEditMatch){
    const selectedId=decodeURIComponent(assetEditMatch[1])
    content=<AssetsPage assets={assets} projects={projects} onSave={saveAsset} onRoute={navigate} canEdit={['admin','fleet','pm'].includes(user.role)} focusAssetId={selectedId}/>
  }
  if(!tripDetailMatch && !projectDetailMatch && !assetDetailMatch && !breakdownDetailMatch && !assetEditMatch) {
    if (route.startsWith('reports/')) {
      const key = route.slice('reports/'.length) as ReportKey
      content=<ReportsPage key={route} initialKind={key} assets={assets} projects={projects} workOrders={workOrders} fuelOps={fuelOps} operations={operations} moduleData={moduleData} trips={trips} tripCosts={tripCosts} onRoute={navigate}/>
    }
    else switch(route){
    case 'movements': location.hash='#/inventory'; setRoute('inventory'); content=<InventoryWorkspacePage items={inventoryItems} warehouses={warehouses} stockMovements={stockMovements} assets={assets} projects={projects} workOrders={workOrders} user={user} moduleData={moduleData} onCreate={createInventoryItem} onUpdate={saveInventoryItem} onPostMovement={postStockMovement} onCreatePurchase={async item=>{await createPurchaseFromInventory({name:item.name,code:item.code,min:Math.max(item.minimumQty,item.reorderPoint),qty:item.currentQty,cost:item.averageCost,unit:item.unit})}} onReceivePurchase={receivePurchase} onSaveWarehouse={saveWarehouse} onSaveModule={saveModule}/>; break
    case 'trips/dispatch':
    case 'trips': content=<TripsPage assets={assets} drivers={drivers as Driver[]} projects={projects} clients={clients} onRoute={navigate} initialView={route==='trips/dispatch'?'board':'list'} currencyCode={systemSettings.currencyCode}/>; break
    case 'dashboard': content=<DashboardPage assets={assets} projects={projects} workOrders={workOrders} fuelOps={fuelOps} operations={operations} onRoute={navigate}/>; break
    case 'alerts': content=<AlertsPage assets={assets} workOrders={workOrders} drivers={drivers as any} contracts={contracts as any} onRoute={navigate} alertDays={systemSettings.alertDays} alertKm={systemSettings.alertKm} alertHours={systemSettings.alertHours} plans={moduleData.plans??[]} oils={moduleData.oils??[]}/>; break
    case 'operations': content=<OperationsWorkspacePage assets={assets} projects={projects} drivers={drivers as Driver[]} workOrders={workOrders} clients={clients} costCenters={costCenters} moduleData={moduleData} fuelOps={fuelOps} user={user} onSaveFuel={saveFuelOperation} onSaveProject={saveProject} onSaveModule={saveModule} onDeleteModule={deleteModule} onWorkflow={workflowModule} onRoute={navigate}/>; break
    case 'assets': content=<FleetWorkspacePage assets={assets} projects={projects} drivers={drivers as Driver[]} moduleData={moduleData} onSaveAsset={saveAsset} onRoute={navigate} canEditAssets={['admin','fleet','pm'].includes(user.role)} user={user} onSaveModule={saveModule} onDeleteModule={deleteModule} onWorkflow={workflowModule}/>; break
    case 'maintenance': content=<MaintenanceWorkspacePage assets={assets} projects={projects} drivers={drivers as Driver[]} workOrders={workOrders} technicians={maintenanceTechnicians} moduleData={moduleData} onSaveWorkOrder={saveWorkOrder} onSaveTechnician={saveMaintenanceTechnician} onSaveModule={saveModule} onRoute={navigate} user={user} canEdit={['admin','fleet','maint'].includes(user.role)}/>; break
    case 'breakdowns': content=<MaintenanceWorkspacePage initialTab="breakdowns" assets={assets} projects={projects} drivers={drivers as Driver[]} workOrders={workOrders} technicians={maintenanceTechnicians} moduleData={moduleData} onSaveWorkOrder={saveWorkOrder} onSaveTechnician={saveMaintenanceTechnician} onSaveModule={saveModule} onRoute={navigate} user={user} canEdit={['admin','fleet','maint'].includes(user.role)}/>; break
    case 'breakdowns/new': content=<NewBreakdownWizard assets={assets} projects={projects} drivers={drivers as Driver[]} onRoute={navigate} onBack={()=>navigate('breakdowns')}/>; break
    case 'true-cost':
    case 'reports/true-cost': content=<TrueCostReportPage/>; break
    case 'plans': content=<MaintenanceWorkspacePage initialTab="plans" assets={assets} projects={projects} drivers={drivers as Driver[]} workOrders={workOrders} technicians={maintenanceTechnicians} moduleData={moduleData} onSaveWorkOrder={saveWorkOrder} onSaveTechnician={saveMaintenanceTechnician} onSaveModule={saveModule} onRoute={navigate} user={user} canEdit={['admin','fleet','maint'].includes(user.role)}/>; break
    case 'oils': content=<MaintenanceWorkspacePage initialTab="oils" assets={assets} projects={projects} drivers={drivers as Driver[]} workOrders={workOrders} technicians={maintenanceTechnicians} moduleData={moduleData} onSaveWorkOrder={saveWorkOrder} onSaveTechnician={saveMaintenanceTechnician} onSaveModule={saveModule} onRoute={navigate} user={user} canEdit={['admin','fleet','maint'].includes(user.role)}/>; break
    case 'tires': content=<MaintenanceWorkspacePage initialTab="tires" assets={assets} projects={projects} drivers={drivers as Driver[]} workOrders={workOrders} technicians={maintenanceTechnicians} moduleData={moduleData} onSaveWorkOrder={saveWorkOrder} onSaveTechnician={saveMaintenanceTechnician} onSaveModule={saveModule} onRoute={navigate} user={user} canEdit={['admin','fleet','maint'].includes(user.role)}/>; break
    case 'inventory': content=<InventoryWorkspacePage items={inventoryItems} warehouses={warehouses} stockMovements={stockMovements} assets={assets} projects={projects} workOrders={workOrders} user={user} moduleData={moduleData} onCreate={createInventoryItem} onUpdate={saveInventoryItem} onPostMovement={postStockMovement} onCreatePurchase={async item=>{await createPurchaseFromInventory({name:item.name,code:item.code,min:Math.max(item.minimumQty,item.reorderPoint),qty:item.currentQty,cost:item.averageCost,unit:item.unit})}} onReceivePurchase={receivePurchase} onSaveWarehouse={saveWarehouse} onSaveModule={saveModule}/>; break
    case 'fuel': content=<OperationsWorkspacePage initialTab="fuel" assets={assets} projects={projects} drivers={drivers as Driver[]} workOrders={workOrders} clients={clients} costCenters={costCenters} moduleData={moduleData} fuelOps={fuelOps} user={user} onSaveFuel={saveFuelOperation} onSaveProject={saveProject} onSaveModule={saveModule} onDeleteModule={deleteModule} onWorkflow={workflowModule} onRoute={navigate}/>; break
    case 'projects': content=<OperationsWorkspacePage initialTab="projects" assets={assets} projects={projects} drivers={drivers as Driver[]} workOrders={workOrders} clients={clients} costCenters={costCenters} moduleData={moduleData} fuelOps={fuelOps} user={user} onSaveFuel={saveFuelOperation} onSaveProject={saveProject} onSaveModule={saveModule} onDeleteModule={deleteModule} onWorkflow={workflowModule} onRoute={navigate}/>; break
    case 'purchases': content=<InventoryWorkspacePage initialTab="purchases" items={inventoryItems} warehouses={warehouses} stockMovements={stockMovements} assets={assets} projects={projects} workOrders={workOrders} user={user} moduleData={moduleData} onCreate={createInventoryItem} onUpdate={saveInventoryItem} onPostMovement={postStockMovement} onCreatePurchase={async item=>{await createPurchaseFromInventory({name:item.name,code:item.code,min:Math.max(item.minimumQty,item.reorderPoint),qty:item.currentQty,cost:item.averageCost,unit:item.unit})}} onReceivePurchase={receivePurchase} onSaveWarehouse={saveWarehouse} onSaveModule={saveModule}/>; break
    case 'costs': content=<FinanceWorkspacePage initialTab="costs" assets={assets} projects={projects} workOrders={workOrders} fuelOps={fuelOps} moduleData={moduleData} chargingRates={chargingRates} assetTypes={assetTypes} drivers={drivers as Driver[]} clients={clients} user={user} onSaveModule={saveModule} repository={repository} vatRate={Number(systemSettings.vat||0)} onSaveClient={saveClient}/>; break
    case 'charging': content=<FinanceWorkspacePage initialTab="charging" assets={assets} projects={projects} workOrders={workOrders} fuelOps={fuelOps} moduleData={moduleData} chargingRates={chargingRates} assetTypes={assetTypes} drivers={drivers as Driver[]} clients={clients} user={user} onSaveModule={saveModule} repository={repository} vatRate={Number(systemSettings.vat||0)} onSaveClient={saveClient}/>; break
    case 'invoices': content=<FinanceWorkspacePage initialTab="invoices" assets={assets} projects={projects} workOrders={workOrders} fuelOps={fuelOps} moduleData={moduleData} chargingRates={chargingRates} assetTypes={assetTypes} drivers={drivers as Driver[]} clients={clients} user={user} onSaveModule={saveModule} repository={repository} vatRate={Number(systemSettings.vat||0)} onSaveClient={saveClient}/>; break
    case 'customers': content=<FinanceWorkspacePage initialTab="customers" assets={assets} projects={projects} workOrders={workOrders} fuelOps={fuelOps} moduleData={moduleData} chargingRates={chargingRates} assetTypes={assetTypes} drivers={drivers as Driver[]} clients={clients} user={user} onSaveModule={saveModule} repository={repository} vatRate={Number(systemSettings.vat||0)} onSaveClient={saveClient}/>; break
    case 'reports': {
      const key = route.startsWith('reports/') ? route.slice('reports/'.length) as ReportKey : undefined
      content=<ReportsPage key={route} initialKind={key} assets={assets} projects={projects} workOrders={workOrders} fuelOps={fuelOps} operations={operations} moduleData={moduleData} trips={trips} tripCosts={tripCosts} onRoute={navigate}/>
      break
    }
    case 'users': content=<AdminWorkspacePage user={user} repository={repository} moduleData={moduleData} assets={assets} projects={projects} drivers={drivers as Driver[]} workOrders={workOrders} onSaved={async()=>{await queryClient.invalidateQueries({queryKey:['kemex','bootstrap',user?.id]})}}/>; break
    case 'drivers': content=<FleetWorkspacePage initialTab="drivers" assets={assets} projects={projects} drivers={drivers as Driver[]} moduleData={moduleData} onSaveAsset={saveAsset} onRoute={navigate} canEditAssets={['admin','fleet','pm'].includes(user.role)} user={user} onSaveModule={saveModule} onDeleteModule={deleteModule} onWorkflow={workflowModule}/>; break
    case 'audit': content=<AuditPage records={moduleData.audit??[]} assets={assets} projects={projects} drivers={drivers} workOrders={workOrders} moduleData={moduleData}/>; break
    case 'settings': content=<SettingsPage user={user} repository={repository} onSaved={async()=>{await queryClient.invalidateQueries({queryKey:['kemex','bootstrap',user?.id]})}}/>; break
    default: content=GENERIC_MODULES.includes(route)
      ? <ModuleRecordsPage module={route} records={moduleData[route]??[]} assets={assets} projects={projects} drivers={drivers} workOrders={workOrders} moduleData={moduleData} onSave={(record)=>saveModule(route,record)} onWorkflow={(record,previous,action)=>workflowModule(record,previous,action)} onNavigate={navigate} onDelete={(id)=>deleteModule(route,id)} user={user}/>
      : <ModulePlaceholderPage title={TITLES[route]??route} description={descriptionFor(route)} onRoute={navigate}/>;
    }
  }

  }

  return <CurrencyProvider currencyCode={systemSettings.currencyCode}><Layout user={user} route={route} onRoute={navigate} onLogout={handleLogout} alertCount={alertCount}>
    {(authError || error) && <div className="global-error"><AlertTriangle size={17}/><span>{authError || error}</span></div>}
    {content}
  </Layout></CurrencyProvider>
}

function daysTo(value:string){return Math.ceil((new Date(value).getTime()-Date.now())/86400000)}
function descriptionFor(key:string){
  const map:Record<string,string>={breakdowns:'إدارة الأعطال الميدانية والنقل والورش والتكاليف الحقيقية','true-cost':'تحليل التكلفة الحقيقية وساعات التوقف للأصول',requests:'طلبات المعدات ومسار الاعتماد',assignments:'تخصيص الأصول للمشروعات ومتابعة الإنهاء',operations:'الساعات والعدادات التشغيلية اليومية والاعتماد',trips:'الرحلات وكميات النقل والمسافات',drivers:'السائقون والمشغلون والرخص',customers:'العملاء والخدمات الخارجية',plans:'الصيانة الوقائية القائمة على الوقت والكم والساعة',oils:'خطط وتغييرات الزيوت والفلاتر',tires:'المخزون والحالات وحركة الإطارات',inventory:'قطع الغيار والأرصدة والحد الأدنى',movements:'حركة دخول وخروج المخزون',purchases:'طلبات الشراء ومسار الاعتماد',costs:'التكاليف المباشرة والإهلاك',charging:'التحميل الداخلي حسب المشروع',invoices:'الدورة المستندية للفواتير والمستحقات',reports:'تقارير الإدارة والتشغيل والمالية',users:'المستخدمون والأدوار والصلاحيات',audit:'سجل العمليات الحساسة والتدقيق',contracts:'عقود الإيجار وشروطها',settings:'إعدادات النظام وقواعد التنبيهات'}
  return map[key]??'وحدة من وحدات إدارة النقل والأسطول.'
}

