import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Download, LayoutGrid, List, Plus, RefreshCw, Search, Truck, X } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { ModalPortal } from '../components/ui/ModalPortal'
import { Card } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'
import { DataTable, type DataTableColumn } from '../components/ui/DataTable'
import { StatusBadge } from '../components/ui/StatusBadge'
import { tripsService } from '../features/trips/service'
import { TRIP_STATUS_LABELS, TRIP_TYPE_LABELS, TRIP_STATUS_TRANSITIONS, type Trip, type TripStatus, type TripType } from '../features/trips/types'
import type { Asset, Driver, Project, Customer } from '../types/tfms'

const money=(n:number|null|undefined,currency='EGP')=>new Intl.NumberFormat('ar-EG',{style:'currency',currency,maximumFractionDigits:2}).format(Number(n??0))
const statusTone=(s:TripStatus)=>s==='received'||s==='paid'?'emerald':s==='cancelled'?'red':s==='invoiced'?'blue':s==='delivered'?'amber':s==='in_transit'?'blue':'gray'
const boardColumns:TripStatus[]=['draft','assigned','dispatched','in_transit','delivered','received','invoiced','paid']

export function TripsPage({assets,drivers,projects,clients,onRoute,initialView='list',currencyCode='EGP'}:{assets:Asset[];drivers:Driver[];projects:Project[];clients:Customer[];onRoute:(path:string)=>void;initialView?:'list'|'board';currencyCode?:string}) {
 const [trips,setTrips]=useState<Trip[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[query,setQuery]=useState(''),[status,setStatus]=useState('all'),[tripType,setTripType]=useState('all'),[from,setFrom]=useState(''),[to,setTo]=useState(''),[showForm,setShowForm]=useState(false),[saving,setSaving]=useState(false),[view,setView]=useState<'list'|'board'>(initialView)
 const load=async()=>{setLoading(true);try{setTrips(await tripsService.list());setError('')}catch(e){setError(e instanceof Error?e.message:'تعذر تحميل بيانات النقل.')}finally{setLoading(false)}}
 useEffect(()=>{void load()},[])
 useEffect(()=>setView(initialView),[initialView])
 const assetName=(id:string|null)=>assets.find(a=>a.id===id)?.name??id??'—'
 const driverName=(id:string)=>drivers.find(d=>d.id===id)?.name??id
 const projectName=(id:string|null)=>projects.find(p=>p.id===id)?.name??id??'—'
 const filtered=useMemo(()=>trips.filter(t=>{
   const hay=[t.trip_number,t.cargo_description,driverName(t.driver_id),assetName(t.truck_asset_id),projectName(t.to_project_id),t.from_location,t.to_location].join(' ').toLocaleLowerCase('ar')
   const start=String(t.scheduled_start??'').slice(0,10),end=String(t.scheduled_end??t.scheduled_start??'').slice(0,10)
   return (status==='all'||(status==='active'?['assigned','dispatched','in_transit'].includes(t.status):status==='delivered'?['delivered','received'].includes(t.status):status==='unbilled'?t.status==='received'&&t.is_billable:t.status===status)) &&
     (tripType==='all'||t.trip_type===tripType) && (!from||end>=from) && (!to||start<=to) && hay.includes(query.toLocaleLowerCase('ar'))
 }),[trips,status,tripType,query,from,to,assets,drivers,projects])
 const columns:DataTableColumn<Trip>[]=[
  {id:'trip_number',header:'رقم النقل',render:t=><button className="font-semibold text-primary-700 hover:underline" onClick={()=>onRoute(`trips/${t.id}`)}>{t.trip_number}</button>,sortable:true},
  {id:'trip_type',header:'النوع',render:t=>TRIP_TYPE_LABELS[t.trip_type]},
  {id:'truck_asset_id',header:'الشاحنة',render:t=>assetName(t.truck_asset_id)},
  {id:'driver_id',header:'السائق',render:t=>driverName(t.driver_id)},
  {id:'route',header:'المسار',render:t=><span>{t.from_location||projectName(t.from_project_id)} ← {t.to_location||projectName(t.to_project_id)}</span>},
  {id:'cargo_description',header:'الحمولة',render:t=><span>{t.cargo_description}{t.cargo_quantity!=null?` (${t.cargo_quantity} ${t.cargo_unit??''})`:''}</span>},
  {id:'scheduled_start',header:'التاريخ',render:t=>String(t.scheduled_start??'').replace('T',' ').slice(0,16)||'—',sortable:true},
  {id:'total_charge',header:'قيمة النقل',render:t=>money(t.total_charge,currencyCode),sortable:true},
  {id:'status',header:'الحالة',render:t=><StatusBadge tone={statusTone(t.status)}>{TRIP_STATUS_LABELS[t.status]}</StatusBadge>},
  {id:'actions',header:'إجراء',render:t=><div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={()=>onRoute(`trips/${t.id}`)}>التفاصيل</Button>{TRIP_STATUS_TRANSITIONS[t.status][0]&&<Button size="sm" onClick={()=>void advance(t)}>{TRIP_STATUS_LABELS[TRIP_STATUS_TRANSITIONS[t.status][0]]}</Button>}</div>}
 ]
 const advance=async(t:Trip)=>{try{const next=TRIP_STATUS_TRANSITIONS[t.status][0];if(!next)return;await tripsService.updateStatus(t.id,next);await load()}catch(e){setError(e instanceof Error?e.message:'تعذر تغيير حالة النقل.')}}
 const exportCsv=()=>{const header=['رقم النقل','النوع','الشاحنة','السائق','من','إلى','الحمولة','الحالة','القيمة'];const lines=filtered.map(t=>[t.trip_number,TRIP_TYPE_LABELS[t.trip_type],assetName(t.truck_asset_id),driverName(t.driver_id),t.from_location||projectName(t.from_project_id),t.to_location||projectName(t.to_project_id),t.cargo_description,TRIP_STATUS_LABELS[t.status],String(t.total_charge??0)]);const csv=[header,...lines].map(r=>r.map(x=>`"${String(x??'').replaceAll('"','""')}"`).join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([`\ufeff${csv}`],{type:'text/csv;charset=utf-8'}));a.download=`KEMEX-transport-${new Date().toISOString().slice(0,10)}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),700)}
 const count=(pred:(t:Trip)=>boolean)=>trips.filter(pred).length
 return <div className="space-y-6" dir="rtl"><PageHeader title="النقل" description="التخطيط والتشغيل والمتابعة والفوترة لدورة نقل واحدة من الإنشاء حتى السداد." action={<div className="flex flex-wrap gap-2"><Button variant="secondary" icon={<RefreshCw size={16}/>} onClick={()=>void load()}>تحديث</Button><Button variant="secondary" icon={<Download size={16}/>} onClick={exportCsv} disabled={!filtered.length}>تصدير</Button><Button onClick={()=>{setError('');setShowForm(true)}} icon={<Plus size={17}/>}>نقل جديد</Button></div>}/>
 {error&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">{error}</div>}
 <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{[['كل عمليات النقل',trips.length],['قيد التنفيذ',count(t=>['assigned','dispatched','in_transit'].includes(t.status))],['تم التسليم',count(t=>['delivered','received'].includes(t.status))],['غير مفوتر',count(t=>t.status==='received'&&t.is_billable&&!t.invoice_id)],['قيمة النقل',money(trips.reduce((s,t)=>s+Number(t.total_charge||0),0),currencyCode)]].map(([label,value])=><Card key={String(label)}><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-xl font-bold text-slate-900">{value}</p></Card>)}</div>
 <Card><div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center"><div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3"><Search size={17}/><input className="min-h-11 w-full bg-transparent text-sm outline-none" value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث برقم النقل أو السائق أو المسار أو الحمولة"/></div><select className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">كل الحالات</option><option value="active">قيد التنفيذ</option><option value="unbilled">غير مفوتر</option>{Object.entries(TRIP_STATUS_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select><select className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm" value={tripType} onChange={e=>setTripType(e.target.value)}><option value="all">كل الأنواع</option>{Object.entries(TRIP_TYPE_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select><input aria-label="من تاريخ" type="date" className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm" value={from} onChange={e=>setFrom(e.target.value)}/><input aria-label="إلى تاريخ" type="date" className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm" value={to} onChange={e=>setTo(e.target.value)}/><div className="flex shrink-0 gap-1 rounded-lg border border-slate-200 p-1"><button className={`rounded-md px-3 py-2 ${view==='list'?'bg-slate-900 text-white':'text-slate-600'}`} onClick={()=>setView('list')}><List size={16}/></button><button className={`rounded-md px-3 py-2 ${view==='board'?'bg-slate-900 text-white':'text-slate-600'}`} onClick={()=>setView('board')}><LayoutGrid size={16}/></button></div></div>
 {view==='list'?<DataTable rows={filtered} columns={columns} rowKey={t=>t.id} searchable={false} emptyState={<div className="py-8 text-center text-sm text-slate-500">{loading?'جارٍ تحميل عمليات النقل…':'لا توجد عمليات نقل مطابقة.'}</div>}/>:<DispatchBoard trips={filtered} assets={assets} drivers={drivers} projects={projects} onRoute={onRoute}/>}</Card>
 {showForm&&<TransportForm assets={assets} drivers={drivers} projects={projects} clients={clients} saving={saving} onClose={()=>!saving&&setShowForm(false)} onSave={async(payload)=>{setSaving(true);try{await tripsService.create(payload);setShowForm(false);await load()}catch(e){setError(e instanceof Error?e.message:'تعذر إنشاء عملية النقل.')}finally{setSaving(false)}}}/>}</div>
}

function DispatchBoard({trips,assets,drivers,projects,onRoute}:{trips:Trip[];assets:Asset[];drivers:Driver[];projects:Project[];onRoute:(path:string)=>void}){const name=(id:string|null,items:{id:string;name:string}[])=>items.find(x=>x.id===id)?.name??id??'—';return <div className="grid gap-3 overflow-x-auto pb-2 xl:grid-cols-4">{boardColumns.map(status=>{const rows=trips.filter(t=>t.status===status);return <section key={status} className="min-w-[260px] rounded-xl bg-slate-50 p-3"><div className="mb-3 flex items-center justify-between"><span className="font-semibold text-slate-800">{TRIP_STATUS_LABELS[status]}</span><span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-500">{rows.length}</span></div><div className="space-y-2">{rows.map(t=><button key={t.id} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-right shadow-sm hover:border-slate-300" onClick={()=>onRoute(`trips/${t.id}`)}><div className="flex items-center justify-between gap-2"><strong className="text-sm text-slate-900">{t.trip_number}</strong><StatusBadge tone={statusTone(t.status)}>{TRIP_TYPE_LABELS[t.trip_type]}</StatusBadge></div><div className="mt-2 text-sm text-slate-700">{t.cargo_description}</div><div className="mt-2 text-xs text-slate-500">{name(t.truck_asset_id,assets)} • {name(t.driver_id,drivers)}</div><div className="mt-1 text-xs text-slate-400">{t.from_location||name(t.from_project_id,projects)} ← {t.to_location||name(t.to_project_id,projects)}</div></button>)}</div></section>})}</div>}

function TransportForm({assets,drivers,projects,clients,saving,onClose,onSave}:{assets:Asset[];drivers:Driver[];projects:Project[];clients:Customer[];saving:boolean;onClose:()=>void;onSave:(payload:Parameters<typeof tripsService.create>[0])=>Promise<void>}){
 const [form,setForm]=useState({trip_type:'cargo' as TripType,truck_asset_id:'',trailer_asset_id:'',driver_id:'',from_project_id:'',to_project_id:'',from_location:'',to_location:'',cargo_description:'',cargo_quantity:'',cargo_unit:'ton',scheduled_start:'',scheduled_end:'',rate_type:'per_trip' as Trip['rate_type'],rate_amount:'',billed_to_client_id:'',is_billable:true,notes:''})
 const set=(key:string,value:string|boolean)=>setForm(x=>({...x,[key]:value}))
 const submit=async(e:FormEvent)=>{e.preventDefault();if(!form.truck_asset_id||!form.driver_id||!form.cargo_description.trim())return;await onSave({trip_type:form.trip_type,truck_asset_id:form.truck_asset_id,trailer_asset_id:form.trailer_asset_id||null,driver_id:form.driver_id,contract_id:null,from_project_id:form.from_project_id||null,to_project_id:form.to_project_id||null,from_location:form.from_location.trim()||null,to_location:form.to_location.trim()||null,cargo_description:form.cargo_description.trim(),cargo_quantity:form.cargo_quantity?Number(form.cargo_quantity):null,cargo_unit:form.cargo_unit||null,scheduled_start:form.scheduled_start||null,scheduled_end:form.scheduled_end||null,status:'draft',distance_km:null,fuel_consumed_liters:null,rate_type:form.rate_type,rate_amount:form.rate_amount?Number(form.rate_amount):null,is_billable:form.is_billable,billed_to_client_id:form.billed_to_client_id||null,invoice_id:null,notes:form.notes.trim()||null})}
 return (
  <ModalPortal onBackdropMouseDown={onClose}>
   <div className="modal-backdrop">
    <form className="modal-card wide form-modal-premium trips-create-modal" role="dialog" aria-modal="true" aria-labelledby="create-trip-title" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}>
     <div className="modal-head">
      <div>
       <div className="form-kicker">عملية نقل جديدة</div>
       <h2 id="create-trip-title" className="flex items-center gap-2"><Truck size={18}/> إنشاء عملية نقل</h2>
       <p>سجّل بيانات الرحلة الأساسية، ثم تابع مراحل الإرسال والتسليم والفوترة من بطاقة العملية.</p>
      </div>
      <button type="button" className="icon-button" onClick={onClose} aria-label="إغلاق"><X size={18}/></button>
     </div>

     <div className="form-modal-content trips-create-modal-body">
      <div className="modal-context-strip"><strong>دورة النقل</strong><span className="context-separator">•</span><span>ابدأ بالبيانات الأساسية؛ الحقول الاختيارية يمكن استكمالها لاحقًا.</span></div>

      <section className="form-section">
       <div className="form-section-head"><div><strong>البيانات الأساسية</strong><span>النوع والوسيلة والسائق</span></div></div>
       <div className="form-grid">
        <label className="field"><span>نوع النقل</span><select value={form.trip_type} onChange={e=>set('trip_type',e.target.value)}>{Object.entries(TRIP_TYPE_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
        <label className="field"><span>الشاحنة <em className="required-mark">*</em></span><select required value={form.truck_asset_id} onChange={e=>set('truck_asset_id',e.target.value)}><option value="">اختر الشاحنة</option>{assets.filter(a=>/شاحنة|truck|نقل/i.test(`${a.type} ${a.cat} ${a.name}`)).map(a=><option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}</select></label>
        <label className="field"><span>المقطورة</span><select value={form.trailer_asset_id} onChange={e=>set('trailer_asset_id',e.target.value)}><option value="">بدون</option>{assets.filter(a=>/مقطورة|trailer|نصف مقطورة/i.test(`${a.type} ${a.cat} ${a.name}`)).map(a=><option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}</select></label>
        <label className="field"><span>السائق <em className="required-mark">*</em></span><select required value={form.driver_id} onChange={e=>set('driver_id',e.target.value)}><option value="">اختر السائق</option>{drivers.map(d=><option key={d.id} value={d.id}>{d.name} — {d.code}</option>)}</select></label>
       </div>
      </section>

      <section className="form-section">
       <div className="form-section-head"><div><strong>المسار والحمولة</strong><span>المشروعات والمواقع ووصف الحمولة</span></div></div>
       <div className="form-grid">
        <label className="field"><span>مشروع المصدر</span><select value={form.from_project_id} onChange={e=>set('from_project_id',e.target.value)}><option value="">بدون</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label className="field"><span>مشروع الاستقبال</span><select value={form.to_project_id} onChange={e=>set('to_project_id',e.target.value)}><option value="">بدون</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label className="field"><span>من موقع</span><input value={form.from_location} onChange={e=>set('from_location',e.target.value)} placeholder="الموقع / المنطقة"/></label>
        <label className="field"><span>إلى موقع</span><input value={form.to_location} onChange={e=>set('to_location',e.target.value)} placeholder="الوجهة / الموقع"/></label>
        <label className="field field-full"><span>وصف الحمولة <em className="required-mark">*</em></span><input required value={form.cargo_description} onChange={e=>set('cargo_description',e.target.value)} placeholder="وصف واضح للحمولة أو المهمة"/></label>
        <label className="field"><span>الكمية</span><input type="number" min="0" step="0.001" value={form.cargo_quantity} onChange={e=>set('cargo_quantity',e.target.value)} placeholder="0"/></label>
        <label className="field"><span>الوحدة</span><select value={form.cargo_unit} onChange={e=>set('cargo_unit',e.target.value)}><option value="ton">طن</option><option value="m3">م³</option><option value="piece">قطعة</option><option value="trip">رحلة</option></select></label>
       </div>
      </section>

      <section className="form-section">
       <div className="form-section-head"><div><strong>الوقت والفوترة</strong><span>الجدولة والتسعير والعميل</span></div></div>
       <div className="form-grid">
        <label className="field"><span>موعد الانطلاق</span><input type="datetime-local" value={form.scheduled_start} onChange={e=>set('scheduled_start',e.target.value)}/></label>
        <label className="field"><span>الوصول المتوقع</span><input type="datetime-local" value={form.scheduled_end} onChange={e=>set('scheduled_end',e.target.value)}/></label>
        <label className="field"><span>أساس التسعير</span><select value={form.rate_type} onChange={e=>set('rate_type',e.target.value)}><option value="per_trip">بالعملية</option><option value="per_ton">بالطن</option><option value="per_km">بالكيلومتر</option><option value="per_m3">بالمتر المكعب</option><option value="fixed_monthly">شهري ثابت</option></select></label>
        <label className="field"><span>القيمة</span><input type="number" min="0" step="0.01" value={form.rate_amount} onChange={e=>set('rate_amount',e.target.value)} placeholder="0.00"/></label>
        <label className="field"><span>العميل</span><select value={form.billed_to_client_id} onChange={e=>set('billed_to_client_id',e.target.value)}><option value="">غير محدد</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="check-field"><input type="checkbox" checked={form.is_billable} onChange={e=>set('is_billable',e.target.checked)}/><span>قابل للفوترة</span></label>
        <label className="field field-full"><span>ملاحظات</span><textarea rows={3} value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="أي تفاصيل إضافية عن التنفيذ أو التسعير أو الترتيبات..."/></label>
       </div>
      </section>
     </div>

     <div className="modal-actions">
      <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>إلغاء</Button>
      <Button type="submit" loading={saving} icon={<Truck size={16}/>}>حفظ عملية النقل</Button>
     </div>
    </form>
   </div>
  </ModalPortal>
 )
}
