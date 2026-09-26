import { requireSupabase, supabaseConfigured } from './supabase'
import type { Asset, AssetCostEntry, AssetCostSummary, AssetDocument, AssetFinancialSummary, AuditEntry, Customer, InventoryItem, MaintenancePart, MaintenanceTechnician, Project, StockMovement, StockMovementType, User, Warehouse, WorkOrder, FuelOperation, Role } from '../types/tfms'
import type { Repository } from '../core/repository/types'

/** PostgREST may cap a single request at 1000 rows; page through large collections safely. */
async function pageAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  size = 1000,
): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += size) {
    const { data, error } = await build(from, from + size - 1)
    if (error) throw error
    const rows = data ?? []
    out.push(...rows)
    if (rows.length < size) return out
  }
}

const CORE_MODULES = new Set(['assets','projects','maintenance','fuel','drivers','contracts'])
type AnyRecord = Record<string, unknown>

export class TfmsRepository implements Repository {
  readonly mode = 'supabase' as const
  private auditActor: User | null = null

  isRemote() { return supabaseConfigured }
  setAuditActor(user: User) { this.auditActor = user }
  clearAuditActor() { this.auditActor = null }

  async getCurrentUser(): Promise<User | null> {
    const db = requireSupabase()
    const { data, error: authError } = await db.auth.getUser()
    if (authError) throw authError
    const authUser = data.user
    if (!authUser) return null

    const { data: profile, error } = await db.from('profiles').select('*').eq('id', authUser.id).single()
    if (error || !profile) return null
    const { data: platformOperator } = await db
      .from('platform_operators')
      .select('user_id')
      .eq('user_id', profile.id)
      .eq('active', true)
      .maybeSingle()
    const allowedRoles: Role[] = ['admin','mgmt','fleet','pm','eng','maint','acct','driver']
    if (profile.active !== true || !allowedRoles.includes(profile.role as Role)) {
      await db.auth.signOut()
      return null
    }
    return {
      id: profile.id,
      username: profile.email ?? authUser.email ?? '',
      name: profile.full_name ?? '',
      role: profile.role as Role,
      active: profile.active,
      mustChangePassword: profile.must_change_password === true,
      driverId: profile.driver_id ?? null,
      isPlatformOwner: Boolean(platformOperator),
    }
  }

  async listUsers(): Promise<User[]> {
    const db = requireSupabase()
    const { data, error } = await db.from('profiles').select('id,email,full_name,role,active,must_change_password,driver_id').order('full_name')
    if (error) throw error
    return (data ?? []).map(x => ({ id:x.id, username:x.email ?? '', name:x.full_name ?? '', role:x.role as Role, active:x.active, mustChangePassword:x.must_change_password === true, driverId:x.driver_id ?? null }))
  }

  async updateUserProfile(id:string, patch:{full_name?:string;role?:Role;active?:boolean;driver_id?:string|null}):Promise<User> {
    const db = requireSupabase()
    const { data, error } = await db.from('profiles').update(patch).eq('id',id).select('id,email,full_name,role,active,must_change_password,driver_id').single()
    if (error) throw error
    return { id:data.id, username:data.email ?? '', name:data.full_name ?? '', role:data.role as Role, active:data.active, mustChangePassword:data.must_change_password === true, driverId:data.driver_id ?? null }
  }

  async changePassword(newPassword: string): Promise<void> {
    if (newPassword.length < 8) throw new Error('كلمة المرور يجب ألا تقل عن 8 أحرف.')
    const db = requireSupabase()
    const { error } = await db.auth.updateUser({ password: newPassword })
    if (error) throw error
    const { error: flagError } = await db.rpc('complete_password_change')
    if (flagError) throw flagError
  }

  async createUserAccount(input:{email:string;full_name:string;role:Role;initial_password:string;driver_id?:string|null}): Promise<{id:string;email:string;name:string;role:Role;active:boolean;mustChangePassword:boolean;driver_id?:string|null}> {
    const db = requireSupabase()
    const { data, error } = await db.functions.invoke('admin-create-user', { body: input })
    if (error) {
      // Supabase wraps non-2xx function responses in FunctionsHttpError; read
      // the JSON body so the administrator sees the actual validation/server error.
      let detail = ''
      const context = (error as { context?: unknown }).context
      if (context && typeof context === 'object' && 'json' in context && typeof (context as { json?: unknown }).json === 'function') {
        try {
          const payload = await (context as { json: () => Promise<{ error?: string; message?: string; error_code?: string }> }).json()
          detail = String(payload?.error ?? payload?.message ?? (payload?.error_code ? `خطأ: ${payload.error_code}` : ''))
        } catch { /* response body may be empty or non-JSON */ }
      }
      if (!detail && error.message && error.message !== 'Edge Function returned a non-2xx status code') detail = error.message
      throw new Error(detail || 'تعذر إنشاء الحساب. راجع سجل وظيفة admin-create-user في Supabase لمعرفة سبب الرفض.')
    }
    const user = data?.user
    if (!user) throw new Error('استجابة إنشاء المستخدم غير مكتملة.')
    return { id:String(user.id), email:String(user.email), name:String(user.full_name ?? user.name ?? ''), role:user.role as Role, active:user.active !== false, mustChangePassword:user.must_change_password === true, driver_id:user.driver_id == null ? null : String(user.driver_id) }
  }

