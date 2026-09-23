import type { Asset, AssetCostEntry, AssetCostSummary, AssetDocument, AssetFinancialSummary, AuditEntry, Customer, FuelOperation, InventoryItem, MaintenancePart, MaintenanceTechnician, Project, StockMovement, StockMovementType, User, Warehouse, WorkOrder } from '../../types/tfms'

export type AnyRecord = Record<string, unknown>

/** Contract shared by Production (Supabase) and development/demo (LocalStorage) data adapters. */
export interface Repository {
  readonly mode: 'supabase' | 'local'
  isRemote(): boolean
  setAuditActor(user: User): void
  clearAuditActor(): void
  getCurrentUser(): Promise<User | null>
  signIn(username: string, password: string): Promise<User>
  changePassword(newPassword: string): Promise<void>
  signOut(): Promise<void>
  createUserAccount(input: { email: string; full_name: string; role: User['role']; initial_password: string }): Promise<{ id:string; email:string; name:string; role:User['role']; active:boolean; mustChangePassword:boolean }>
  listUsers(): Promise<User[]>
  updateUserProfile(id: string, patch: { full_name?: string; role?: User['role']; active?: boolean }): Promise<User>
  getSettings(): Promise<Record<string, unknown>>
  saveSettings(settings: { company_name: string; group_name: string; currency_code: string; vat: number; diesel: number; petrol: number; alert_days: number; alert_km: number; alert_hours: number }): Promise<void>
  listClients(): Promise<Customer[]>
  saveClient(client: Customer): Promise<void>
  listCostCenters(): Promise<Array<{ id: string; code: string; name: string; active: boolean }>>
  listAssetTypes(): Promise<Array<{ id: string; code: string; name: string; defaultMeterType: string; standardConsumption?: number; billingUnit?: string; billingRate?: number; billingMinimum?: number; active: boolean }>>
  listChargingRates(): Promise<Array<{ id: string; assetTypeId?: string; assetId?: string; projectId?: string; unit: string; rate: number; minimum?: number; active: boolean }>>
  listWarehouses(): Promise<Warehouse[]>
  saveWarehouse(warehouse: Warehouse): Promise<void>
  listInventoryItems(): Promise<InventoryItem[]>
  createInventoryItem(input: Omit<InventoryItem, 'currentQty' | 'openingQty'> & { openingQty: number; openingUnitCost: number }): Promise<InventoryItem>
  updateInventoryItem(item: InventoryItem): Promise<void>
  listStockMovements(itemId?: string): Promise<StockMovement[]>
  postStockMovement(input: { id?: string; itemId: string; movementType: StockMovementType; quantity: number; movementDate: string; unitCost?: number; warehouseId?: string; assetId?: string; workOrderId?: string; projectId?: string; referenceType?: string; referenceId?: string; notes?: string }): Promise<{ item: InventoryItem; movement: StockMovement }>
  listMaintenanceTechnicians(): Promise<MaintenanceTechnician[]>
  saveMaintenanceTechnician(technician: MaintenanceTechnician): Promise<void>
  listMaintenanceParts(workOrderId?: string): Promise<MaintenancePart[]>
  saveMaintenancePart(part: MaintenancePart): Promise<void>
  getProjectCost30d(projectId: string): Promise<{ projectId: string; projectCode: string; projectName: string; totalCost30d: number; costEntries30d: number }>
  listAuditLog(): Promise<AnyRecord[]>
  listApprovalEvents(): Promise<AnyRecord[]>
  listProjects(): Promise<Project[]>
  saveProject(project: Project): Promise<void>
  listAssets(): Promise<Asset[]>
  saveAsset(asset: Asset): Promise<unknown>
  listAssetDocuments(assetId: string): Promise<AssetDocument[]>
  listAssetCostEntries(assetId: string): Promise<AssetCostEntry[]>
  getAssetFinancialSummary(assetId: string): Promise<AssetFinancialSummary>
  getAssetCost30d(assetId: string): Promise<AssetCostSummary>
  listAssetAudit(assetId: string): Promise<AuditEntry[]>
  listWorkOrders(): Promise<WorkOrder[]>
  saveWorkOrder(workOrder: WorkOrder): Promise<void>
  listFuel(): Promise<FuelOperation[]>
  saveFuelOperation(operation: FuelOperation): Promise<void>
  listModuleRecords(module: string): Promise<AnyRecord[]>
  saveModuleRecord(module: string, record: AnyRecord): Promise<AnyRecord>
  deleteModuleRecord(module: string, id: string): Promise<void>
  listOperations(): Promise<AnyRecord[]>
}

export type DataMode = 'supabase' | 'local'
