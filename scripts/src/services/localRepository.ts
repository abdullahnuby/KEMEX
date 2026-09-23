import type { Asset, AssetCostEntry, AssetCostSummary, AssetDocument, AssetFinancialSummary, AuditEntry, FuelOperation, InventoryItem, MaintenancePart, MaintenanceTechnician, Project, Role, StockMovement, StockMovementType, User, Warehouse, WorkOrder } from '../types/tfms'
import type { AnyRecord, Repository } from '../core/repository/types'

const STORAGE_PREFIX = 'kemex:local:'
const SESSION_KEY = 'tfms-web-user'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T): void {
  localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value))
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function replaceById<T extends { id: string }>(records: T[], record: T): T[] {
  const index = records.findIndex(item => item.id === record.id)
  if (index === -1) return [record, ...records]
  const next = records.slice()
  next[index] = record
  return next
}

/** Local development adapter with an empty starting dataset. It never seeds mock records. */
export class LocalStorageRepository implements Repository {
  readonly mode = 'local' as const
  private auditActor: User | null = null

  isRemote(): boolean { return false }
  setAuditActor(user: User): void { this.auditActor = user }
  clearAuditActor(): void { this.auditActor = null }

  async getCurrentUser(): Promise<User | null> {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      return raw ? clone(JSON.parse(raw) as User) : null
    } catch {
      return null
    }
  }

  async signIn(username: string, password: string): Promise<User> {
    const normalized = username.trim().toLowerCase()
    const configuredEmail = (import.meta.env.VITE_LOCAL_ADMIN_EMAIL ?? '').trim().toLowerCase()
    const configuredPassword = String(import.meta.env.VITE_LOCAL_ADMIN_PASSWORD ?? '')
    const users = read<User[]>('users', [])
    const localUser = users.find(item => item.username.toLowerCase() === normalized)
    if (localUser) {
      if (localUser.active === false) throw new Error('هذا الحساب موقوف.')
      if (localUser.pass !== password) throw new Error('بيانات الدخول غير صحيحة.')
      localStorage.setItem(SESSION_KEY, JSON.stringify(localUser))
      return clone(localUser)
    }
    if (!configuredEmail || normalized !== configuredEmail) {
      throw new Error('الوضع المحلي يحتاج VITE_LOCAL_ADMIN_EMAIL مضبوطًا في بيئة التشغيل المحلية.')
    }
    if (configuredPassword && password !== configuredPassword) throw new Error('بيانات الدخول غير صحيحة.')
    const user: User = { id: 'local-admin', username: configuredEmail, name: 'مدير النظام المحلي', role: 'admin', active: true, mustChangePassword: false }
    localStorage.setItem(SESSION_KEY, JSON.stringify(user))
    return clone(user)
  }


  async changePassword(newPassword: string): Promise<void> {
    if (newPassword.length < 8) throw new Error('كلمة المرور يجب ألا تقل عن 8 أحرف.')
    const current = await this.getCurrentUser()
    if (!current) throw new Error('لا توجد جلسة مستخدم نشطة.')
    const users = read<User[]>('users', [])
    const updated: User = { ...current, mustChangePassword: false, pass: newPassword }
    write('users', replaceById(users, updated))
    localStorage.setItem(SESSION_KEY, JSON.stringify(updated))
  }

  async createUserAccount(input:{email:string;full_name:string;role:Role;initial_password:string}) {
    const users = read<User[]>('users', [])
    const email = input.email.trim().toLowerCase()
    if (users.some(user => user.username.toLowerCase() === email)) throw new Error('يوجد حساب محلي بهذا البريد بالفعل.')
    const user: User = { id:`local-${Date.now()}`, username:email, name:input.full_name.trim(), role:input.role, active:true, mustChangePassword:true, pass:input.initial_password }
    write('users', replaceById(users, user))
    return {id:user.id,email:user.username,name:user.name,role:user.role,active:true,mustChangePassword:true}
  }

  async signOut(): Promise<void> {
    localStorage.removeItem(SESSION_KEY)
    this.clearAuditActor()
  }

  async listUsers(): Promise<User[]> {
    return clone(read<User[]>('users', []))
  }

  async updateUserProfile(id: string, patch: { full_name?: string; role?: Role; active?: boolean }): Promise<User> {
    const users = read<User[]>('users', [])
    const current = users.find(user => user.id === id)
    if (!current) throw new Error('المستخدم غير موجود في الوضع المحلي.')
    const updated: User = { ...current, name: patch.full_name ?? current.name, role: patch.role ?? current.role, active: patch.active ?? current.active }
    write('users', replaceById(users, updated))
    return clone(updated)
  }

  async getSettings(): Promise<Record<string, unknown>> {
    return clone(read<Record<string, unknown>>('settings', {
      company_name: '', group_name: '', currency_code: 'EGP', vat: 0, diesel: 0, petrol: 0, alert_days: 30, alert_km: 1500, alert_hours: 80,
    }))
  }

  async saveSettings(settings: { company_name: string; group_name: string; currency_code: string; vat: number; diesel: number; petrol: number; alert_days: number; alert_km: number; alert_hours: number }): Promise<void> {
    write('settings', settings)
  }

  async listAuditLog(): Promise<AnyRecord[]> { return clone(read<AnyRecord[]>('audit', [])) }

  async listClients(): Promise<import('../types/tfms').Customer[]> {
    return clone(read<import('../types/tfms').Customer[]>('clients', []))
  }

  async saveClient(client: import('../types/tfms').Customer): Promise<void> {
    write('clients', replaceById(read<import('../types/tfms').Customer[]>('clients', []), clone(client)))
  }

  async listCostCenters(): Promise<Array<{ id:string; code:string; name:string; active:boolean }>> {
    return clone(read<Array<{ id:string; code:string; name:string; active:boolean }>>('costCenters', []))
  }

  async listAssetTypes(): Promise<Array<{ id:string; code:string; name:string; defaultMeterType:string; standardConsumption?:number; billingUnit?:string; billingRate?:number; billingMinimum?:number; active:boolean }>> {
    return clone(read<Array<{ id:string; code:string; name:string; defaultMeterType:string; standardConsumption?:number; billingUnit?:string; billingRate?:number; billingMinimum?:number; active:boolean }>>('assetTypes', []))
  }

  async listChargingRates(): Promise<Array<{ id:string; assetTypeId?:string; assetId?:string; projectId?:string; unit:string; rate:number; minimum?:number; active:boolean }>> {
    return clone(read<Array<{ id:string; assetTypeId?:string; assetId?:string; projectId?:string; unit:string; rate:number; minimum?:number; active:boolean }>>('chargingRates', []))
  }

  async listWarehouses(): Promise<Warehouse[]> { return clone(read<Warehouse[]>('warehouses', [])) }
  async saveWarehouse(warehouse: Warehouse): Promise<void> { write('warehouses', replaceById(read<Warehouse[]>('warehouses', []), clone(warehouse))) }

  async listInventoryItems(): Promise<InventoryItem[]> { return clone(read<InventoryItem[]>('inventoryItems', [])) }
  async createInventoryItem(input: Omit<InventoryItem, 'currentQty' | 'openingQty'> & { openingQty:number; openingUnitCost:number }): Promise<InventoryItem> {
    if (input.openingQty < 0 || input.openingUnitCost < 0) throw new Error('الرصيد الافتتاحي والتكلفة لا يمكن أن يكونا سالبين.')
    const item: InventoryItem = {...input, currentQty:0, openingQty:input.openingQty}
    let items = read<InventoryItem[]>('inventoryItems', [])
    items = replaceById(items,item)
    write('inventoryItems',items)
    if (input.openingQty > 0) await this.postStockMovement({itemId:item.id,movementType:'استلام',quantity:input.openingQty,movementDate:new Date().toISOString().slice(0,10),unitCost:input.openingUnitCost,warehouseId:input.warehouseId,referenceType:'opening_balance',referenceId:item.id,notes:'رصيد افتتاحي'})
    return clone(read<InventoryItem[]>('inventoryItems', []).find(x=>x.id===item.id)!)
  }
  async updateInventoryItem(item: InventoryItem): Promise<void> {
    const current = read<InventoryItem[]>('inventoryItems', []).find(x=>x.id===item.id)
    if (!current) throw new Error('الصنف المخزني غير موجود.')
    write('inventoryItems', replaceById(read<InventoryItem[]>('inventoryItems', []), {...item,currentQty:current.currentQty,openingQty:current.openingQty}))
  }
  async listStockMovements(itemId?: string): Promise<StockMovement[]> { const rows=read<StockMovement[]>('stockMovements', []); return clone(itemId?rows.filter(x=>x.itemId===itemId):rows) }
  async postStockMovement(input:{id?:string;itemId:string;movementType:StockMovementType;quantity:number;movementDate:string;unitCost?:number;warehouseId?:string;assetId?:string;workOrderId?:string;projectId?:string;referenceType?:string;referenceId?:string;notes?:string}):Promise<{item:InventoryItem;movement:StockMovement}> {
    if(!Number.isFinite(input.quantity)||input.quantity<=0)throw new Error('كمية الحركة يجب أن تكون أكبر من صفر.')
    const items=read<InventoryItem[]>('inventoryItems',[]); const item=items.find(x=>x.id===input.itemId); if(!item)throw new Error('صنف المخزون غير موجود.')
    const delta=['استلام','مرتجع','تسوية زيادة'].includes(input.movementType)?input.quantity:-input.quantity
    const nextQty=item.currentQty+delta; if(nextQty<0)throw new Error(`الرصيد غير كافٍ للصنف ${item.name}.`)
    const cost=input.unitCost && input.unitCost>0?input.unitCost:item.averageCost || item.lastPurchaseCost || 0
    const nextAverage=input.movementType==='استلام' && nextQty>0 ? ((item.currentQty*item.averageCost)+(input.quantity*cost))/nextQty : item.averageCost
    const nextItem={...item,currentQty:nextQty,averageCost:Number(nextAverage.toFixed(3)),lastPurchaseCost:input.movementType==='استلام'?cost:item.lastPurchaseCost}
    write('inventoryItems',replaceById(items,nextItem))
    const movement:StockMovement={id:input.id||`MV-${Date.now()}`,movementNo:`STK-${Date.now()}`,itemId:item.id,movementType:input.movementType,quantity:input.quantity,movementDate:input.movementDate,unitCost:cost,warehouseId:input.warehouseId,assetId:input.assetId,workOrderId:input.workOrderId,projectId:input.projectId,referenceType:input.referenceType,referenceId:input.referenceId,notes:input.notes,createdBy:this.auditActor?.id}
    write('stockMovements',[movement,...read<StockMovement[]>('stockMovements',[])])
    return {item:clone(nextItem),movement:clone(movement)}
  }
  async listMaintenanceTechnicians(): Promise<MaintenanceTechnician[]> { return clone(read<MaintenanceTechnician[]>('maintenanceTechnicians', [])) }
  async saveMaintenanceTechnician(technician: MaintenanceTechnician): Promise<void> { write('maintenanceTechnicians',replaceById(read<MaintenanceTechnician[]>('maintenanceTechnicians',[]),clone(technician))) }
  async listMaintenanceParts(workOrderId?: string): Promise<MaintenancePart[]> { const rows=read<MaintenancePart[]>('maintenanceParts',[]); return clone(workOrderId?rows.filter(x=>x.workOrderId===workOrderId):rows) }
  async saveMaintenancePart(part: MaintenancePart): Promise<void> { write('maintenanceParts',replaceById(read<MaintenancePart[]>('maintenanceParts',[]),clone(part))) }

  async listProjects(): Promise<Project[]> { return clone(read<Project[]>('projects', [])) }
  async saveProject(project: Project): Promise<void> { write('projects', replaceById(read<Project[]>('projects', []), clone(project))) }

  async getProjectCost30d(projectId: string): Promise<{ projectId: string; projectCode: string; projectName: string; totalCost30d: number; costEntries30d: number }> {
    const project = read<Project[]>('projects', []).find(item => item.id === projectId)
    if (!project) throw new Error('المشروع غير موجود.')
    const since = Date.now() - 29 * 86400000
    const entries = read<AssetCostEntry[]>('costEntries', []).filter(item => item.projectId === projectId && item.status !== 'ملغاة' && new Date(item.costDate).getTime() >= since)
    return { projectId, projectCode:project.code, projectName:project.name, totalCost30d:entries.reduce((sum,item)=>sum+Number(item.amount||0),0), costEntries30d:entries.length }
  }

  async listAssets(): Promise<Asset[]> { return clone(read<Asset[]>('assets', [])) }
  async saveAsset(asset: Asset): Promise<unknown> {
    write('assets', replaceById(read<Asset[]>('assets', []), clone(asset)))
    return clone(asset)
  }

  async listAssetDocuments(assetId: string): Promise<AssetDocument[]> {
    return clone(read<AssetDocument[]>('assetDocuments', []).filter(item => item.assetId === assetId))
  }

  async listAssetCostEntries(assetId: string): Promise<AssetCostEntry[]> {
    return clone(read<AssetCostEntry[]>('costEntries', []).filter(item => item.assetId === assetId))
  }

  async getAssetFinancialSummary(assetId: string): Promise<AssetFinancialSummary> {
    const asset = read<Asset[]>('assets', []).find(item => item.id === assetId)
    if (!asset) throw new Error('الأصل غير موجود.')
    const acquisition = Math.max(Number(asset.capex ?? 0), 0)
    const residual = Math.min(Math.max(Number(asset.resid ?? 0), 0), acquisition)
    const life = Math.max(Number(asset.life ?? 0), 0)
    const annual = acquisition > residual && life > 0 ? (acquisition - residual) / life : 0
    const elapsedYears = asset.buy ? Math.max((Date.now() - new Date(asset.buy).getTime()) / (365.25 * 86400000), 0) : 0
    const accumulated = annual > 0 ? Math.min(annual * elapsedYears, acquisition - residual) : 0
    return { id: asset.id, code: asset.code, name: asset.name, acquisitionCost: acquisition, residualValue: residual, usefulLifeYears: life, purchaseDate: asset.buy, annualDepreciation: annual, accumulatedDepreciation: accumulated, netBookValue: Math.max(acquisition - accumulated, residual) }
  }

  async getAssetCost30d(assetId: string): Promise<AssetCostSummary> {
    const asset = read<Asset[]>('assets', []).find(item => item.id === assetId)
    if (!asset) throw new Error('الأصل غير موجود.')
    const since = Date.now() - 29 * 86400000
    const entries = read<AssetCostEntry[]>('costEntries', []).filter(item => item.assetId === assetId && item.status !== 'ملغاة' && new Date(item.costDate).getTime() >= since)
    const sum = (category: AssetCostEntry['category']) => entries.filter(item => item.category === category).reduce((total, item) => total + Number(item.amount || 0), 0)
    return { assetId, assetCode: asset.code, assetName: asset.name, fuelCost30d: sum('fuel'), maintenanceCost30d: sum('maintenance'), tireCost30d: sum('tires'), totalCost30d: entries.reduce((total, item) => total + Number(item.amount || 0), 0) }
  }

  async listAssetAudit(assetId: string): Promise<AuditEntry[]> {
    return clone(read<AuditEntry[]>('audit', []).filter(item => item.entity === 'assets' && item.reference === assetId))
  }

  async listWorkOrders(): Promise<WorkOrder[]> { return clone(read<WorkOrder[]>('workOrders', [])) }
  async saveWorkOrder(workOrder: WorkOrder): Promise<void> { write('workOrders', replaceById(read<WorkOrder[]>('workOrders', []), clone(workOrder))) }

  async listFuel(): Promise<FuelOperation[]> { return clone(read<FuelOperation[]>('fuel', [])) }
  async saveFuelOperation(operation: FuelOperation): Promise<void> { write('fuel', replaceById(read<FuelOperation[]>('fuel', []), clone(operation))) }

  async listModuleRecords(module: string): Promise<AnyRecord[]> {
    return clone(read<AnyRecord[]>(`module:${module}`, []))
  }

  async saveModuleRecord(module: string, record: AnyRecord): Promise<AnyRecord> {
    const id = String(record.id ?? `${module}-${Date.now()}`)
    const normalized = { ...record, id }
    write(`module:${module}`, replaceById(read<AnyRecord[]>(`module:${module}`, []) as { id: string }[], clone(normalized)))
    return clone(normalized)
  }

  async deleteModuleRecord(module: string, id: string): Promise<void> {
    write(`module:${module}`, read<AnyRecord[]>(`module:${module}`, []).filter(record => String(record.id) !== id))
  }

  async listOperations(): Promise<AnyRecord[]> { return this.listModuleRecords('operations') }
}