  async getSettings(){
    const db = requireSupabase()
    const { data, error } = await db.from('organization_settings').select('*').maybeSingle()
    if (error) throw error
    if (!data) throw new Error('إعدادات المؤسسة غير مهيأة في قاعدة البيانات.')
    return data
  }

  async saveSettings(settings:{company_name:string;group_name:string;currency_code:string;vat:number;diesel:number;petrol:number;alert_days:number;alert_km:number;alert_hours:number;trip_geofence_radius_m?:number; print_settings?:Record<string, unknown>}){
    const db = requireSupabase()
    const { error } = await db.from('organization_settings').upsert({...settings,currency_code:String(settings.currency_code||'EGP').toUpperCase()})
    if (error) throw error
  }

  async listAuditLog():Promise<AnyRecord[]> {
    const db = requireSupabase()
    const { data,error }=await db.from('audit_log').select('*').order('occurred_at',{ascending:false}).limit(500)
    if(error)throw error
    return (data??[]).map(x=>({id:x.id,ts:x.occurred_at,user:x.username??'',action:x.action,entity:x.entity??'',ref:x.reference??'',details:x.details??'',source:x.source??''}))
  }

  async listApprovalEvents():Promise<AnyRecord[]> {
    const db = requireSupabase()
    const { data, error } = await db.from('approval_events').select('*').order('acted_at', { ascending: false }).limit(1000)
    if (error) throw error
    return (data ?? []).map(x => ({
      id: x.id, module: x.module_name ?? '', recordId: x.record_id ?? '', fromStatus: x.from_status ?? '',
      toStatus: x.to_status ?? '', comment: x.comment ?? '', actedBy: x.acted_by ?? '', actedAt: x.acted_at, metadata: x.metadata ?? {},
    }))
  }

  private async recordAudit(_action:string,_entity:string,_reference:string,_details:string){
    // Audit is produced by database triggers; keep this method for the existing repository API.
  }

  async signIn(username: string, password: string): Promise<User> {
    const db = requireSupabase()
    const { data, error } = await db.auth.signInWithPassword({ email: username, password })
    if (error) throw error
    const userId = data.user?.id
    if (!userId) throw new Error('تعذر إنشاء جلسة للمستخدم')
    const { data: profile, error: profileError } = await db.from('profiles').select('*').eq('id', userId).single()
    if (profileError) {
      await db.auth.signOut()
      throw profileError
    }
    const { data: platformOperator } = await db
      .from('platform_operators')
      .select('user_id')
      .eq('user_id', profile.id)
      .eq('active', true)
      .maybeSingle()
    const allowedRoles: Role[] = ['admin','mgmt','fleet','pm','eng','maint','acct','driver']
    if (profile.active !== true || !allowedRoles.includes(profile.role as Role)) {
      await db.auth.signOut()
      throw new Error('هذا المستخدم غير نشط أو لا يملك دورًا صالحًا.')
    }
    return { id: profile.id, username: profile.email ?? username, name: profile.full_name ?? '', role: profile.role as Role, active: profile.active, mustChangePassword: profile.must_change_password === true, driverId: profile.driver_id ?? null, isPlatformOwner: Boolean(platformOperator) }
  }

  async signOut() {
    const db = requireSupabase()
    await db.auth.signOut()
  }

  async listClients(): Promise<Customer[]> {
    const db = requireSupabase()
    const { data, error } = await db.from('clients').select('*').order('name')
    if (error) throw error
    return (data ?? []).map(x => ({
      id:x.id, code:x.code, name:x.name, contact:x.contact_name ?? '', phone:x.phone ?? '', email:x.email ?? '',
      address:x.address ?? '', taxNo:x.tax_number ?? '', paymentTerms:x.payment_terms ?? '', creditLimit:Number(x.credit_limit ?? 0), salesRep:x.sales_rep ?? '', kind:x.classification ?? '',
      status:x.active === false ? 'غير نشط' : 'نشط', notes:x.notes ?? '',
    }))
  }

  async saveClient(client: Customer): Promise<void> {
    const db = requireSupabase()
    const payload = {
      id:client.id, code:String(client.code ?? '').trim(), name:String(client.name ?? '').trim(),
      classification:String(client.kind ?? '').trim() || null, contact_name:String(client.contact ?? '').trim() || null,
      phone:String(client.phone ?? '').trim() || null, email:String(client.email ?? '').trim() || null,
      address:String(client.address ?? '').trim() || null, tax_number:String(client.taxNo ?? '').trim() || null,
      payment_terms:String(client.paymentTerms ?? '').trim() || null, credit_limit:Number(client.creditLimit ?? 0),
      sales_rep:String(client.salesRep ?? '').trim() || null, notes:String(client.notes ?? '').trim() || null,
      active:client.status !== 'غير نشط',
    }
    if (!payload.code) throw new Error('كود العميل مطلوب.')
    if (!payload.name) throw new Error('اسم العميل مطلوب.')
    const { error } = await db.from('clients').upsert(payload)
    if (error) throw error
  }

