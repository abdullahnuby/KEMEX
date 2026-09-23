import { lazy, type ComponentProps, type ReactNode } from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { LayoutDashboard, Bell, ClipboardList, FileCheck2, Gauge, Truck, Building2, Container, UserRound, BriefcaseBusiness, CalendarClock, Wrench, Droplets, CircleDot, Fuel, Boxes, ArrowLeftRight, ShoppingCart, Coins, ChartColumn, ReceiptText, ChartNoAxesCombined, Users, ClipboardPenLine, Settings2, AlertTriangle, TrendingUp, Wallet } from 'lucide-react'
import type { Asset, Customer, Driver, FuelOperation, InventoryItem, MaintenanceTechnician, Project, StockMovement, Warehouse, WorkOrder, User, Operation } from '../../types/tfms'
import type { Repository } from '../../core/repository/types'
import type { ReportKey } from '../../pages/ReportsPage'
import type { Trip, TripCost } from '../../features/trips/types'
import { GENERIC_MODULES } from '../../config/modules'
import { ROUTE_DESCRIPTIONS, ROUTE_TITLES } from './routeRegistry'
import { RouteGuard } from './RouteGuard'
import { registerModuleIcons } from '../../components/shell/AppNavbar'
import { repository } from '../../services/repositoryFactory'
import type { KemexModuleRecord, KemexWorkflowAction } from '../../features/app/hooks/useKemexMutations'


