import { requireSupabase, supabaseConfigured } from './supabase'
import type { Asset, Project, User, WorkOrder, FuelOperation, Role } from '../types/tfms'

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

export class TfmsRepository {
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
    const allowedRoles: Role[] = ['admin','mgmt','fleet','pm','eng','maint','acct']
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
    }
  }

  async listUsers(): Promise<User[]> {
    const db = requireSupabase()
    const { data, error } = await db.from('profiles').select('id,email,full_name,role,active').order('full_name')
    if (error) throw error
    return (data ?? []).map(x => ({ id:x.id, username:x.email ?? '', name:x.full_name ?? '', role:x.role as Role, active:x.active }))
  }

  async updateUserProfile(id:string, patch:{full_name?:string;role?:Role;active?:boolean}):Promise<User> {
    const db = requireSupabase()
    const { data, error } = await db.from('profiles').update(patch).eq('id',id).select('id,email,full_name,role,active').single()
    if (error) throw error
    return { id:data.id, username:data.email ?? '', name:data.full_name ?? '', role:data.role as Role, active:data.active }
  }

  async getSettings(){
    const db = requireSupabase()
    const { data, error } = await db.from('organization_settings').select('*').eq('id',true).maybeSingle()
    if (error) throw error
    if (!data) throw new Error('إعدادات المؤسسة غير مهيأة في قاعدة البيانات.')
    return data
  }

  async saveSettings(settings:{company_name:string;group_name:string;vat:number;diesel:number;petrol:number;alert_days:number;alert_km:number;alert_hours:number}){
    const db = requireSupabase()
    const { error } = await db.from('organization_settings').upsert({id:true,...settings})
    if (error) throw error
  }

  async listAuditLog():Promise<AnyRecord[]> {
    const db = requireSupabase()
    const { data,error }=await db.from('audit_log').select('*').order('occurred_at',{ascending:false}).limit(500)
    if(error)throw error
    return (data??[]).map(x=>({id:x.id,ts:x.occurred_at,user:x.username??'',action:x.action,entity:x.entity??'',ref:x.reference??'',details:x.details??'',source:x.source??''}))
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
    const allowedRoles: Role[] = ['admin','mgmt','fleet','pm','eng','maint','acct']
    if (profile.active !== true || !allowedRoles.includes(profile.role as Role)) {
      await db.auth.signOut()
      throw new Error('هذا المستخدم غير نشط أو لا يملك دورًا صالحًا.')
    }
    return { id: profile.id, username: profile.email ?? username, name: profile.full_name ?? '', role: profile.role as Role, active: profile.active }
  }

  async signOut() {
    const db = requireSupabase()
    await db.auth.signOut()
  }

  async listProjects(): Promise<Project[]> {
    const db = requireSupabase()
    const { data, error } = await db.from('projects').select('*').order('code')
    if (error) throw error
    return (data ?? []).map((x) => ({id:x.id,code:x.code,name:x.name,client:x.client,mgr:x.project_manager,site:x.site,cc:x.cost_center,status:x.status,start:x.start_date??'',end:x.end_date??'',contract:x.contract_no??'',location:x.location_details??'',phone:x.contact_phone??'',budget:x.budget==null?undefined:Number(x.budget),progress:x.progress==null?0:Number(x.progress),notes:x.notes??''}))
  }

  async saveProject(project: Project) {
    const db = requireSupabase()
    const payload={id:project.id,code:project.code,name:project.name,client:project.client,project_manager:project.mgr,site:project.site,cost_center:project.cc,status:project.status,start_date:project.start||null,end_date:project.end||null,contract_no:project.contract||null,location_details:project.location||null,contact_phone:project.phone||null,budget:project.budget??null,progress:project.progress??0,notes:project.notes??null}
    const { error }=await db.from('projects').upsert(payload)
    if(error)throw error
  }

  async listAssets(): Promise<Asset[]> {
    const db = requireSupabase()
    const data = await pageAll((f, t) => db.from('assets').select('*').order('code').order('id').range(f, t))
    return data.map((x) => ({
      id: x.id, code: x.code, name: x.name, cat: x.category, type: x.asset_type, own: x.ownership,
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
      id:asset.id, code:asset.code.trim(), name:asset.name.trim(), category:asset.cat.trim(), asset_type:asset.type.trim(), ownership:asset.own,
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
    return data.map((x) => ({ ...x, type:x.operation_type, assetId: x.asset_id, tank: x.tank_id, proj: x.project_id, date:x.operation_date, sup:x.supplier, inv:x.invoice_no }))
  }

  async saveFuelOperation(x:FuelOperation){
    const db=requireSupabase()
    const payload={id:x.id,operation_type:x.type,tank_id:x.tank??null,station:x.station??null,asset_id:x.assetId||null,project_id:x.proj||null,operation_date:x.date,qty:x.qty||0,price:x.price||0,total:x.total||0,status:x.status,meter:x.meter??null,notes:x.notes??null,supplier:x.sup??null,invoice_no:x.inv??null}
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
