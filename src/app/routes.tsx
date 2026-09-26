import { lazy, type ReactNode } from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { DashboardPage } from '../pages/DashboardPage'
import { AlertsPage } from '../pages/AlertsPage'
import { AssetsPage } from '../pages/AssetsPage'
import { AssetDetailPage } from '../pages/AssetDetailPage'
import { BreakdownDetailPage } from '../pages/BreakdownDetailPage'
import { NewBreakdownWizard } from '../pages/NewBreakdownWizard'
import { ModulePlaceholderPage } from '../pages/ModulePlaceholderPage'
import { AssignmentCreatePage } from '../pages/AssignmentCreatePage'
import { ModuleRecordsPage } from '../pages/ModuleRecordsPage'
import { ProjectDetailPage } from '../pages/ProjectDetailPage'
import { TripsPage } from '../pages/TripsPage'
import { TripDetailPage } from '../pages/TripDetailPage'
import { OperationsCenterPage } from '../pages/OperationsCenterPage'
import type { AppNotification } from '../features/notifications/types'
import type { ReportKey } from '../pages/ReportsPage'
import { GENERIC_MODULES } from '../config/modules'
import { repository } from '../services/repositoryFactory'
import type { Repository } from '../core/repository/types'
import { canViewModule } from '../config/app'
import type {
  Asset, Contract, Customer, Driver, FuelOperation, InventoryItem, MaintenanceTechnician,
  Operation, Project, StockMovement, User, Warehouse, WorkOrder,
} from '../types/tfms'
import type { Trip, TripCost } from '../features/trips/types'