const AssetsPage = lazy(() => import('../../pages/AssetsPage').then(m => ({ default: m.AssetsPage })))
const AssetDetailPage = lazy(() => import('../../pages/AssetDetailPage').then(m => ({ default: m.AssetDetailPage })))
const BreakdownDetailPage = lazy(() => import('../../pages/BreakdownDetailPage').then(m => ({ default: m.BreakdownDetailPage })))
const NewBreakdownWizard = lazy(() => import('../../pages/NewBreakdownWizard').then(m => ({ default: m.NewBreakdownWizard })))
const ModulePlaceholderPage = lazy(() => import('../../pages/ModulePlaceholderPage').then(m => ({ default: m.ModulePlaceholderPage })))
const AssignmentCreatePage = lazy(() => import('../../pages/AssignmentCreatePage').then(m => ({ default: m.AssignmentCreatePage })))
const ModuleRecordsPage = lazy(() => import('../../pages/ModuleRecordsPage').then(m => ({ default: m.ModuleRecordsPage })))
const AlertsPage = lazy(() => import('../../pages/AlertsPage').then(m => ({ default: m.AlertsPage })))
const DashboardPage = lazy(() => import('../../pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const ProjectDetailPage = lazy(() => import('../../pages/ProjectDetailPage').then(m => ({ default: m.ProjectDetailPage })))
const TripsPage = lazy(() => import('../../pages/TripsPage').then(m => ({ default: m.TripsPage })))
const TripDetailPage = lazy(() => import('../../pages/TripDetailPage').then(m => ({ default: m.TripDetailPage })))
const FleetWorkspacePage = lazy(() => import('../../pages/WorkspacesPage').then(m => ({ default: m.FleetWorkspacePage })))
const MaintenanceWorkspacePage = lazy(() => import('../../pages/WorkspacesPage').then(m => ({ default: m.MaintenanceWorkspacePage })))
const OperationsWorkspacePage = lazy(() => import('../../pages/WorkspacesPage').then(m => ({ default: m.OperationsWorkspacePage })))
const InventoryWorkspacePage = lazy(() => import('../../pages/WorkspacesPage').then(m => ({ default: m.InventoryWorkspacePage })))
const FinanceWorkspacePage = lazy(() => import('../../pages/WorkspacesPage').then(m => ({ default: m.FinanceWorkspacePage })))
const AdminWorkspacePage = lazy(() => import('../../pages/WorkspacesPage').then(m => ({ default: m.AdminWorkspacePage })))

const AuditPage = lazy(() => import('../../pages/AuditPage').then(m => ({ default: m.AuditPage })))
const SettingsPage = lazy(() => import('../../pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const ReportsPage = lazy(() => import('../../pages/ReportsPage').then(m => ({ default: m.ReportsPage })))
const TrueCostReportPage = lazy(() => import('../../pages/TrueCostReportPage').then(m => ({ default: m.TrueCostReportPage })))

registerModuleIcons({
  LayoutDashboard, Bell, ClipboardList, FileCheck2, Gauge, Truck, Building2, Container, UserRound,
  BriefcaseBusiness, CalendarClock, Wrench, Droplets, CircleDot, Fuel, Boxes, ArrowLeftRight,
  ShoppingCart, Coins, ChartColumn, ReceiptText, ChartNoAxesCombined, Users, ClipboardPenLine, Settings2,
  AlertTriangle, TrendingUp, Wallet,
})

type RouteHandler = (route: string) => void

type AppRoutesProps = {
  user: User
  assets: Asset[]
  projects: Project[]
  workOrders: WorkOrder[]
  clients: Customer[]
  costCenters: Array<{ id: string; code: string; name: string; active: boolean }>
  assetTypes: Array<{ id: string; code: string; name: string; defaultMeterType: string; standardConsumption?: number; billingUnit?: string; billingRate?: number; billingMinimum?: number; active: boolean }>
  chargingRates: Array<{ id: string; assetTypeId?: string; assetId?: string; projectId?: string; unit: string; rate: number; minimum?: number; active: boolean }>
  warehouses: Warehouse[]
  inventoryItems: InventoryItem[]
  stockMovements: StockMovement[]
  trips: Trip[]
  tripCosts: TripCost[]
  maintenanceTechnicians: MaintenanceTechnician[]
  fuelOps: FuelOperation[]
  moduleData: Record<string, KemexModuleRecord[]>
  approvalEvents: Record<string, unknown>[]
  systemSettings: { alertDays: number; alertKm: number; alertHours: number; vat: number; currencyCode: string }
  navigate: RouteHandler
  saveProject: (project: Project) => Promise<void>
  saveClient: (client: Customer) => Promise<void>
  saveAsset: (asset: Asset) => Promise<void>
  saveMaintenanceTechnician: (technician: MaintenanceTechnician) => Promise<void>
  saveWarehouse: (warehouse: Warehouse) => Promise<void>
  saveInventoryItem: (item: InventoryItem) => Promise<void>
  createInventoryItem: (input: Omit<InventoryItem, 'currentQty' | 'openingQty'> & { openingQty: number; openingUnitCost: number }) => Promise<InventoryItem>
  postStockMovement: (input: Parameters<Repository['postStockMovement']>[0]) => Promise<{ item: InventoryItem; movement: StockMovement }>
  receivePurchase: (input: { purchase: KemexModuleRecord; inventoryItemId: string; warehouseId: string; quantity: number; unitCost: number; notes: string }) => Promise<StockMovement>
  saveWorkOrder: (workOrder: WorkOrder) => Promise<void>
  saveFuelOperation: (operation: FuelOperation) => Promise<void>
  saveModule: (module: string, record: KemexModuleRecord) => Promise<void>
  createPurchaseFromInventory: (item: KemexModuleRecord) => Promise<void>
  workflowModule: (record: KemexModuleRecord, previous: KemexModuleRecord, action: KemexWorkflowAction) => Promise<void>
  deleteModule: (module: string, id: string) => Promise<void>
  invalidateData: () => Promise<void>
}

type AssetDetailRouteProps = Pick<AppRoutesProps, 'assets' | 'projects' | 'workOrders' | 'fuelOps' | 'trips' | 'moduleData'> & {
  operations: Operation[]
  onRoute: RouteHandler
}

function AssetDetailRoute({ assets, projects, operations, fuelOps, workOrders, trips, moduleData, onRoute }: AssetDetailRouteProps) {
  const { id } = useParams()
  const selected = assets.find(asset => asset.id === decodeURIComponent(id ?? ''))
  return <AssetDetailPage asset={selected} assets={assets} projects={projects} operations={operations} fuelOps={fuelOps} workOrders={workOrders} trips={trips as never} moduleData={moduleData} onBack={() => onRoute('assets')} onEdit={(asset: Asset) => onRoute(`assets/edit/${asset.id}`)} onRoute={onRoute} />
}

function AssetEditRoute({ assets, projects, onSave, onRoute, canEdit }: {
  assets: Asset[]
  projects: Project[]
  onSave: (asset: Asset) => Promise<void>
  onRoute: RouteHandler
  canEdit: boolean
}) {
  const { id } = useParams()
  return <AssetsPage assets={assets} projects={projects} onSave={onSave} onRoute={onRoute} canEdit={canEdit} focusAssetId={decodeURIComponent(id ?? '')} />
}

function ProjectDetailRoute({ projects, assets, operations, workOrders, fuelOps, trips, tripCosts, moduleData, onRoute }: {
  projects: Project[]
  assets: Asset[]
  operations: Operation[]
  workOrders: WorkOrder[]
  fuelOps: FuelOperation[]
  trips: Trip[]
  tripCosts: TripCost[]
  moduleData: Record<string, KemexModuleRecord[]>
  approvalEvents: Record<string, unknown>[]
  onRoute: RouteHandler
}) {
  const { id } = useParams()
  const selectedProject = projects.find(project => project.id === decodeURIComponent(id ?? ''))
  if (!selectedProject) return <ModulePlaceholderPage title="المشروع غير موجود" description="المشروع المطلوب غير موجود في قاعدة البيانات." onRoute={onRoute} />
  return <ProjectDetailPage project={selectedProject} assets={assets} operations={operations} workOrders={workOrders} fuelOps={fuelOps} trips={trips as never} tripCosts={tripCosts as never} invoices={moduleData.invoices ?? []} repository={repository} moduleData={moduleData} onBack={() => onRoute('projects')} onRoute={onRoute} />
}

function BreakdownDetailRoute({ assets, projects, drivers, clients, workOrders, onCreateWorkOrder, canEdit, onRoute }: {
  assets: Asset[]
  projects: Project[]
  drivers: Driver[]
  clients: Customer[]
  workOrders: WorkOrder[]
  onCreateWorkOrder: (workOrder: WorkOrder) => Promise<void>
  canEdit: boolean
  onRoute: RouteHandler
}) {
  const { id } = useParams()
  return <BreakdownDetailPage id={decodeURIComponent(id ?? '')} assets={assets} projects={projects} drivers={drivers} clients={clients as never} workOrders={workOrders} onBack={() => onRoute('breakdowns')} onCreateWorkOrder={onCreateWorkOrder} canEdit={canEdit} />
}

function AssignmentCreateRoute({ moduleData, assets, projects, userName, onSaveAssignment, onSaveAsset, onUpdateRequest, allowed, onRoute }: {
  moduleData: Record<string, KemexModuleRecord[]>
  approvalEvents: Record<string, unknown>[]
  assets: Asset[]
  projects: Project[]
  userName: string
  onSaveAssignment: (record: KemexModuleRecord) => Promise<void>
  onSaveAsset: (asset: Asset) => Promise<void>
  onUpdateRequest: (record: KemexModuleRecord) => Promise<void>
  allowed: boolean
  onRoute: RouteHandler
}) {
  const { requestId } = useParams()
  if (!allowed) return <ModulePlaceholderPage title="غير مصرح" description="لا تملك صلاحية إنشاء تخصيص أصل من طلب معدات." onRoute={onRoute} />
  const id = decodeURIComponent(requestId ?? '')
  const request = (moduleData.requests ?? []).find(record => String(record.id ?? '') === id) ?? null
  return <AssignmentCreatePage request={request} assets={assets} projects={projects} userName={userName} onSaveAssignment={onSaveAssignment} onSaveAsset={onSaveAsset} onUpdateRequest={onUpdateRequest} onBack={() => onRoute('requests')} />
}

function TripDetailRoute({ assets, drivers, projects, currencyCode, onRoute }: {
  assets: Asset[]
  drivers: Driver[]
  projects: Project[]
  currencyCode: string
  onRoute: RouteHandler
}) {
  const { id } = useParams()
  return <TripDetailPage id={decodeURIComponent(id ?? '')} assets={assets} drivers={drivers} projects={projects} currencyCode={currencyCode} onBack={() => onRoute('trips')} />
}

function ReportsKeyRoute(props: Omit<ComponentProps<typeof ReportsPage>, 'initialKind'>) {
  const { key } = useParams()
  return <ReportsPage {...props} initialKind={key as ReportKey} />
}

function GenericModuleRoute({ moduleData, assets, projects, drivers, workOrders, onSave, onWorkflow, onNavigate, onDelete, user, titleFallback }: {
  moduleData: Record<string, KemexModuleRecord[]>
  approvalEvents: Record<string, unknown>[]
  assets: Asset[]
  projects: Project[]
  drivers: Driver[]
  workOrders: WorkOrder[]
  onSave: (module: string, record: KemexModuleRecord) => Promise<void>
  onWorkflow: (record: KemexModuleRecord, previous: KemexModuleRecord, action: KemexWorkflowAction) => Promise<void>
  onNavigate: RouteHandler
  onDelete: (module: string, id: string) => Promise<void>
  user: User
  titleFallback: (key: string) => string
}) {
  const { moduleKey } = useParams()
  const module = moduleKey ?? ''
  if (!GENERIC_MODULES.includes(module)) return <ModulePlaceholderPage title={ROUTE_TITLES[module] ?? module} description={titleFallback(module)} onRoute={onNavigate} />
  return <ModuleRecordsPage module={module} records={moduleData[module] ?? []} assets={assets} projects={projects} drivers={drivers} workOrders={workOrders} moduleData={moduleData} onSave={record => onSave(module, record)} onWorkflow={onWorkflow} onNavigate={onNavigate} onDelete={id => onDelete(module, id)} user={user} />
}

export function AppRoutes({
  user,
  assets,
  projects,
  workOrders,
  clients,
  costCenters,
  assetTypes,
  chargingRates,
  warehouses,
  inventoryItems,
  stockMovements,
  trips,
  tripCosts,
  maintenanceTechnicians,
  fuelOps,
  moduleData,
  approvalEvents,
  systemSettings,
  navigate,
  saveProject,
  saveClient,
  saveAsset,
  saveMaintenanceTechnician,
  saveWarehouse,
  saveInventoryItem,
  createInventoryItem,
  postStockMovement,
  receivePurchase,
  saveWorkOrder,
  saveFuelOperation,
  saveModule,
  createPurchaseFromInventory,
  workflowModule,
  deleteModule,
  invalidateData,
}: AppRoutesProps) {
  const guard = (module: string, element: ReactNode) => <RouteGuard role={user.role} module={module} onRoute={navigate}>{element}</RouteGuard>
  const drivers = (moduleData.drivers as Driver[]) || []
  const contracts = (moduleData.contracts as any[]) || []
  const operations = (moduleData.operations as Operation[]) || []
  const assignmentAllowed = ['admin', 'fleet'].includes(user.role)
  const breakdownCanEdit = ['admin', 'fleet', 'maint', 'pm'].includes(user.role)
  const assetsCanEdit = ['admin', 'fleet', 'pm'].includes(user.role)

  const maintenanceWorkspaceProps = {
    assets, projects, drivers, workOrders, technicians: maintenanceTechnicians,
    moduleData, onSaveWorkOrder: saveWorkOrder, onSaveTechnician: saveMaintenanceTechnician,
    onSaveModule: saveModule, onRoute: navigate, user, canEdit: ['admin', 'fleet', 'maint'].includes(user.role),
  }
  const operationsWorkspaceProps = {
    assets, projects, drivers, workOrders, clients, costCenters, moduleData,
    fuelOps, user, onSaveFuel: saveFuelOperation, onSaveProject: saveProject, onSaveModule: saveModule,
    onDeleteModule: deleteModule, onWorkflow: workflowModule, onRoute: navigate,
  }
  const inventoryWorkspaceProps = {
    items: inventoryItems, warehouses, stockMovements, assets, projects, workOrders, user, moduleData,
    onCreate: createInventoryItem, onUpdate: saveInventoryItem, onPostMovement: postStockMovement,
    onCreatePurchase: createPurchaseFromInventory,
    onReceivePurchase: receivePurchase, onSaveWarehouse: saveWarehouse, onSaveModule: saveModule,
  }
  const financeWorkspaceProps = {
    assets, projects, workOrders, fuelOps, moduleData, chargingRates, assetTypes, drivers,
    clients, user, onSaveModule: saveModule, repository, vatRate: Number(systemSettings.vat || 0), onSaveClient: saveClient,
  }
  const fleetWorkspaceProps = {
    assets, projects, drivers, moduleData, onSaveAsset: saveAsset, onRoute: navigate,
    canEditAssets: assetsCanEdit, user, onSaveModule: saveModule,
    onDeleteModule: deleteModule, onWorkflow: workflowModule,
  }

  return <Routes>
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="dashboard" element={guard('dashboard', <DashboardPage assets={assets} projects={projects} workOrders={workOrders} fuelOps={fuelOps} operations={operations} onRoute={navigate} />)} />
    <Route path="alerts" element={guard('alerts', <AlertsPage assets={assets} workOrders={workOrders} fuelOps={fuelOps} drivers={drivers as any} contracts={contracts} onRoute={navigate} alertDays={systemSettings.alertDays} alertKm={systemSettings.alertKm} alertHours={systemSettings.alertHours} plans={moduleData.plans ?? []} oils={moduleData.oils ?? []} />)} />
    <Route path="operations" element={guard('operations', <OperationsWorkspacePage {...operationsWorkspaceProps} />)} />
    <Route path="assets" element={guard('assets', <FleetWorkspacePage {...fleetWorkspaceProps} />)} />
    <Route path="assets/edit/:id" element={guard('assets', <AssetEditRoute assets={assets} projects={projects} onSave={saveAsset} onRoute={navigate} canEdit={assetsCanEdit} />)} />
    <Route path="asset/:id" element={guard('assets', <AssetDetailRoute assets={assets} projects={projects} operations={operations} fuelOps={fuelOps} workOrders={workOrders} trips={trips} moduleData={moduleData} onRoute={navigate} />)} />
    <Route path="contracts" element={guard('contracts', <FleetWorkspacePage initialTab="contracts" {...fleetWorkspaceProps} />)} />
    <Route path="drivers" element={guard('drivers', <FleetWorkspacePage initialTab="drivers" {...fleetWorkspaceProps} />)} />
    <Route path="maintenance" element={guard('maintenance', <MaintenanceWorkspacePage {...maintenanceWorkspaceProps} />)} />
    <Route path="breakdowns" element={guard('breakdowns', <MaintenanceWorkspacePage initialTab="breakdowns" {...maintenanceWorkspaceProps} />)} />
    <Route path="breakdowns/new" element={guard('breakdowns', <NewBreakdownWizard assets={assets} projects={projects} drivers={drivers} onRoute={navigate} onBack={() => navigate('breakdowns')} />)} />
    <Route path="breakdowns/:id" element={guard('breakdowns', <BreakdownDetailRoute assets={assets} projects={projects} drivers={drivers} clients={clients} workOrders={workOrders} onCreateWorkOrder={saveWorkOrder} canEdit={breakdownCanEdit} onRoute={navigate} />)} />
    <Route path="plans" element={guard('plans', <MaintenanceWorkspacePage initialTab="plans" {...maintenanceWorkspaceProps} />)} />
    <Route path="oils" element={guard('oils', <MaintenanceWorkspacePage initialTab="oils" {...maintenanceWorkspaceProps} />)} />
    <Route path="tires" element={guard('tires', <MaintenanceWorkspacePage initialTab="tires" {...maintenanceWorkspaceProps} />)} />
    <Route path="true-cost" element={guard('true-cost', <TrueCostReportPage />)} />
    <Route path="reports/true-cost" element={<Navigate to="/true-cost" replace />} />
    <Route path="inventory" element={guard('inventory', <InventoryWorkspacePage {...inventoryWorkspaceProps} />)} />
    <Route path="movements" element={<Navigate to="/inventory" replace />} />
    <Route path="purchases" element={guard('purchases', <InventoryWorkspacePage initialTab="purchases" {...inventoryWorkspaceProps} />)} />
    <Route path="fuel" element={guard('fuel', <OperationsWorkspacePage initialTab="fuel" {...operationsWorkspaceProps} />)} />
    <Route path="projects" element={guard('projects', <OperationsWorkspacePage initialTab="projects" {...operationsWorkspaceProps} />)} />
    <Route path="project/:id" element={guard('projects', <ProjectDetailRoute projects={projects} assets={assets} operations={operations} workOrders={workOrders} fuelOps={fuelOps} trips={trips} tripCosts={tripCosts} moduleData={moduleData} approvalEvents={approvalEvents} onRoute={navigate} />)} />
    <Route path="costs" element={guard('costs', <FinanceWorkspacePage initialTab="costs" {...financeWorkspaceProps} />)} />
    <Route path="charging" element={guard('charging', <FinanceWorkspacePage initialTab="charging" {...financeWorkspaceProps} />)} />
    <Route path="invoices" element={guard('invoices', <FinanceWorkspacePage initialTab="invoices" {...financeWorkspaceProps} />)} />
    <Route path="customers" element={guard('customers', <FinanceWorkspacePage initialTab="customers" {...financeWorkspaceProps} />)} />
    <Route path="reports" element={guard('reports', <ReportsPage assets={assets} projects={projects} workOrders={workOrders} fuelOps={fuelOps} operations={operations} moduleData={moduleData} trips={trips} tripCosts={tripCosts} onRoute={navigate} />)} />
    <Route path="reports/:key" element={guard('reports', <ReportsKeyRoute assets={assets} projects={projects} workOrders={workOrders} fuelOps={fuelOps} operations={operations} moduleData={moduleData} trips={trips} tripCosts={tripCosts} onRoute={navigate} />)} />
    <Route path="users" element={guard('users', <AdminWorkspacePage user={user} repository={repository} moduleData={moduleData} assets={assets} projects={projects} drivers={drivers} workOrders={workOrders} onSaved={invalidateData} />)} />
    <Route path="audit" element={guard('audit', <AuditPage records={moduleData.audit ?? []} approvalEvents={approvalEvents} assets={assets} projects={projects} drivers={drivers} workOrders={workOrders} moduleData={moduleData} />)} />
    <Route path="settings" element={guard('settings', <SettingsPage user={user} repository={repository} onSaved={invalidateData} />)} />
    <Route path="trips" element={guard('trips', <TripsPage assets={assets} drivers={drivers} projects={projects} clients={clients} onRoute={navigate} initialView="list" currencyCode={systemSettings.currencyCode} />)} />
    <Route path="trips/dispatch" element={guard('trips', <TripsPage assets={assets} drivers={drivers} projects={projects} clients={clients} onRoute={navigate} initialView="board" currencyCode={systemSettings.currencyCode} />)} />
    <Route path="trips/:id" element={guard('trips', <TripDetailRoute assets={assets} drivers={drivers} projects={projects} currencyCode={systemSettings.currencyCode} onRoute={navigate} />)} />
    <Route path="assignments/new/:requestId" element={guard('assignments', <AssignmentCreateRoute moduleData={moduleData} approvalEvents={approvalEvents} assets={assets} projects={projects} userName={user.name} onSaveAssignment={record => saveModule('assignments', record)} onSaveAsset={saveAsset} onUpdateRequest={record => saveModule('requests', record)} allowed={assignmentAllowed} onRoute={navigate} />)} />
    <Route path=":moduleKey" element={<GenericModuleRoute moduleData={moduleData} approvalEvents={approvalEvents} assets={assets} projects={projects} drivers={drivers} workOrders={workOrders} onSave={saveModule} onWorkflow={workflowModule} onNavigate={navigate} onDelete={deleteModule} user={user} titleFallback={key => ROUTE_DESCRIPTIONS[key] ?? 'وحدة من وحدات إدارة النقل والأسطول.'} />} />
    <Route path="*" element={<ModulePlaceholderPage title="غير موجود" description="المسار المطلوب غير موجود." onRoute={navigate} />} />
  </Routes>

}

export type { AppRoutesProps }