  async listCostCenters(): Promise<Array<{ id: string; code: string; name: string; active: boolean }>> {
    const db = requireSupabase()
    const { data, error } = await db.from('cost_centers').select('id,code,name,active').eq('active', true).order('code')
    if (error) throw error
    return (data ?? []) as Array<{ id:string; code:string; name:string; active:boolean }>
  }

  async listAssetTypes(): Promise<Array<{ id:string; code:string; name:string; defaultMeterType:string; standardConsumption?:number; billingUnit?:string; billingRate?:number; billingMinimum?:number; active:boolean }>> {
    const db = requireSupabase()
    const { data, error } = await db.from('asset_types').select('id,code,name,default_meter_type,standard_consumption,billing_unit,billing_rate,billing_minimum,active').eq('active', true).order('code')
    if (error) throw error
    return (data ?? []).map(x => ({ id:x.id, code:x.code, name:x.name, defaultMeterType:x.default_meter_type, standardConsumption:x.standard_consumption == null ? undefined : Number(x.standard_consumption), billingUnit:x.billing_unit ?? undefined, billingRate:x.billing_rate == null ? undefined : Number(x.billing_rate), billingMinimum:x.billing_minimum == null ? undefined : Number(x.billing_minimum), active:x.active }))
  }

  async listChargingRates(): Promise<Array<{ id:string; assetTypeId?:string; assetId?:string; projectId?:string; unit:string; rate:number; minimum?:number; active:boolean }>> {
    const db = requireSupabase()
    const { data, error } = await db.from('charging_rates').select('id,asset_type_id,asset_id,project_id,unit,rate,minimum,active').eq('active', true)
    if (error) throw error
    return (data ?? []).map(x => ({ id:x.id, assetTypeId:x.asset_type_id ?? undefined, assetId:x.asset_id ?? undefined, projectId:x.project_id ?? undefined, unit:x.unit, rate:Number(x.rate ?? 0), minimum:x.minimum == null ? undefined : Number(x.minimum), active:x.active }))
  }

  async listWarehouses(): Promise<Warehouse[]> {
    const db = requireSupabase()
    const { data, error } = await db.from('warehouses').select('id,code,name,location,manager_name,active').eq('active', true).order('code')
    if (error) throw error
    return (data ?? []).map(x => ({ id:x.id, code:x.code, name:x.name, location:x.location ?? '', managerName:x.manager_name ?? '', active:x.active }))
  }

  async saveWarehouse(warehouse: Warehouse): Promise<void> {
    const db = requireSupabase()
    const payload = { id:warehouse.id, code:warehouse.code.trim(), name:warehouse.name.trim(), location:warehouse.location?.trim() || null, manager_name:warehouse.managerName?.trim() || null, active:warehouse.active }
    if (!payload.code) throw new Error('كود المخزن مطلوب.')
    if (!payload.name) throw new Error('اسم المخزن مطلوب.')
    const { error } = await db.from('warehouses').upsert(payload)
    if (error) throw error
  }

  async listInventoryItems(): Promise<InventoryItem[]> {
    const db = requireSupabase()
    const data = await pageAll((from,to) => db.from('inventory_stock_summary').select('*').order('code').order('id').range(from,to))
    return data.map(x => ({
      id:x.id, code:x.code, name:x.name, category:x.category, unit:x.unit,
      brand:x.brand ?? '', barcode:x.barcode ?? '', warehouseId:x.warehouse_id ?? undefined, location:x.location ?? '', minimumQty:Number(x.minimum_qty ?? 0), maximumQty:Number(x.maximum_qty ?? 0),
      reorderPoint:Number(x.reorder_point ?? 0), leadTimeDays:Number(x.lead_time_days ?? 0), averageCost:Number(x.average_cost ?? 0),
      lastPurchaseCost:Number(x.last_purchase_cost ?? 0), currentQty:Number(x.current_qty ?? 0), openingQty:Number(x.opening_qty ?? 0),
      active:x.active, notes:x.notes ?? '',
    }))
  }

  async createInventoryItem(input: Omit<InventoryItem, 'currentQty' | 'openingQty'> & { openingQty: number; openingUnitCost: number }): Promise<InventoryItem> {
    const db = requireSupabase()
    const { data, error } = await db.rpc('create_inventory_item', {
      p_id: input.id, p_code:input.code.trim(), p_name:input.name.trim(), p_category:input.category,
      p_brand:input.brand?.trim() || '', p_unit:input.unit.trim(), p_barcode:input.barcode?.trim() || '',
      p_warehouse_id:input.warehouseId || null, p_location:input.location?.trim() || '',
      p_minimum_qty:input.minimumQty, p_maximum_qty:input.maximumQty, p_reorder_point:input.reorderPoint,
      p_lead_time_days:input.leadTimeDays, p_last_purchase_cost:input.lastPurchaseCost,
      p_opening_qty:input.openingQty, p_opening_unit_cost:input.openingUnitCost, p_notes:input.notes?.trim() || '',
    })
    if (error) throw error
    if (!data) throw new Error('تعذر إنشاء الصنف المخزني.')
    return { id:data.id,code:data.code,name:data.name,category:data.category,brand:data.brand ?? '',unit:data.unit,barcode:data.barcode ?? '',warehouseId:data.warehouse_id ?? undefined,location:data.location ?? '',minimumQty:Number(data.minimum_qty ?? 0),maximumQty:Number(data.maximum_qty ?? 0),reorderPoint:Number(data.reorder_point ?? 0),leadTimeDays:Number(data.lead_time_days ?? 0),averageCost:Number(data.average_cost ?? 0),lastPurchaseCost:Number(data.last_purchase_cost ?? 0),currentQty:Number(data.current_qty ?? 0),openingQty:Number(data.opening_qty ?? 0),active:data.active,notes:data.notes ?? '' }
  }