// Code-split: these pages (and everything WorkspacesPage.tsx pulls in — 15 sub-pages)
// load on demand per route, keeping the initial bundle light.
const AuditPage = lazy(() => import('../pages/AuditPage').then(m => ({ default: m.AuditPage })))
const SettingsPage = lazy(() => import('../pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const ReportsPage = lazy(() => import('../pages/ReportsPage').then(m => ({ default: m.ReportsPage })))
const TrueCostReportPage = lazy(() => import('../pages/TrueCostReportPage').then(m => ({ default: m.TrueCostReportPage })))
const FleetWorkspacePage = lazy(() => import('../pages/WorkspacesPage').then(m => ({ default: m.FleetWorkspacePage })))
const MaintenanceWorkspacePage = lazy(() => import('../pages/WorkspacesPage').then(m => ({ default: m.MaintenanceWorkspacePage })))
const OperationsWorkspacePage = lazy(() => import('../pages/WorkspacesPage').then(m => ({ default: m.OperationsWorkspacePage })))
const InventoryWorkspacePage = lazy(() => import('../pages/WorkspacesPage').then(m => ({ default: m.InventoryWorkspacePage })))
const FinanceWorkspacePage = lazy(() => import('../pages/WorkspacesPage').then(m => ({ default: m.FinanceWorkspacePage })))
const AdminWorkspacePage = lazy(() => import('../pages/WorkspacesPage').then(m => ({ default: m.AdminWorkspacePage })))

const TITLES: Record<string,string> = {
  dashboard:'لوحة المعلومات', alerts:'التنبيهات', assets:'الأصول والأسطول', maintenance:'أوامر العمل', fuel:'الوقود', projects:'المشروعات', 'operations-center':'مركز التشغيل',
  requests:'طلبات المعدات', assignments:'التخصيصات', operations:'التشغيل اليومي', trips:'النقل', drivers:'السائقون والمشغلون', contracts:'عقود الإيجار', customers:'العملاء',
  plans:'خطط الصيانة', oils:'الزيوت والفلاتر', tires:'الإطارات', inventory:'المخازن وقطع الغيار', movements:'حركة المخزون', purchases:'المشتريات',
  breakdowns:'الأعطال والتكاليف', 'breakdowns/new':'تسجيل عطل جديد', 'true-cost':'تقرير التكلفة الحقيقية', 'reports/true-cost':'تقرير التكلفة الحقيقية',
  costs:'التكاليف والإهلاك', charging:'التحميل الداخلي', invoices:'الفواتير والمستحقات', reports:'التقارير', users:'المستخدمون والصلاحيات', audit:'سجل التدقيق', settings:'الإعدادات',
}

function descriptionFor(key:string){
  const map:Record<string,string>={'operations-center':'نظرة موحدة على الرحلات والاستثناءات والصيانة والتنبيهات',breakdowns:'إدارة الأعطال الميدانية والنقل والورش والتكاليف الحقيقية','true-cost':'تحليل التكلفة الحقيقية وساعات التوقف للأصول',requests:'طلبات المعدات ومسار الاعتماد',assignments:'تخصيص الأصول للمشروعات ومتابعة الإنهاء',operations:'الساعات والعدادات التشغيلية اليومية والاعتماد',trips:'الرحلات وكميات النقل والمسافات',drivers:'السائقون والمشغلون والرخص',customers:'العملاء والخدمات الخارجية',plans:'الصيانة الوقائية القائمة على الوقت والكم والساعة',oils:'خطط وتغييرات الزيوت والفلاتر',tires:'المخزون والحالات وحركة الإطارات',inventory:'قطع الغيار والأرصدة والحد الأدنى',movements:'حركة دخول وخروج المخزون',purchases:'طلبات الشراء ومسار الاعتماد',costs:'التكاليف المباشرة والإهلاك',charging:'التحميل الداخلي حسب المشروع',invoices:'الدورة المستندية للفواتير والمستحقات',reports:'تقارير الإدارة والتشغيل والمالية',users:'المستخدمون والأدوار والصلاحيات',audit:'سجل العمليات الحساسة والتدقيق',contracts:'عقود الإيجار وشروطها',settings:'إعدادات النظام وقواعد التنبيهات'}
  return map[key]??'وحدة من وحدات منصة إدارة اللوجستيات والعمليات.'
}

/** Bootstrap data slices the route table renders from. App.tsx assembles this from the
 * bootstrap query; routes never fetch on their own. */
export interface AppRouteData {
  assets: Asset[]
  projects: Project[]
  workOrders: WorkOrder[]
  clients: Customer[]
  costCenters: Array<{ id:string; code:string; name:string; active:boolean }>
  assetTypes: Array<{ id:string; code:string; name:string; defaultMeterType:string; standardConsumption?:number; billingUnit?:string; billingRate?:number; billingMinimum?:number; active:boolean }>
  chargingRates: Array<{ id:string; assetTypeId?:string; assetId?:string; projectId?:string; unit:string; rate:number; minimum?:number; active:boolean }>
  warehouses: Warehouse[]
  inventoryItems: InventoryItem[]
  stockMovements: StockMovement[]
  trips: Trip[]
  tripCosts: TripCost[]
  fuelOps: FuelOperation[]
  maintenanceTechnicians: MaintenanceTechnician[]
  moduleData: Record<string,Record<string,unknown>[]>
  drivers: Driver[]
  operations: Operation[]
  contracts: Contract[]
  systemSettings: { alertDays:number; alertKm:number; alertHours:number; vat:number; currencyCode:string }
}

export interface AppRouteActions {
  saveAsset(a:Asset): Promise<void>
  saveProject(p:Project): Promise<void>
  saveClient(client:Customer): Promise<void>
  saveWorkOrder(w:WorkOrder): Promise<void>
  saveFuelOperation(x:FuelOperation): Promise<void>
  saveMaintenanceTechnician(technician:MaintenanceTechnician): Promise<void>
  saveWarehouse(warehouse:Warehouse): Promise<void>
  saveInventoryItem(item:InventoryItem): Promise<void>
  createInventoryItem(input: Omit<InventoryItem,'currentQty'|'openingQty'> & {openingQty:number; openingUnitCost:number}): Promise<InventoryItem>
  postStockMovement(input: Parameters<Repository['postStockMovement']>[0]): Promise<{ item:InventoryItem; movement:StockMovement }>
  receivePurchase(input:{ purchase:Record<string,unknown>; inventoryItemId:string; warehouseId:string; quantity:number; unitCost:number; notes:string }): Promise<StockMovement>
  saveModule(module:string, record:Record<string,unknown>): Promise<void>
  deleteModule(module:string, id:string): Promise<void>
  workflowModule(record:Record<string,unknown>, previous:Record<string,unknown>, action:{key:string; label:string; to:string; from:string[]; roles:string[]}): Promise<void>
  invalidateBootstrap(): Promise<void>
}

export interface AppRoutesProps {
  user: User
  route: string
  navigate: (r:string)=>void
  data: AppRouteData
  actions: AppRouteActions
  notifications: AppNotification[]
  notificationUnreadCount: number
  notificationsLoading: boolean
  onRefreshNotifications: () => Promise<void>
  onMarkNotificationRead: (id:string) => Promise<void>
  onMarkAllRead: () => Promise<void>
}

// Route wrapper components: each reads the URL param(s) via useParams() and hands the
// resolved record to the existing page component. Defined at module scope so they are
// stable component identities and never lose local state on re-render.
function AssetDetailRoute({data,navigate}:Pick<AppRoutesProps,'navigate'> & {data:AppRouteData}){
  const { id } = useParams()
  const selected = data.assets.find(a=>a.id===decodeURIComponent(id??''))
  return <AssetDetailPage asset={selected} assets={data.assets} projects={data.projects} operations={data.operations} fuelOps={data.fuelOps} workOrders={data.workOrders} trips={data.trips} moduleData={data.moduleData} onBack={()=>navigate('assets')} onEdit={(selectedAsset:Asset)=>navigate(`assets/edit/${selectedAsset.id}`)} onRoute={navigate}/>
}

function AssetEditRoute({data,navigate,actions,canEdit}:{data:AppRouteData; navigate:(r:string)=>void; actions:AppRouteActions; canEdit:boolean}){
  const { id } = useParams()
  return <AssetsPage assets={data.assets} projects={data.projects} onSave={actions.saveAsset} onRoute={navigate} canEdit={canEdit} focusAssetId={decodeURIComponent(id??'')}/>
}

function ProjectDetailRoute({data,navigate}:{data:AppRouteData; navigate:(r:string)=>void}){
  const { id } = useParams()
  const selectedProject = data.projects.find(p=>p.id===decodeURIComponent(id??''))
  if(!selectedProject) return <ModulePlaceholderPage title="المشروع غير موجود" description="المشروع المطلوب غير موجود في قاعدة البيانات." onRoute={navigate}/>
  return <ProjectDetailPage project={selectedProject} assets={data.assets} operations={data.operations} workOrders={data.workOrders} fuelOps={data.fuelOps} trips={data.trips as never} tripCosts={data.tripCosts as never} invoices={data.moduleData.invoices??[]} repository={repository} moduleData={data.moduleData} onBack={()=>navigate('projects')} onRoute={navigate}/>
}

function BreakdownDetailRoute({data,navigate,actions,canEdit}:{data:AppRouteData; navigate:(r:string)=>void; actions:AppRouteActions; canEdit:boolean}){
  const { id } = useParams()
  return <BreakdownDetailPage id={decodeURIComponent(id??'')} assets={data.assets} projects={data.projects} drivers={data.drivers} clients={data.clients as never} workOrders={data.workOrders} onBack={()=>navigate('breakdowns')} onCreateWorkOrder={actions.saveWorkOrder} canEdit={canEdit}/>
}

function AssignmentCreateRoute({data,navigate,actions,user,allowed}:{data:AppRouteData; navigate:(r:string)=>void; actions:AppRouteActions; user:User; allowed:boolean}){
  const { requestId } = useParams()
  if(!allowed) return <ModulePlaceholderPage title="غير مصرح" description="لا تملك صلاحية إنشاء تخصيص أصل من طلب معدات." onRoute={navigate}/>
  const id = decodeURIComponent(requestId??'')
  const request = (data.moduleData.requests??[]).find(x=>String(x.id??'')===id)||null
  return <AssignmentCreatePage request={request} assets={data.assets} projects={data.projects} userName={user.name} onSaveAssignment={(record)=>actions.saveModule('assignments',record)} onSaveAsset={actions.saveAsset} onUpdateRequest={(next)=>actions.saveModule('requests',next)} onBack={()=>navigate('requests')}/>
}

function TripDetailRoute({data,navigate}:{data:AppRouteData; navigate:(r:string)=>void}){
  const { id } = useParams()
  return <TripDetailPage id={decodeURIComponent(id??'')} assets={data.assets} drivers={data.drivers} projects={data.projects} currencyCode={data.systemSettings.currencyCode} onBack={()=>navigate('trips')}/>
}

function ReportsKeyRoute(props: Omit<Parameters<typeof ReportsPage>[0],'initialKind'>){
  const { key } = useParams()
  return <ReportsPage {...props} initialKind={key as ReportKey}/>
}

function GenericModuleRoute({data,navigate,actions,user}:{data:AppRouteData; navigate:(r:string)=>void; actions:AppRouteActions; user:User}){
  const { moduleKey } = useParams()
  const route = moduleKey??''
  if(!GENERIC_MODULES.includes(route)) return <ModulePlaceholderPage title={TITLES[route]??route} description={descriptionFor(route)} onRoute={navigate}/>
  return <ModuleRecordsPage module={route} records={data.moduleData[route]??[]} assets={data.assets} projects={data.projects} drivers={data.drivers as never} workOrders={data.workOrders} moduleData={data.moduleData} onSave={(record)=>actions.saveModule(route,record)} onWorkflow={(record,previous,action)=>actions.workflowModule(record,previous,action)} onNavigate={navigate} onDelete={(id)=>actions.deleteModule(route,id)} user={user as never}/>
}

export function AppRoutes({ user, route, navigate, data, actions, notifications, notificationUnreadCount, notificationsLoading, onRefreshNotifications, onMarkNotificationRead, onMarkAllRead }: AppRoutesProps) {
  const guard = (k:string, el: ReactNode) => canViewModule(user.role,k)
    ? el
    : <ModulePlaceholderPage title="غير مصرح" description="هذا القسم غير متاح للدور الحالي وفق مصفوفة الصلاحيات المرجعية." onRoute={navigate}/>

  // Shared prop bundles for the workspace pages: each of these is rendered from several
  // route cases below with identical props and only `initialTab` differing.
  const maintenanceWorkspaceProps = {
    assets: data.assets, projects: data.projects, drivers: data.drivers, workOrders: data.workOrders,
    technicians: data.maintenanceTechnicians, moduleData: data.moduleData,
    onSaveWorkOrder: actions.saveWorkOrder, onSaveTechnician: actions.saveMaintenanceTechnician,
    onSaveModule: actions.saveModule, onRoute: navigate, user,
    canEdit: ['admin','fleet','maint'].includes(user.role),
  }
  const operationsWorkspaceProps = {
    assets: data.assets, projects: data.projects, drivers: data.drivers, workOrders: data.workOrders,
    clients: data.clients, costCenters: data.costCenters, moduleData: data.moduleData, fuelOps: data.fuelOps,
    user, onSaveFuel: actions.saveFuelOperation, onSaveProject: actions.saveProject, onSaveModule: actions.saveModule,
    onDeleteModule: actions.deleteModule, onWorkflow: actions.workflowModule, onRoute: navigate,
  }
  const inventoryWorkspaceProps = {
    items: data.inventoryItems, warehouses: data.warehouses, stockMovements: data.stockMovements,
    assets: data.assets, projects: data.projects, workOrders: data.workOrders, user, moduleData: data.moduleData,
    onCreate: actions.createInventoryItem, onUpdate: actions.saveInventoryItem, onPostMovement: actions.postStockMovement,
    onCreatePurchase: async (item:{name:string; code:string; minimumQty:number; reorderPoint:number; currentQty:number; averageCost:number; unit:string})=>{
      const records=data.moduleData.purchases??[]
      const next={id:`PR-${Date.now()}`,number:`PR-${100+records.length+1}`,date:new Date().toISOString().slice(0,10),req:user.name,desc:String(item.name),qty:Math.max(item.minimumQty,item.reorderPoint),unit:item.unit,est:Math.max(item.minimumQty,item.reorderPoint)*item.averageCost,proj:'',status:'قيد الاعتماد',po:'',supplier:'',notes:`طلب إعادة طلب للصنف ${item.code}`}
      await actions.saveModule('purchases',next); navigate('purchases')
    },
    onReceivePurchase: actions.receivePurchase, onSaveWarehouse: actions.saveWarehouse, onSaveModule: actions.saveModule,
  }
  const financeWorkspaceProps = {
    assets: data.assets, projects: data.projects, workOrders: data.workOrders, fuelOps: data.fuelOps,
    moduleData: data.moduleData, chargingRates: data.chargingRates, assetTypes: data.assetTypes, drivers: data.drivers,
    clients: data.clients, user, onSaveModule: actions.saveModule, repository,
    vatRate: Number(data.systemSettings.vat||0), onSaveClient: actions.saveClient,
  }
  const fleetWorkspaceProps = {
    assets: data.assets, projects: data.projects, drivers: data.drivers, moduleData: data.moduleData,
    onSaveAsset: actions.saveAsset, onRoute: navigate,
    canEditAssets: ['admin','fleet','pm'].includes(user.role), user,
    onSaveModule: actions.saveModule, onDeleteModule: actions.deleteModule, onWorkflow: actions.workflowModule,
  }

  return <Routes>
    <Route path="/" element={<Navigate to="/dashboard" replace/>}/>
    <Route path="dashboard" element={guard('dashboard', <DashboardPage assets={data.assets} projects={data.projects} workOrders={data.workOrders} fuelOps={data.fuelOps} operations={data.operations} onRoute={navigate}/>)}/>
    <Route path="alerts" element={guard('alerts', <AlertsPage user={user} notifications={notifications} unreadCount={notificationUnreadCount} onRefreshNotifications={onRefreshNotifications} onMarkNotificationRead={onMarkNotificationRead} onMarkAllRead={onMarkAllRead} assets={data.assets} workOrders={data.workOrders} fuelOps={data.fuelOps} drivers={data.drivers as any} contracts={data.contracts as any} onRoute={navigate} alertDays={data.systemSettings.alertDays} alertKm={data.systemSettings.alertKm} alertHours={data.systemSettings.alertHours} plans={data.moduleData.plans??[]} oils={data.moduleData.oils??[]}/>)} />
    <Route path="operations" element={guard('operations', <OperationsWorkspacePage {...operationsWorkspaceProps}/>)}/>
    <Route path="operations-center" element={guard('operations-center', <OperationsCenterPage user={user} assets={data.assets} workOrders={data.workOrders} trips={data.trips} drivers={data.drivers} contracts={data.contracts} notifications={notifications} onRoute={navigate}/>)}/>
    <Route path="assets" element={guard('assets', <FleetWorkspacePage {...fleetWorkspaceProps}/>)}/>
    <Route path="assets/edit/:id" element={guard('assets', <AssetEditRoute data={data} navigate={navigate} actions={actions} canEdit={['admin','fleet','pm'].includes(user.role)}/>)}/>
    <Route path="asset/:id" element={guard('assets', <AssetDetailRoute data={data} navigate={navigate}/>)}/>
    <Route path="drivers" element={guard('drivers', <FleetWorkspacePage initialTab="drivers" {...fleetWorkspaceProps}/>)}/>
    <Route path="maintenance" element={guard('maintenance', <MaintenanceWorkspacePage {...maintenanceWorkspaceProps}/>)}/>
    <Route path="breakdowns" element={guard('breakdowns', <MaintenanceWorkspacePage initialTab="breakdowns" {...maintenanceWorkspaceProps}/>)}/>
    <Route path="breakdowns/new" element={guard('breakdowns', <NewBreakdownWizard assets={data.assets} projects={data.projects} drivers={data.drivers} onRoute={navigate} onBack={()=>navigate('breakdowns')}/>)}/>
    <Route path="breakdowns/:id" element={guard('breakdowns', <BreakdownDetailRoute data={data} navigate={navigate} actions={actions} canEdit={['admin','fleet','maint','pm'].includes(user.role)}/>)}/>
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
    <Route path="project/:id" element={guard('projects', <ProjectDetailRoute data={data} navigate={navigate}/>)}/>
    <Route path="costs" element={guard('costs', <FinanceWorkspacePage initialTab="costs" {...financeWorkspaceProps}/>)}/>
    <Route path="charging" element={guard('charging', <FinanceWorkspacePage initialTab="charging" {...financeWorkspaceProps}/>)}/>
    <Route path="invoices" element={guard('invoices', <FinanceWorkspacePage initialTab="invoices" {...financeWorkspaceProps}/>)}/>
    <Route path="customers" element={guard('customers', <FinanceWorkspacePage initialTab="customers" {...financeWorkspaceProps}/>)}/>
    <Route path="reports" element={guard('reports', <ReportsPage assets={data.assets} projects={data.projects} workOrders={data.workOrders} fuelOps={data.fuelOps} operations={data.operations} moduleData={data.moduleData} trips={data.trips} tripCosts={data.tripCosts} onRoute={navigate}/>)}/>
    <Route path="reports/:key" element={guard('reports', <ReportsKeyRoute assets={data.assets} projects={data.projects} workOrders={data.workOrders} fuelOps={data.fuelOps} operations={data.operations} moduleData={data.moduleData} trips={data.trips} tripCosts={data.tripCosts} onRoute={navigate}/>)}/>
    <Route path="users" element={guard('users', <AdminWorkspacePage user={user} repository={repository} moduleData={data.moduleData} assets={data.assets} projects={data.projects} drivers={data.drivers} workOrders={data.workOrders} onSaved={actions.invalidateBootstrap}/>)}/>
    <Route path="audit" element={guard('audit', <AuditPage records={data.moduleData.audit??[]} assets={data.assets} projects={data.projects} drivers={data.drivers as any} workOrders={data.workOrders} moduleData={data.moduleData}/>)}/>
    <Route path="settings" element={guard('settings', <SettingsPage user={user} repository={repository} onSaved={actions.invalidateBootstrap}/>)}/>
    <Route path="trips" element={guard('trips', <TripsPage assets={data.assets} drivers={data.drivers} projects={data.projects} clients={data.clients as any} onRoute={navigate} initialView="list" currencyCode={data.systemSettings.currencyCode}/>)}/>
    <Route path="trips/dispatch" element={guard('trips', <TripsPage assets={data.assets} drivers={data.drivers} projects={data.projects} clients={data.clients as any} onRoute={navigate} initialView="board" currencyCode={data.systemSettings.currencyCode}/>)}/>
    <Route path="trips/:id" element={guard('trips', <TripDetailRoute data={data} navigate={navigate}/>)}/>
    <Route path="assignments/new/:requestId" element={guard('assignments', <AssignmentCreateRoute data={data} navigate={navigate} actions={actions} user={user} allowed={['admin','fleet'].includes(user.role)}/>)}/>
    <Route path=":moduleKey" element={<GenericModuleRoute data={data} navigate={navigate} actions={actions} user={user}/>}/>
    <Route path="*" element={<ModulePlaceholderPage title={TITLES[route]??route} description={descriptionFor(route)} onRoute={navigate}/>}/>
  </Routes>
}
