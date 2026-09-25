import { type ReactNode } from 'react'
import type { Asset, Customer, Driver, FuelOperation, InventoryItem, MaintenanceTechnician, Project, StockMovement, User, Warehouse, WorkOrder } from '../types/tfms'
import type { Repository } from '../core/repository/types'
import type { WorkflowAction } from '../config/modules'
import { canViewModule, canWriteModule } from '../config/app'
import { AssetsPage } from './AssetsPage'
import { ProjectsPage } from './ProjectsPage'
import { DriversPage } from './DriversPage'
import { MaintenancePage } from './MaintenancePage'
import { BreakdownListPage } from './BreakdownListPage'
import { PlansPage } from './PlansPage'
import { OilsPage } from './OilsPage'
import { TiresPage } from './TiresPage'
import { InventoryPage } from './InventoryPage'
import { PurchasesPage } from './PurchasesPage'
import { CostsPage } from './CostsPage'
import { ChargingPage } from './ChargingPage'
import { InvoicesPage } from './InvoicesPage'
import { CustomersPage } from './CustomersPage'
import { UsersPage } from './UsersPage'
import { AuditPage } from './AuditPage'
import { SettingsPage } from './SettingsPage'
import { FuelPage } from './FuelPage'
import { ModuleRecordsPage } from './ModuleRecordsPage'
import { ContractsPage } from './ContractsPage'

function Workspace({ children }: { children: ReactNode }) {
  return <main className="workspace-contentless enterprise-page" dir="rtl">{children}</main>
}

export function FleetWorkspacePage(props:{assets:Asset[];projects:Project[];drivers:Driver[];moduleData:Record<string,Record<string,unknown>[]>;onSaveAsset:(asset:Asset)=>Promise<void>;onRoute:(route:string)=>void;canEditAssets:boolean;user:User;onSaveModule:(module:string,record:Record<string,unknown>)=>Promise<void>;onDeleteModule:(module:string,id:string)=>Promise<void>;onWorkflow:(record:Record<string,unknown>,previous:Record<string,unknown>,action:WorkflowAction)=>Promise<void>;initialTab?:'assets'|'drivers'|'contracts'}) {
  const visibleTabs = ['assets', ...(canViewModule(props.user.role,'drivers') ? ['drivers'] : []), ...(canViewModule(props.user.role,'contracts') ? ['contracts'] : [])] as const
  const tab = props.initialTab && visibleTabs.includes(props.initialTab) ? props.initialTab : 'assets'
  return <Workspace>
    {tab==='assets'&&<AssetsPage assets={props.assets} projects={props.projects} onSave={props.onSaveAsset} onRoute={props.onRoute} canEdit={props.canEditAssets}/>} 
    {tab==='drivers'&&<DriversPage drivers={props.drivers} assets={props.assets} canEdit={props.canEditAssets && canWriteModule('drivers',props.user.role)} onSave={(record)=>props.onSaveModule('drivers',record)}/>} 
    {tab==='contracts'&&<ContractsPage records={props.moduleData.contracts??[]} assets={props.assets} canEdit={canWriteModule('contracts',props.user.role)} onSave={(record)=>props.onSaveModule('contracts',record)} onDelete={(id)=>props.onDeleteModule('contracts',id)}/>} 
  </Workspace>
}