  async updateInventoryItem(item: InventoryItem): Promise<void> {
    const db = requireSupabase()
    const payload = {
      id:item.id, code:item.code.trim(), name:item.name.trim(), category:item.category, brand:item.brand?.trim() || null,
      unit:item.unit.trim(), barcode:item.barcode?.trim() || null, warehouse_id:item.warehouseId || null, location:item.location?.trim() || null,
      minimum_qty:item.minimumQty, maximum_qty:item.maximumQty, reorder_point:item.reorderPoint, lead_time_days:item.leadTimeDays,
      active:item.active, notes:item.notes?.trim() || null,
    }
    if (!payload.code) throw new Error('كود الصنف مطلوب.')
    if (!payload.name) throw new Error('اسم الصنف مطلوب.')
    if ([payload.minimum_qty,payload.maximum_qty,payload.reorder_point,payload.lead_time_days].some(n => !Number.isFinite(Number(n)) || Number(n) < 0)) throw new Error('حدود المخزون ومدة التوريد يجب أن تكون أرقامًا غير سالبة.')
    const { error } = await db.from('inventory_items').update(payload).eq('id',item.id)
    if (error) throw error
  }

  async listStockMovements(itemId?: string): Promise<StockMovement[]> {
    const db = requireSupabase()
    let query = db.from('stock_movements').select('*').order('movement_date',{ascending:false}).order('created_at',{ascending:false}).order('id')
    if (itemId) query = query.eq('item_id',itemId)
    const { data, error } = await query.limit(1000)
    if (error) throw error
    return (data ?? []).map(x => ({ id:x.id,movementNo:x.movement_no,itemId:x.item_id,movementType:x.movement_type as StockMovementType,quantity:Number(x.quantity ?? 0),movementDate:x.movement_date,unitCost:Number(x.unit_cost ?? 0),warehouseId:x.warehouse_id ?? undefined,assetId:x.asset_id ?? undefined,workOrderId:x.work_order_id ?? undefined,projectId:x.project_id ?? undefined,referenceType:x.reference_type ?? undefined,referenceId:x.reference_id ?? undefined,notes:x.notes ?? undefined,createdBy:x.created_by ?? undefined }))
  }

  async postStockMovement(input: { id?: string; itemId: string; movementType: StockMovementType; quantity: number; movementDate: string; unitCost?: number; warehouseId?: string; assetId?: string; workOrderId?: string; projectId?: string; referenceType?: string; referenceId?: string; notes?: string }): Promise<{ item: InventoryItem; movement: StockMovement }> {
    const db = requireSupabase()
    if (!Number.isFinite(input.quantity) || input.quantity <= 0) throw new Error('كمية الحركة يجب أن تكون أكبر من صفر.')
    const { data, error } = await db.rpc('post_stock_movement', {
      p_id: input.id || '', p_item_id:input.itemId, p_movement_type:input.movementType, p_quantity:input.quantity,
      p_movement_date:input.movementDate, p_unit_cost:input.unitCost ?? 0, p_warehouse_id:input.warehouseId || null,
      p_asset_id:input.assetId || null, p_work_order_id:input.workOrderId || null, p_project_id:input.projectId || null,
      p_reference_type:input.referenceType || null, p_reference_id:input.referenceId || null, p_notes:input.notes || null,
    })
    if (error) throw error
    const result = data as { item:Record<string,unknown>; movement:Record<string,unknown> } | null
    if (!result?.item || !result?.movement) throw new Error('تعذر إتمام حركة المخزون.')
    const item = result.item
    const movement = result.movement
    return {
      item:{id:String(item.id),code:String(item.code),name:String(item.name),category:item.category as InventoryItem['category'],brand:item.brand == null ? undefined:String(item.brand),unit:String(item.unit),barcode:item.barcode == null ? undefined:String(item.barcode),warehouseId:item.warehouse_id == null ? undefined:String(item.warehouse_id),location:item.location == null ? undefined:String(item.location),minimumQty:Number(item.minimum_qty ?? 0),maximumQty:Number(item.maximum_qty ?? 0),reorderPoint:Number(item.reorder_point ?? 0),leadTimeDays:Number(item.lead_time_days ?? 0),averageCost:Number(item.average_cost ?? 0),lastPurchaseCost:Number(item.last_purchase_cost ?? 0),currentQty:Number(item.current_qty ?? 0),openingQty:Number(item.opening_qty ?? 0),active:Boolean(item.active),notes:item.notes == null ? undefined:String(item.notes)},
      movement:{id:String(movement.id),movementNo:String(movement.movement_no),itemId:String(movement.item_id),movementType:movement.movement_type as StockMovementType,quantity:Number(movement.quantity ?? 0),movementDate:String(movement.movement_date),unitCost:Number(movement.unit_cost ?? 0),warehouseId:movement.warehouse_id == null ? undefined:String(movement.warehouse_id),assetId:movement.asset_id == null ? undefined:String(movement.asset_id),workOrderId:movement.work_order_id == null ? undefined:String(movement.work_order_id),projectId:movement.project_id == null ? undefined:String(movement.project_id),referenceType:movement.reference_type == null ? undefined:String(movement.reference_type),referenceId:movement.reference_id == null ? undefined:String(movement.reference_id),notes:movement.notes == null ? undefined:String(movement.notes),createdBy:movement.created_by == null ? undefined:String(movement.created_by)},
    }
  }

