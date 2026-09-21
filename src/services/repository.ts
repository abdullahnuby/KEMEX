import seed from '../data/demoSeed.json'
import { saveLocal, loadLocal } from './storage'
import { supabase, supabaseConfigured } from './supabase'
import type { Asset, DemoDb, Project, User, WorkOrder, FuelOperation, Role } from '../types/tfms'

const demoDb = seed as DemoDb

/** وضع التجربة (localStorage + كلمات مرور ثابتة) متاح في التطوير أو بمتغير صريح فقط.
 *  لو النشر خرج بدون متغيرات Supabase بالغلط، نرفض بدل ما نفتح نظامًا بحسابات admin/1234. */
export const DEMO_ALLOWED = import.meta.env.DEV || import.meta.env.VITE_ALLOW_DEMO === 'true'

/** PostgREST بيقطع أي استعلام عند max-rows (افتراضيًا 1000) بدون أي تحذير،
 *  فأي جدول يكبر عن كده (التشغيل اليومي مثلًا) كان هيتقرأ ناقص والتكاليف تطلع غلط. نقرأ على صفحات. */
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
  private local: DemoDb
  private auditActor: User | null = null

  constructor() {
    this.local = loadLocal<DemoDb>(structuredClone(demoDb))
  }

  isRemote() { return supabaseConfigured }
  getDemoDb() { return this.local }
  setAuditActor(user: User) { this.auditActor = user }
  clearAuditActor() { this.auditActor = null }

  private persistLocal(){ saveLocal(this.local) }

  async getCurrentUser(): Promise<User | null> {
    if (supabase) {
      const { data } = await supabase.auth.getUser()
      const authUser = data.user
      if (!authUser) return null
      const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', authUser.id).single()
      if (error || !profile) return null
      const allowedRoles: Role[] = ['admin','mgmt','fleet','pm','eng','maint','acct']
      if (profile.active !== true || !allowedRoles.includes(profile.role as Role)) {
        await supabase.auth.signOut()
        return null
      }
      return { id: profile.id, username: profile.email ?? authUser.email ?? '', name: profile.full_name, role: profile.role as Role, active: profile.active }
    }
    return null
  }

  async listUsers(): Promise<User[]> {
    if (supabase) {
      const { data, error } = await supabase.from('profiles').select('id,email,full_name,role,active').order('full_name')
      if (error) throw error
      return (data ?? []).map(x => ({ id:x.id, username:x.email ?? '', name:x.full_name ?? '', role:x.role as Role, active:x.active }))
    }
    return structuredClone(this.local.users)
  }

  async updateUserProfile(id:string, patch:{full_name?:string;role?:Role;active?:boolean}):Promise<User> {
    if (supabase) {
      const { data, error } = await supabase.from('profiles').update(patch).eq('id',id).select('id,email,full_name,role,active').single()
      if (error) throw error
      await this.recordAudit('تعديل مستخدم','profiles',id,`تعديل ملف المستخدم: ${patch.full_name ?? ''}`, 'web')
      return { id:data.id, username:data.email ?? '', name:data.full_name ?? '', role:data.role as Role, active:data.active }
    }
    const i=this.local.users.findIndex(x=>x.id===id)
    if(i<0) throw new Error('المستخدم غير موجود')
    this.local.users[i]={...this.local.users[i],...patch}
    this.persistLocal()
    await this.recordAudit('تعديل مستخدم','profiles',id,`تعديل ملف المستخدم: ${patch.full_name ?? ''}`,'local')
    return structuredClone(this.local.users[i])
  }

  async getSettings(){
    if (supabase) {
      const { data, error } = await supabase.from('organization_settings').select('*').eq('id',true).maybeSingle()
      if (error) throw error
      if (data) return data
    }
    const x=this.local.settings
    return {company_name:x.co,group_name:x.grp,vat:x.vat,diesel:x.diesel,petrol:x.petrol,alert_days:x.alertDays,alert_km:x.alertKm,alert_hours:x.alertHours}
  }

  async saveSettings(settings:{company_name:string;group_name:string;vat:number;diesel:number;petrol:number;alert_days:number;alert_km:number;alert_hours:number}){
    if (supabase) {
      const { error } = await supabase.from('organization_settings').upsert({id:true,...settings})
      if (error) throw error
      await this.recordAudit('تعديل الإعدادات','organization_settings','true','تحديث إعدادات المؤسسة وقواعد التنبيه','web')
      return
    }
    this.local.settings={...this.local.settings,co:settings.company_name,grp:settings.group_name,vat:settings.vat,diesel:settings.diesel,petrol:settings.petrol,alertDays:settings.alert_days,alertKm:settings.alert_km,alertHours:settings.alert_hours}
    this.persistLocal()
    await this.recordAudit('تعديل الإعدادات','organization_settings','true','تحديث إعدادات المؤسسة وقواعد التنبيه','local')
  }

  async listAuditLog():Promise<AnyRecord[]> {
    if (supabase) {
      const { data,error }=await supabase.from('audit_log').select('*').order('occurred_at',{ascending:false}).limit(500)
      if(error)throw error
      return (data??[]).map(x=>({id:x.id,ts:x.occurred_at,user:x.username??'',action:x.action,entity:x.entity??'',ref:x.reference??'',details:x.details??'',source:x.source??''}))
    }
    return structuredClone(this.local.audit) as unknown as AnyRecord[]
  }

  private async recordAudit(action:string,entity:string,reference:string,details:string,source='web'){
    const id=`AUD-${Date.now()}-${Math.random().toString(36).slice(2,7)}`
    if (supabase) {
      // التدقيق بيتكتب من الخادم عبر مشغّلات القاعدة (migration 008): مينفعش يتزوّر ولا يفشل جزئيًا بعد نجاح الحفظ.
      return
    }
    const user=this.auditActor ?? this.local.users[0]
    this.local.audit.unshift({id,ts:new Date().toISOString(),user:user?.name??user?.username??'system',action,entity,ref:reference,details,source})
    this.persistLocal()
  }

  async signIn(username: string, password: string): Promise<User> {
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: username, password })
      if (error) throw error
      const userId = data.user?.id
      if (!userId) throw new Error('تعذر إنشاء جلسة للمستخدم')
      const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', userId).single()
      if (profileError) {
        await supabase.auth.signOut()
        throw profileError
      }
      const allowedRoles: Role[] = ['admin','mgmt','fleet','pm','eng','maint','acct']
      if (profile.active !== true || !allowedRoles.includes(profile.role as Role)) {
        await supabase.auth.signOut()
        throw new Error('هذا المستخدم غير نشط. يرجى التواصل مع مسؤول النظام.')
      }
      return { id: profile.id, username: profile.email ?? username, name: profile.full_name, role: profile.role, active: profile.active }
    }
    if (!DEMO_ALLOWED) throw new Error('النظام غير مهيأ: متغيرات Supabase غير موجودة في بيئة التشغيل. تواصل مع مسؤول النظام.')
    const user = this.local.users.find((x) => x.username === username && x.pass === password && x.active !== false)
    if (!user) throw new Error('بيانات الدخول غير صحيحة')
    return user
  }

  async signOut() { if (supabase) await supabase.auth.signOut() }

  async listProjects(): Promise<Project[]> {
    if (supabase) {
      const { data, error } = await supabase.from('projects').select('*').order('code')
      if (error) throw error
      return (data ?? []).map((x) => ({id:x.id,code:x.code,name:x.name,client:x.client,mgr:x.project_manager,site:x.site,cc:x.cost_center,status:x.status,start:x.start_date??'',end:x.end_date??'',contract:x.contract_no??'',location:x.location_details??'',phone:x.contact_phone??'',budget:x.budget==null?undefined:Number(x.budget),progress:x.progress==null?0:Number(x.progress),notes:x.notes??''}))
    }
    return this.local.projects
  }

  async saveProject(project: Project) {
    if (supabase) {
      const payload={id:project.id,code:project.code,name:project.name,client:project.client,project_manager:project.mgr,site:project.site,cost_center:project.cc,status:project.status,start_date:project.start||null,end_date:project.end||null,contract_no:project.contract||null,location_details:project.location||null,contact_phone:project.phone||null,budget:project.budget??null,progress:project.progress??0,notes:project.notes??null}
      const { error }=await supabase.from('projects').upsert(payload)
      if(error)throw error
      await this.recordAudit(project.id.startsWith('NEW-')?'إضافة مشروع':'تعديل مشروع','projects',project.id,project.name)
      return
    }
    const index=this.local.projects.findIndex(x=>x.id===project.id)
    if(index<0)this.local.projects.push(project);else this.local.projects[index]=project
    this.persistLocal()
    await this.recordAudit(index<0?'إضافة مشروع':'تعديل مشروع','projects',project.id,project.name,'local')
  }

  async listAssets(): Promise<Asset[]> {
    if (supabase) {
      const data = await pageAll((f, t) => supabase!.from('assets').select('*').order('code').order('id').range(f, t))
      return data.map((x) => ({
        id: x.id, code: x.code, name: x.name, cat: x.category, type: x.asset_type, own: x.ownership,
        status: x.status, cond: x.technical_condition, mfr: x.manufacturer, model: x.model,
        year: x.manufacture_year, fuel: x.fuel_type, mt: x.meter_type, meter: Number(x.meter),
        std: x.standard_consumption ? Number(x.standard_consumption) : undefined,
        capex: x.acquisition_cost ? Number(x.acquisition_cost) : undefined,
        life: x.useful_life_years ?? undefined, resid: x.residual_value ? Number(x.residual_value) : undefined,
        proj: x.project_id ?? '', drv: x.driver_id ?? '', cust: x.customer ?? '', plate: x.plate_number ?? '',
        buy: x.purchase_date ?? '', lic: x.license_expiry ?? '', ins: x.insurance_expiry ?? '', contract: x.contract_id ?? '',
        notes: ((x.metadata as Record<string,unknown>|null)?.notes ? String((x.metadata as Record<string,unknown>).notes) : ''),
      }))
    }
    return this.local.assets
  }

  async saveAsset(asset: Asset) {
    if (supabase) {
      const payload={
        id:asset.id, code:asset.code, name:asset.name, category:asset.cat, asset_type:asset.type, ownership:asset.own,
        status:asset.status, technical_condition:asset.cond, manufacturer:asset.mfr ?? null, model:asset.model ?? null,
        manufacture_year:asset.year ?? null, fuel_type:asset.fuel ?? null, meter_type:asset.mt, meter:asset.meter ?? 0,
        standard_consumption:asset.std ?? null, acquisition_cost:asset.capex ?? null, useful_life_years:asset.life ?? null,
        residual_value:asset.resid ?? null, project_id:asset.proj || null, driver_id:asset.drv || null, customer:asset.cust ?? null,
        plate_number:asset.plate ?? null, purchase_date:asset.buy || null, license_expiry:asset.lic || null, insurance_expiry:asset.ins || null,
        contract_id:asset.contract || null,
        metadata:{notes:asset.notes ?? ''},
      }
      const {error}=await supabase.from('assets').upsert(payload)
      if(error)throw error
      await this.recordAudit('حفظ أصل','assets',asset.id,`${asset.code} — ${asset.name}`)
      return
    }
    const index=this.local.assets.findIndex(x=>x.id===asset.id)
    if(index<0)this.local.assets.push(asset);else this.local.assets[index]=asset
    this.persistLocal()
    await this.recordAudit('حفظ أصل','assets',asset.id,`${asset.code} — ${asset.name}`,'local')
  }

  async listWorkOrders(): Promise<WorkOrder[]> {
    if (supabase) {
      const data = await pageAll((f, t) => supabase!.from('work_orders').select('*').order('opened', { ascending: false }).order('id').range(f, t))
      return data.map((x) => ({ ...x, asset: x.asset_id, proj: x.project_id, type:x.work_type, desc:x.description, prio:x.priority, techs:x.technicians, laborCost:Number(x.labor_cost||0), partsCost:Number(x.parts_cost||0), vendorCost:Number(x.vendor_cost||0), downHrs:x.downtime_hours, planId:x.plan_id, estimatedCost:(x.metadata as Record<string,unknown>|null)?.estimated_cost==null?undefined:Number((x.metadata as Record<string,unknown>).estimated_cost), cause:String((x.metadata as Record<string,unknown>|null)?.cause??''), materials:String((x.metadata as Record<string,unknown>|null)?.materials??''), warranty:String((x.metadata as Record<string,unknown>|null)?.warranty??''), approvalNotes:String((x.metadata as Record<string,unknown>|null)?.approval_notes??'') }))
    }
    return this.local.workOrders
  }

  async saveWorkOrder(w:WorkOrder){
    if(supabase){
      const payload={id:w.id,asset_id:w.asset,project_id:w.proj||null,work_type:w.type,description:w.desc,opened:w.opened,priority:w.prio,status:w.status,technicians:w.techs??null,labor_cost:w.laborCost??0,parts_cost:w.partsCost??0,vendor_cost:w.vendorCost??0,vendor:w.vendor??null,downtime_hours:w.downHrs??null,completed:w.completed||null,plan_id:w.planId||null,results:w.results??null,metadata:{estimated_cost:w.estimatedCost??null,cause:w.cause??null,materials:w.materials??null,warranty:w.warranty??null,approval_notes:w.approvalNotes??null}}
      const {error}=await supabase.from('work_orders').upsert(payload);if(error)throw error;await this.recordAudit('حفظ أمر صيانة','work_orders',w.id,w.desc);return
    }
    const i=this.local.workOrders.findIndex(x=>x.id===w.id);if(i<0)this.local.workOrders.push(w);else this.local.workOrders[i]=w;this.persistLocal();await this.recordAudit('حفظ أمر صيانة','work_orders',w.id,w.desc,'local')
  }

  async listFuel(): Promise<FuelOperation[]> {
    if (supabase) {
      const data = await pageAll((f, t) => supabase!.from('fuel_operations').select('*').order('operation_date', { ascending: false }).order('id').range(f, t))
      return data.map((x) => ({ ...x, type:x.operation_type, assetId: x.asset_id, tank: x.tank_id, proj: x.project_id, date:x.operation_date, sup:x.supplier, inv:x.invoice_no }))
    }
    return this.local.fuelOps
  }

  async saveFuelOperation(x:FuelOperation){
    if(supabase){
      const payload={id:x.id,operation_type:x.type,tank_id:x.tank??null,station:x.station??null,asset_id:x.assetId||null,project_id:x.proj||null,operation_date:x.date,qty:x.qty||0,price:x.price||0,total:x.total||0,status:x.status,meter:x.meter??null,notes:x.notes??null,supplier:x.sup??null,invoice_no:x.inv??null}
      const {error}=await supabase.from('fuel_operations').upsert(payload);if(error)throw error;await this.recordAudit('حفظ حركة وقود','fuel_operations',x.id,`${x.qty} لتر`);return
    }
    const i=this.local.fuelOps.findIndex(v=>v.id===x.id);if(i<0)this.local.fuelOps.unshift(x);else this.local.fuelOps[i]=x;this.persistLocal();await this.recordAudit('حفظ حركة وقود','fuel_operations',x.id,`${x.qty} لتر`,'local')
  }

  async listModuleRecords(module:string):Promise<AnyRecord[]> {
    if(supabase && module==='drivers') {
      const {data,error}=await supabase.from('drivers').select('*').order('code'); if(error)throw error
      return (data??[]).map(x=>({id:x.id,code:x.code,name:x.name,phone:x.phone??'',kind:x.kind??'',licNo:x.license_no??'',licExp:x.license_expiry??'',cur:x.current_assignment??''}))
    }
    if(supabase && module==='audit') return this.listAuditLog()
    if(supabase && module==='contracts') {
      const {data,error}=await supabase.from('contracts').select('*').order('number'); if(error)throw error
      return (data??[]).map(x=>({id:x.id,number:x.number,lessor:x.lessor,phone:x.phone??'',assets:Array.isArray(x.assets)?x.assets.join(', '):valueJson(x.assets),start:x.start_date??'',end:x.end_date??'',rate:x.rate??'',unit:x.unit??'',minimum:x.minimum??'',fuelT:x.fuel_terms??'',operT:x.operation_terms??'',maintT:x.maintenance_terms??'',status:x.status,notes:x.notes??''}))
    }
    if(supabase && !CORE_MODULES.has(module)){
      const data=await pageAll((f,t)=>supabase!.from('tfms_module_records').select('record_id,payload').eq('module_name',module).order('updated_at',{ascending:false}).order('record_id').range(f,t))
      return data.map(x=>({...(x.payload as AnyRecord),id:x.record_id}))
    }
    const localKey:Record<string,string>={inventory:'items',movements:'moves',purchases:'purchaseReqs',oils:'oilPlans'}
    const value=this.local[localKey[module]??module]
    return Array.isArray(value)?structuredClone(value as AnyRecord[]):[]
  }

  async saveModuleRecord(module:string,record:AnyRecord){
    const id=String(record.id||`${module.toUpperCase()}-${Date.now()}`)
    if(supabase && module==='drivers') {
      const payload={id,code:String(record.code??''),name:String(record.name??''),phone:String(record.phone??''),kind:String(record.kind??''),license_no:String(record.licNo??''),license_expiry:String(record.licExp??'')||null,current_assignment:String(record.cur??'')}
      const {error}=await supabase.from('drivers').upsert(payload); if(error)throw error; await this.recordAudit('حفظ سائق/مشغل','drivers',id,String(record.name??'')); return record.id?record:{...record,id}
    }
    if(supabase && module==='audit') throw new Error('سجل التدقيق للقراءة فقط')
    if(supabase && module==='contracts') {
      const raw=record.assets; const assets=Array.isArray(raw)?raw:String(raw??'').split(',').map(x=>x.trim()).filter(Boolean)
      const payload={id,number:String(record.number??''),lessor:String(record.lessor??''),phone:String(record.phone??''),assets,start_date:String(record.start??'')||null,end_date:String(record.end??'')||null,rate:Number(record.rate||0),unit:String(record.unit??''),minimum:Number(record.minimum||0),fuel_terms:String(record.fuelT??''),operation_terms:String(record.operT??''),maintenance_terms:String(record.maintT??''),status:String(record.status??'ساري'),notes:String(record.notes??'')}
      const {error}=await supabase.from('contracts').upsert(payload); if(error)throw error; await this.recordAudit('حفظ عقد','contracts',id,String(record.number??'')); return {...record,id}
    }
    if(supabase && !CORE_MODULES.has(module)){
      // onConflict ضروري: بدونه supabase-js بيفترض المفتاح الأساسي (id) فيفشل كل تعديل لسجل موجود بـ duplicate key.
      // الحارس والترقيم وسجل الاعتماد والتدقيق كلها بتحصل في القاعدة (008) — بنرجّع النسخة المخزّنة عشان الرقم اللي حدّده الخادم يظهر.
      const {data:saved,error}=await supabase.from('tfms_module_records').upsert({module_name:module,record_id:id,payload:{...record,id}},{onConflict:'module_name,record_id'}).select('record_id,payload').single()
      if(error)throw error
      return {...(saved.payload as AnyRecord),id:saved.record_id}
    }
    const localKey:Record<string,string>={inventory:'items',movements:'moves',purchases:'purchaseReqs',oils:'oilPlans'}
    const storageKey=localKey[module]??module
    const arr=(Array.isArray(this.local[storageKey])?this.local[storageKey]:[]) as AnyRecord[]
    const i=arr.findIndex(x=>String(x.id)===id)
    const previousStatus=i>=0?String(arr[i].status??''):''
    const nextStatus=String(record.status??'')
    if(i<0)arr.push({...record,id});else arr[i]={...record,id}
    this.local[storageKey]=arr as never
    this.persistLocal()
    if(nextStatus && nextStatus!==previousStatus) await this.recordAudit('تغيير حالة',module,id,`${previousStatus||'بداية السجل'} ← ${nextStatus}`,'local')
    await this.recordAudit('حفظ سجل',module,id,JSON.stringify(record).slice(0,500),'local'); return {...record,id}
  }

  async deleteModuleRecord(module:string,id:string){
    if(module==='audit') throw new Error('سجل التدقيق للقراءة فقط')

    if(supabase && (module==='drivers'||module==='contracts')) {
      const {data,error}=await supabase.from(module).delete().eq('id',id).select('id')
      if(error)throw error
      if(!data?.length)throw new Error('لم يتم العثور على السجل أو لا تملك صلاحية حذفه')
      await this.recordAudit(module==='drivers'?'حذف سائق/مشغل':'حذف عقد',module,id,'حذف سجل')
      return
    }
    if(supabase && !CORE_MODULES.has(module)){
      const {data,error}=await supabase.from('tfms_module_records').delete().eq('module_name',module).eq('record_id',id).select('record_id')
      if(error)throw error
      if(!data?.length)throw new Error('لم يتم العثور على السجل أو لا تملك صلاحية حذفه')
      await this.recordAudit('حذف سجل',module,id,'حذف سجل من الوحدة')
      return
    }
    const localKey:Record<string,string>={inventory:'items',movements:'moves',purchases:'purchaseReqs',oils:'oilPlans'}
    const storageKey=localKey[module]??module
    const arr=(Array.isArray(this.local[storageKey])?this.local[storageKey]:[]) as AnyRecord[]
    const existing=arr.some(x=>String(x.id)===id)
    if(!existing)throw new Error('السجل غير موجود')
    this.local[storageKey]=arr.filter(x=>String(x.id)!==id) as never
    this.persistLocal()
    await this.recordAudit('حذف سجل',module,id,'حذف سجل من البيانات المحلية','local')
  }

  async listOperations():Promise<AnyRecord[]> { return this.listModuleRecords('operations') }

  getModuleSeed(module:string):AnyRecord[]{const localKey:Record<string,string>={inventory:'items',movements:'moves',purchases:'purchaseReqs',oils:'oilPlans'};const value=this.local[localKey[module]??module];return Array.isArray(value)?value as AnyRecord[]:[]}

  saveDemoDb(db: DemoDb) { this.local = db; saveLocal(db) }
}

function valueJson(v:unknown){return v==null?'':JSON.stringify(v)}

export const repository = new TfmsRepository()