export function MaintenanceWorkspacePage(props:{assets:Asset[];projects:Project[];drivers:Driver[];workOrders:WorkOrder[];technicians:MaintenanceTechnician[];moduleData:Record<string,Record<string,unknown>[]>;onSaveWorkOrder:(workOrder:WorkOrder)=>Promise<void>;onSaveTechnician:(technician:MaintenanceTechnician)=>Promise<void>;onSaveModule:(module:string,record:Record<string,unknown>)=>Promise<void>;onRoute:(route:string)=>void;user:User;canEdit:boolean;initialTab?:'orders'|'breakdowns'|'plans'|'oils'|'tires'}) {
  const visibleTabs = ['orders', ...(canViewModule(props.user.role,'breakdowns') ? ['breakdowns'] : []), ...(canViewModule(props.user.role,'plans') ? ['plans'] : []), ...(canViewModule(props.user.role,'oils') ? ['oils'] : []), ...(canViewModule(props.user.role,'tires') ? ['tires'] : [])] as const
  const tab = props.initialTab && visibleTabs.includes(props.initialTab) ? props.initialTab : 'orders'
  return <Workspace>
    {tab==='orders'&&<MaintenancePage workOrders={props.workOrders} assets={props.assets} projects={props.projects} technicians={props.technicians} onSaveTechnician={props.onSaveTechnician} onSave={props.canEdit?props.onSaveWorkOrder:undefined}/>} 
    {tab==='breakdowns'&&<BreakdownListPage assets={props.assets} projects={props.projects} drivers={props.drivers} onRoute={props.onRoute} canEdit={props.canEdit}/>} 
    {tab==='plans'&&<PlansPage records={props.moduleData.plans??[]} assets={props.assets} onSave={canWriteModule('plans',props.user.role)?(record)=>props.onSaveModule('plans',record):async()=>{}} onCreateWorkOrder={async(workOrder)=>props.onSaveWorkOrder(workOrder)}/>} 
    {tab==='oils'&&<OilsPage plans={props.moduleData.oils??[]} changes={props.moduleData.oilChanges??[]} assets={props.assets} workOrders={props.workOrders} moduleData={props.moduleData} userName={props.user.name} canEdit={canWriteModule('oils',props.user.role)} onSavePlan={(record)=>props.onSaveModule('oils',record)} onSaveChange={(record)=>props.onSaveModule('oilChanges',record)}/>} 
    {tab==='tires'&&<TiresPage records={props.moduleData.tires??[]} operations={props.moduleData.tireOps??[]} assets={props.assets} canEdit={canWriteModule('tires',props.user.role)} onSave={(record)=>props.onSaveModule('tires',record)} onSaveOperation={(record)=>props.onSaveModule('tireOps',record)}/>} 
  </Workspace>
}

export function OperationsWorkspacePage(props:{assets:Asset[];projects:Project[];drivers:Driver[];workOrders:WorkOrder[];clients:Customer[];costCenters:Array<{id:string;code:string;name:string;active:boolean}>;moduleData:Record<string,Record<string,unknown>[]>;fuelOps:FuelOperation[];user:User;onSaveFuel:(record:FuelOperation)=>Promise<void>;onSaveProject:(project:Project)=>Promise<void>;onSaveModule:(module:string,record:Record<string,unknown>)=>Promise<void>;onDeleteModule:(module:string,id:string)=>Promise<void>;onWorkflow:(record:Record<string,unknown>,previous:Record<string,unknown>,action:WorkflowAction)=>Promise<void>;onRoute:(route:string)=>void;initialTab?:'operations'|'requests'|'assignments'|'fuel'|'projects'}) {
  const visibleTabs = ['operations', ...(canViewModule(props.user.role,'requests') ? ['requests'] : []), ...(canViewModule(props.user.role,'assignments') ? ['assignments'] : []), ...(canViewModule(props.user.role,'fuel') ? ['fuel'] : []), ...(canViewModule(props.user.role,'projects') ? ['projects'] : [])] as const
  const tab = props.initialTab && visibleTabs.includes(props.initialTab) ? props.initialTab : 'operations'
  const shared=(module:string)=><ModuleRecordsPage module={module} records={props.moduleData[module]??[]} onSave={(record)=>props.onSaveModule(module,record)} onDelete={(id)=>props.onDeleteModule(module,id)} onWorkflow={props.onWorkflow} onNavigate={props.onRoute} user={props.user} assets={props.assets} projects={props.projects} drivers={props.drivers} workOrders={props.workOrders} moduleData={props.moduleData}/>
  return <Workspace>
    {tab==='operations'&&shared('operations')}
    {tab==='requests'&&shared('requests')}
    {tab==='assignments'&&shared('assignments')}
    {tab==='projects'&&<ProjectsPage projects={props.projects} assets={props.assets} clients={props.clients} costCenters={props.costCenters} onSave={canWriteModule('projects',props.user.role)?props.onSaveProject:undefined} onOpenDetail={project=>props.onRoute(`project/${project.id}`)}/>}{tab==='fuel'&&<FuelPage fuelOps={props.fuelOps} assets={props.assets} projects={props.projects} onSave={canWriteModule('fuel',props.user.role)?props.onSaveFuel:undefined}/>} 
  </Workspace>
}