  async listMaintenanceTechnicians(): Promise<MaintenanceTechnician[]> {
    const db = requireSupabase()
    const { data,error } = await db.from('maintenance_technicians').select('*').eq('active',true).order('code')
    if(error) throw error
    return (data??[]).map(x=>({id:x.id,code:x.code,name:x.name,specialty:x.specialty??'',phone:x.phone??'',employmentType:x.employment_type??'',active:x.active,notes:x.notes??''}))
  }

  async saveMaintenanceTechnician(technician: MaintenanceTechnician): Promise<void> {
    const db=requireSupabase()
    const payload={id:technician.id,code:technician.code.trim(),name:technician.name.trim(),specialty:technician.specialty?.trim()||null,phone:technician.phone?.trim()||null,employment_type:technician.employmentType?.trim()||null,active:technician.active,notes:technician.notes?.trim()||null}
    if(!payload.code) throw new Error('كود الفني مطلوب.')
    if(!payload.name) throw new Error('اسم الفني مطلوب.')
    const {error}=await db.from('maintenance_technicians').upsert(payload); if(error) throw error
  }

  async listMaintenanceParts(workOrderId?: string): Promise<MaintenancePart[]> {
    const db=requireSupabase()
    let query=db.from('maintenance_parts').select('*').order('created_at',{ascending:false})
    if(workOrderId) query=query.eq('work_order_id',workOrderId)
    const {data,error}=await query.limit(1000); if(error)throw error
    return (data??[]).map(x=>({id:x.id,workOrderId:x.work_order_id,itemId:x.item_id,plannedQty:Number(x.planned_qty??0),issuedQty:Number(x.issued_qty??0),returnedQty:Number(x.returned_qty??0),unitCost:Number(x.unit_cost??0),notes:x.notes??''}))
  }

  async saveMaintenancePart(part: MaintenancePart): Promise<void> {
    const db=requireSupabase()
    const payload={id:part.id,work_order_id:part.workOrderId,item_id:part.itemId,planned_qty:part.plannedQty,issued_qty:part.issuedQty,returned_qty:part.returnedQty,unit_cost:part.unitCost,notes:part.notes?.trim()||null}
    if([payload.planned_qty,payload.issued_qty,payload.returned_qty,payload.unit_cost].some(n=>!Number.isFinite(Number(n))||Number(n)<0)) throw new Error('بيانات قطع الغيار غير صالحة.')
    const {error}=await db.from('maintenance_parts').upsert(payload); if(error)throw error
  }

  async listProjects(): Promise<Project[]> {
    const db = requireSupabase()
    const { data, error } = await db.from('projects').select('*').order('code')
    if (error) throw error
    return (data ?? []).map((x) => ({id:x.id,code:x.code,name:x.name,client:x.client,clientId:x.client_id ?? '',mgr:x.project_manager,site:x.site,cc:x.cost_center,status:x.status,start:x.start_date??'',end:x.end_date??'',contract:x.contract_no??'',location:x.location_details??'',phone:x.contact_phone??'',budget:x.budget==null?undefined:Number(x.budget),progress:x.progress==null?0:Number(x.progress),notes:x.notes??''}))
  }

  async saveProject(project: Project) {
    const db = requireSupabase()
    const payload={id:project.id,code:project.code,name:project.name,client:project.client,client_id:project.clientId || null,project_manager:project.mgr,site:project.site,cost_center:project.cc,status:project.status,start_date:project.start||null,end_date:project.end||null,contract_no:project.contract||null,location_details:project.location||null,contact_phone:project.phone||null,budget:project.budget??null,progress:project.progress??0,notes:project.notes??null}
    const { error }=await db.from('projects').upsert(payload)
    if(error)throw error
  }