export function InventoryWorkspacePage(props:{items:InventoryItem[];warehouses:Warehouse[];stockMovements:StockMovement[];assets:Asset[];projects:Project[];workOrders:WorkOrder[];user:User;moduleData:Record<string,Record<string,unknown>[]>;onCreate:(input:InventoryItem & {openingQty:number;openingUnitCost:number})=>Promise<InventoryItem>;onUpdate:(item:InventoryItem)=>Promise<void>;onPostMovement:(input:Parameters<Repository['postStockMovement']>[0])=>Promise<{item:InventoryItem;movement:StockMovement}>;onCreatePurchase:(item:InventoryItem)=>Promise<void>;onReceivePurchase?:(input:{purchase:Record<string,unknown>;inventoryItemId:string;warehouseId:string;quantity:number;unitCost:number;notes:string})=>Promise<StockMovement>;onSaveWarehouse:(warehouse:Warehouse)=>Promise<void>;onSaveModule:(module:string,record:Record<string,unknown>)=>Promise<void>;initialTab?:'inventory'|'purchases'}){
  const visibleTabs = ['inventory', ...(canViewModule(props.user.role,'purchases') ? ['purchases'] : [])] as const
  const tab = props.initialTab && visibleTabs.includes(props.initialTab) ? props.initialTab : 'inventory'
  return <Workspace>
    {tab==='inventory'&&<InventoryPage items={props.items} warehouses={props.warehouses} stockMovements={props.stockMovements} userName={props.user.name} assets={props.assets} projects={props.projects} workOrders={props.workOrders} onCreate={props.onCreate} onUpdate={props.onUpdate} onPostMovement={props.onPostMovement} onCreatePurchase={props.onCreatePurchase} onSaveWarehouse={props.onSaveWarehouse}/>} 
    {tab==='purchases'&&<PurchasesPage records={props.moduleData.purchases??[]} user={props.user} projects={props.projects} inventoryItems={props.items} warehouses={props.warehouses} canEdit={['admin','fleet','maint'].includes(props.user.role)} onSave={(record)=>props.onSaveModule('purchases',record)} onReceive={props.onReceivePurchase}/>} 
  </Workspace>
}

export function FinanceWorkspacePage(props:{assets:Asset[];projects:Project[];workOrders:WorkOrder[];fuelOps:FuelOperation[];moduleData:Record<string,Record<string,unknown>[]>;chargingRates:unknown[];assetTypes:unknown[];drivers:Driver[];clients:Customer[];user:User;onSaveModule:(module:string,record:Record<string,unknown>)=>Promise<void>;repository:Repository;vatRate:number;onSaveClient:(client:Customer)=>Promise<void>;initialTab?:'costs'|'charging'|'invoices'|'customers'}){
  const visibleTabs = ['costs', ...(canViewModule(props.user.role,'charging') ? ['charging'] : []), ...(canViewModule(props.user.role,'invoices') ? ['invoices'] : []), ...(canViewModule(props.user.role,'customers') ? ['customers'] : [])] as const
  const tab = props.initialTab && visibleTabs.includes(props.initialTab) ? props.initialTab : 'costs'
  return <Workspace>
    {tab==='costs'&&<CostsPage assets={props.assets} projects={props.projects} workOrders={props.workOrders} fuelOps={props.fuelOps} moduleData={props.moduleData}/>} 
    {tab==='charging'&&<ChargingPage assets={props.assets} projects={props.projects} moduleData={props.moduleData} workOrders={props.workOrders} fuelOps={props.fuelOps} chargingRates={props.chargingRates as never} assetTypes={props.assetTypes as never}/>} 
    {tab==='invoices'&&<InvoicesPage records={props.moduleData.invoices??[]} user={props.user} canEdit={['admin','acct'].includes(props.user.role)} vatRate={props.vatRate} assets={props.assets} projects={props.projects} drivers={props.drivers} workOrders={props.workOrders} moduleData={props.moduleData} onSave={(record)=>props.onSaveModule('invoices',record)}/>} 
    {tab==='customers'&&<CustomersPage customers={props.clients} invoices={props.moduleData.invoices??[]} canEdit={['admin','acct'].includes(props.user.role)} onSave={props.onSaveClient}/>} 
  </Workspace>
}

export function AdminWorkspacePage(props:{user:User;repository:Repository;moduleData:Record<string,Record<string,unknown>[]>;assets:Asset[];projects:Project[];drivers:Driver[];workOrders:WorkOrder[];onSaved:()=>Promise<void>}){
 const tab = 'users' as 'users'|'audit'|'settings'
 return <Workspace>
  {tab==='users'&&<UsersPage user={props.user} repository={props.repository} drivers={props.drivers}/>} 
  {tab==='audit'&&<AuditPage records={props.moduleData.audit??[]} assets={props.assets} projects={props.projects} drivers={props.drivers} workOrders={props.workOrders} moduleData={props.moduleData}/>} 
  {tab==='settings'&&<SettingsPage user={props.user} repository={props.repository} onSaved={props.onSaved}/>} 
 </Workspace>
}