  async getProjectCost30d(projectId: string): Promise<{ projectId: string; projectCode: string; projectName: string; totalCost30d: number; costEntries30d: number }> {
    const db = requireSupabase()
    const { data, error } = await db.from('project_costs_30d').select('*').eq('project_id', projectId).maybeSingle()
    if (error) throw error
    if (!data) throw new Error('المشروع غير موجود أو لا تتوفر بيانات تكلفته.')
    return { projectId:data.project_id, projectCode:data.project_code, projectName:data.project_name, totalCost30d:Number(data.total_cost_30d ?? 0), costEntries30d:Number(data.cost_entries_30d ?? 0) }
  }

  async listAssets(): Promise<Asset[]> {
    const db = requireSupabase()
    const data = await pageAll((f, t) => db.from('assets').select('*').order('code').order('id').range(f, t))
    return data.map((x) => ({
      id: x.id, code: x.code, name: x.name, cat: x.category, type: x.asset_type, assetTypeId: x.asset_type_id ?? undefined, own: x.ownership,
      status: x.status, cond: x.technical_condition, mfr: x.manufacturer, model: x.model,
      year: x.manufacture_year, fuel: x.fuel_type, mt: x.meter_type, meter: Number(x.meter),
      std: x.standard_consumption == null ? undefined : Number(x.standard_consumption),
      capex: x.acquisition_cost == null ? undefined : Number(x.acquisition_cost),
      life: x.useful_life_years == null ? undefined : Number(x.useful_life_years),
      resid: x.residual_value == null ? undefined : Number(x.residual_value),
      proj: x.project_id ?? '', drv: x.driver_id ?? '', cust: x.customer ?? '', plate: x.plate_number ?? '',
      buy: x.purchase_date ?? '', lic: x.license_expiry ?? '', ins: x.insurance_expiry ?? '', contract: x.contract_id ?? '',
      notes: ((x.metadata as Record<string,unknown>|null)?.notes ? String((x.metadata as Record<string,unknown>).notes) : ''),
    }))
  }

  async saveAsset(asset: Asset) {
    const db = requireSupabase()
    const payload={
      id:asset.id, code:asset.code.trim(), name:asset.name.trim(), category:asset.cat.trim(), asset_type:asset.type.trim(), asset_type_id:asset.assetTypeId || null, ownership:asset.own,
      status:asset.status, technical_condition:asset.cond, manufacturer:asset.mfr?.trim() || null, model:asset.model?.trim() || null,
      manufacture_year:asset.year ?? null, fuel_type:asset.fuel ?? null, meter_type:asset.mt || 'كم', meter:Number.isFinite(asset.meter)?asset.meter:0,
      standard_consumption:asset.std ?? null, acquisition_cost:asset.capex ?? null, useful_life_years:asset.life ?? null,
      residual_value:asset.resid ?? null, project_id:asset.proj || null, driver_id:asset.drv || null, customer:asset.cust?.trim() || null,
      plate_number:asset.plate?.trim() || null, purchase_date:asset.buy || null, license_expiry:asset.lic || null, insurance_expiry:asset.ins || null,
      contract_id:asset.contract || null, metadata:{notes:asset.notes ?? ''},
    }
    if(!payload.code) throw new Error('كود الأصل مطلوب.')
    if(!payload.name) throw new Error('اسم الأصل مطلوب.')
    if(!payload.category) throw new Error('فئة الأصل مطلوبة.')
    if(!payload.asset_type) throw new Error('نوع / استخدام الأصل مطلوب.')
    const {data,error}=await db.from('assets').upsert(payload).select('*').single()
    if(error)throw error
    if(!data)throw new Error('تم تنفيذ الحفظ بدون إرجاع السجل.')
    return data
  }


  async listAssetDocuments(assetId: string): Promise<AssetDocument[]> {
    const db = requireSupabase()
    const { data, error } = await db.from('asset_documents').select('*').eq('asset_id', assetId).order('expiry_date', { ascending: true, nullsFirst: false })
    if (error) throw error
    return (data ?? []).map(x => ({
      id: x.id,
      assetId: x.asset_id,
      documentType: x.document_type as AssetDocument['documentType'],
      documentNumber: x.document_number ?? '',
      issueDate: x.issue_date ?? '',
      expiryDate: x.expiry_date ?? '',
      status: x.status as AssetDocument['status'],
      fileName: x.file_name ?? '',
      storagePath: x.storage_path ?? '',
      issuer: x.issuer ?? '',
      notes: x.notes ?? '',
    }))
  }

  async listAssetCostEntries(assetId: string): Promise<AssetCostEntry[]> {
    const db = requireSupabase()
    const { data, error } = await db.from('cost_entries').select('*').eq('asset_id', assetId).order('cost_date', { ascending: false }).order('id')
    if (error) throw error
    return (data ?? []).map(x => ({
      id:x.id,
      costDate:x.cost_date,
      category:x.category as AssetCostEntry['category'],
      assetId:x.asset_id ?? undefined,
      projectId:x.project_id ?? undefined,
      amount:Number(x.amount ?? 0),
      quantity:x.quantity == null ? undefined : Number(x.quantity),
      unitCost:x.unit_cost == null ? undefined : Number(x.unit_cost),
      description:x.description ?? '', vendor:x.vendor ?? '',
      referenceType:x.reference_type ?? '', referenceId:x.reference_id ?? '',
      status:x.status as AssetCostEntry['status'],
      metadata:(x.metadata ?? {}) as Record<string, unknown>,
    }))
  }

  async getAssetFinancialSummary(assetId: string): Promise<AssetFinancialSummary> {
    const db = requireSupabase()
    const { data, error } = await db.from('asset_financial_summary').select('*').eq('id', assetId).maybeSingle()
    if (error) throw error
    if (!data) throw new Error('الأصل غير موجود أو لا تتوفر بياناته المالية.')
    return {
      id:data.id, code:data.code, name:data.name,
      acquisitionCost:Number(data.acquisition_cost ?? 0), residualValue:Number(data.residual_value ?? 0),
      usefulLifeYears:Number(data.useful_life_years ?? 0), purchaseDate:data.purchase_date ?? undefined,
      annualDepreciation:Number(data.annual_depreciation ?? 0),
      accumulatedDepreciation:Number(data.accumulated_depreciation ?? 0),
      netBookValue:Number(data.net_book_value ?? 0),
    }
  }

  async getAssetCost30d(assetId: string): Promise<AssetCostSummary> {
    const db = requireSupabase()
    const { data, error } = await db.from('asset_costs_30d').select('*').eq('asset_id', assetId).maybeSingle()
    if (error) throw error
    if (!data) throw new Error('الأصل غير موجود أو لا تتوفر بيانات التكلفة.')
    return {
      assetId:data.asset_id, assetCode:data.asset_code, assetName:data.asset_name,
      fuelCost30d:Number(data.fuel_cost_30d ?? 0), maintenanceCost30d:Number(data.maintenance_cost_30d ?? 0),
      tireCost30d:Number(data.tire_cost_30d ?? 0), totalCost30d:Number(data.total_cost_30d ?? 0),
    }
  }

  async listAssetAudit(assetId: string): Promise<AuditEntry[]> {
    const db = requireSupabase()
    const { data, error } = await db.from('audit_log').select('*').eq('entity', 'assets').eq('reference', assetId).order('occurred_at', { ascending: false }).limit(200)
    if (error) throw error
    return (data ?? []).map(x => ({
      id:x.id, occurredAt:x.occurred_at, userId:x.user_id ?? undefined, username:x.username ?? '',
      action:x.action, entity:x.entity, reference:x.reference ?? undefined, details:x.details ?? '', source:x.source ?? '',
    }))
  }

  async listWorkOrders(): Promise<WorkOrder[]> {
    const db = requireSupabase()
    const data = await pageAll((f, t) => db.from('work_orders').select('*').order('opened', { ascending: false }).order('id').range(f, t))
    return data.map((x) => ({ ...x, asset: x.asset_id, proj: x.project_id, type:x.work_type, desc:x.description, prio:x.priority, techs:x.technicians, laborCost:Number(x.labor_cost||0), partsCost:Number(x.parts_cost||0), vendorCost:Number(x.vendor_cost||0), downHrs:x.downtime_hours, planId:x.plan_id, estimatedCost:(x.metadata as Record<string,unknown>|null)?.estimated_cost==null?undefined:Number((x.metadata as Record<string,unknown>).estimated_cost), cause:String((x.metadata as Record<string,unknown>|null)?.cause??''), materials:String((x.metadata as Record<string,unknown>|null)?.materials??''), warranty:String((x.metadata as Record<string,unknown>|null)?.warranty??''), approvalNotes:String((x.metadata as Record<string,unknown>|null)?.approval_notes??'') }))
  }

  async saveWorkOrder(w:WorkOrder){
    const db=requireSupabase()
    const payload={id:w.id,asset_id:w.asset,project_id:w.proj||null,work_type:w.type,description:w.desc,opened:w.opened,priority:w.prio,status:w.status,technicians:w.techs??null,labor_cost:w.laborCost??0,parts_cost:w.partsCost??0,vendor_cost:w.vendorCost??0,vendor:w.vendor??null,downtime_hours:w.downHrs??null,completed:w.completed||null,plan_id:w.planId||null,results:w.results??null,metadata:{estimated_cost:w.estimatedCost??null,cause:w.cause??null,materials:w.materials??null,warranty:w.warranty??null,approval_notes:w.approvalNotes??null}}
    const {error}=await db.from('work_orders').upsert(payload)
    if(error)throw error
  }

  async listFuel(): Promise<FuelOperation[]> {
    const db=requireSupabase()
    const data = await pageAll((f, t) => db.from('fuel_operations').select('*').order('operation_date', { ascending: false }).order('id').range(f, t))
    return data.map((x) => ({ ...x, type:x.operation_type, assetId: x.asset_id, tank: x.tank_id, proj: x.project_id, date:x.operation_date, sup:x.supplier, inv:x.invoice_no, tripId:x.trip_id ?? undefined }))
  }

  async saveFuelOperation(x:FuelOperation){
    const db=requireSupabase()
    const payload={id:x.id,operation_type:x.type,tank_id:x.tank??null,station:x.station??null,asset_id:x.assetId||null,project_id:x.proj||null,trip_id:x.tripId||null,operation_date:x.date,qty:x.qty||0,price:x.price||0,total:x.total||0,status:x.status,meter:x.meter??null,notes:x.notes??null,supplier:x.sup??null,invoice_no:x.inv??null}
    const {error}=await db.from('fuel_operations').upsert(payload)
    if(error)throw error
  }

  async listModuleRecords(module:string):Promise<AnyRecord[]> {
    const db=requireSupabase()
    if(module==='drivers') {
      const {data,error}=await db.from('drivers').select('*').order('code'); if(error)throw error
      return (data??[]).map(x=>({id:x.id,code:x.code,name:x.name,phone:x.phone??'',kind:x.kind??'',licNo:x.license_no??'',licExp:x.license_expiry??'',cur:x.current_assignment??''}))
    }
    if(module==='audit') return this.listAuditLog()
    if(module==='contracts') {
      const {data,error}=await db.from('contracts').select('*').order('number'); if(error)throw error
      return (data??[]).map(x=>({id:x.id,number:x.number,lessor:x.lessor,phone:x.phone??'',assets:Array.isArray(x.assets)?x.assets.join(', '):valueJson(x.assets),start:x.start_date??'',end:x.end_date??'',rate:x.rate??'',unit:x.unit??'',minimum:x.minimum??'',fuelT:x.fuel_terms??'',operT:x.operation_terms??'',maintT:x.maintenance_terms??'',status:x.status,notes:x.notes??''}))
    }
    if(!CORE_MODULES.has(module)) {
      const data=await pageAll((f,t)=>db.from('tfms_module_records').select('record_id,payload').eq('module_name',module).order('updated_at',{ascending:false}).order('record_id').range(f,t))
      return data.map(x=>({...(x.payload as AnyRecord),id:x.record_id}))
    }
    return []
  }

  async saveModuleRecord(module:string,record:AnyRecord){
    const db=requireSupabase()
    const id=String(record.id||`${module.toUpperCase()}-${Date.now()}`)
    if(module==='drivers') {
      const payload={id,code:String(record.code??'').trim(),name:String(record.name??'').trim(),phone:String(record.phone??'').trim(),kind:String(record.kind??''),license_no:String(record.licNo??'').trim(),license_expiry:String(record.licExp??'')||null,current_assignment:String(record.cur??'')}
      if(!payload.code)throw new Error('كود السائق / المشغل مطلوب.')
      if(!payload.name)throw new Error('اسم السائق / المشغل مطلوب.')
      const {error}=await db.from('drivers').upsert(payload); if(error)throw error; return {...record,id}
    }
    if(module==='audit') throw new Error('سجل التدقيق للقراءة فقط.')
    if(module==='contracts') {
      const raw=record.assets; const assets=Array.isArray(raw)?raw:String(raw??'').split(',').map(x=>x.trim()).filter(Boolean)
      const payload={id,number:String(record.number??'').trim(),lessor:String(record.lessor??'').trim(),phone:String(record.phone??''),assets,start_date:String(record.start??'')||null,end_date:String(record.end??'')||null,rate:Number(record.rate||0),unit:String(record.unit??''),minimum:Number(record.minimum||0),fuel_terms:String(record.fuelT??''),operation_terms:String(record.operT??''),maintenance_terms:String(record.maintT??''),status:String(record.status??'ساري'),notes:String(record.notes??'')}
      if(!payload.number)throw new Error('رقم العقد مطلوب.')
      if(!payload.lessor)throw new Error('اسم المؤجر مطلوب.')
      const {error}=await db.from('contracts').upsert(payload); if(error)throw error; return {...record,id}
    }
    if(!CORE_MODULES.has(module)) {
      const {data:saved,error}=await db.from('tfms_module_records').upsert({module_name:module,record_id:id,payload:{...record,id}},{onConflict:'module_name,record_id'}).select('record_id,payload').single()
      if(error)throw error
      return {...(saved?.payload as AnyRecord ?? record),id:saved?.record_id??id}
    }
    throw new Error(`الوحدة ${module} لا تستقبل سجلات مباشرة من طبقة السجلات العامة.`)
  }

  async deleteModuleRecord(module:string,id:string){
    const db=requireSupabase()
    if(module==='audit') throw new Error('سجل التدقيق للقراءة فقط.')
    if(module==='drivers'||module==='contracts') {
      const {data,error}=await db.from(module).delete().eq('id',id).select('id')
      if(error)throw error
      if(!data?.length)throw new Error('لم يتم العثور على السجل أو لا تملك صلاحية حذفه.')
      return
    }
    if(!CORE_MODULES.has(module)) {
      const {data,error}=await db.from('tfms_module_records').delete().eq('module_name',module).eq('record_id',id).select('record_id')
      if(error)throw error
      if(!data?.length)throw new Error('لم يتم العثور على السجل أو لا تملك صلاحية حذفه.')
      return
    }
    throw new Error(`لا يمكن حذف سجلات الوحدة ${module} من هذا المسار.`)
  }

  async listOperations():Promise<AnyRecord[]> { return this.listModuleRecords('operations') }
}

function valueJson(v:unknown){return v==null?'':JSON.stringify(v)}

export const repository = new TfmsRepository()
