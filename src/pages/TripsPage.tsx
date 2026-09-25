import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { LayoutGrid, List, MapPin, Plus, RefreshCw, Search, Truck, X, ClipboardList } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { ModalPortal } from '../components/ui/ModalPortal'
import { Card } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'
import { DataTable, type DataTableColumn } from '../components/ui/DataTable'
import { StatusBadge } from '../components/ui/StatusBadge'
import { tripsService } from '../features/trips/service'
import { TRIP_STATUS_LABELS, TRIP_TYPE_LABELS, TRIP_STATUS_TRANSITIONS, type Trip, type TripStatus, type TripType } from '../features/trips/types'
import type { Asset, Driver, Project, Customer } from '../types/tfms'
import { OperationalSummaryStrip } from '../shared/ui'
import { LocationMapPicker } from '../components/LocationMapPicker'

import { APP_LOCALE } from '../shared/formatters/locale'
const money=(n:number|null|undefined,currency='EGP')=>new Intl.NumberFormat(APP_LOCALE,{style:'currency',currency,maximumFractionDigits:2}).format(Number(n??0))
const statusTone=(s:TripStatus)=>s==='received'||s==='paid'?'emerald':s==='cancelled'?'red':s==='invoiced'?'blue':s==='delivered'?'amber':s==='in_transit'?'blue':'gray'
const boardColumns:TripStatus[]=['draft','assigned','dispatched','in_transit','delivered','received','invoiced','paid']
const EXECUTION_STATUS_LABELS:Record<string,string>={assigned:'رحلة مخصصة',to_pickup:'في الطريق للتحميل',arrived_pickup:'وصل للتحميل',pickup_confirmed:'تم الاستلام',in_transit:'قيد النقل',arrived_delivery:'وصل للتسليم',delivered:'تم التسليم',completed:'الرحلة مكتملة'}
const EXECUTION_STATUS_TONES:Record<string,'blue'|'amber'|'emerald'|'red'|'gray'>={assigned:'gray',to_pickup:'blue',arrived_pickup:'amber',pickup_confirmed:'emerald',in_transit:'blue',arrived_delivery:'amber',delivered:'emerald',completed:'emerald'}

export function TripsPage({assets,drivers,projects,clients,onRoute,initialView='list',currencyCode='EGP'}:{assets:Asset[];drivers:Driver[];projects:Project[];clients:Customer[];onRoute:(path:string)=>void;initialView?:'list'|'board';currencyCode?:string}) {
 const [trips,setTrips]=useState<Trip[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[query,setQuery]=useState(''),[status,setStatus]=useState('all'),[tripType,setTripType]=useState('all'),[from,setFrom]=useState(''),[to,setTo]=useState(''),[showForm,setShowForm]=useState(false),[saving,setSaving]=useState(false),[formError,setFormError]=useState(''),[view,setView]=useState<'list'|'board'>(initialView)
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
  {id:'trip_number',header:'رقم النقل',exportValue:t=>t.trip_number,render:t=><button className="font-semibold text-primary-700 hover:underline" onClick={()=>onRoute(`trips/${t.id}`)}>{t.trip_number}</button>,sortable:true},
  {id:'trip_type',header:'النوع',exportValue:t=>TRIP_TYPE_LABELS[t.trip_type],render:t=>TRIP_TYPE_LABELS[t.trip_type]},
  {id:'truck_asset_id',header:'الشاحنة',exportValue:t=>assetName(t.truck_asset_id),render:t=>assetName(t.truck_asset_id)},
  {id:'driver_id',header:'السائق',exportValue:t=>driverName(t.driver_id),render:t=>driverName(t.driver_id)},
  {id:'route',header:'المسار',exportValue:t=>`${t.from_location||projectName(t.from_project_id)} ← ${t.to_location||projectName(t.to_project_id)}`,render:t=><span>{t.from_location||projectName(t.from_project_id)} ← {t.to_location||projectName(t.to_project_id)}</span>},
  {id:'cargo_description',header:'الحمولة',exportValue:t=>`${t.cargo_description}${t.cargo_quantity!=null?` (${t.cargo_quantity} ${t.cargo_unit??''})`:''}`,render:t=><span>{t.cargo_description}{t.cargo_quantity!=null?` (${t.cargo_quantity} ${t.cargo_unit??''})`:''}</span>},
  {id:'scheduled_start',header:'التاريخ',exportValue:t=>String(t.scheduled_start??'').replace('T',' ').slice(0,16),render:t=>String(t.scheduled_start??'').replace('T',' ').slice(0,16)||'—',sortable:true},
  {id:'total_charge',header:'قيمة النقل',exportValue:t=>Number(t.total_charge??0),render:t=>money(t.total_charge,currencyCode),sortable:true},
  {id:'status',header:'الحالة التجارية',exportValue:t=>TRIP_STATUS_LABELS[t.status],render:t=><StatusBadge tone={statusTone(t.status)}>{TRIP_STATUS_LABELS[t.status]}</StatusBadge>},
  {id:'execution_status',header:'التنفيذ التشغيلي',exportValue:t=>t.execution_status?EXECUTION_STATUS_LABELS[t.execution_status]||t.execution_status:'—',render:t=>t.execution_status?<StatusBadge tone={EXECUTION_STATUS_TONES[t.execution_status]||'gray'}>{EXECUTION_STATUS_LABELS[t.execution_status]||t.execution_status}</StatusBadge>:<span className="text-slate-400">—</span>},
  {id:'actions',header:'إجراء',render:t=><div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={()=>onRoute(`trips/${t.id}`)}>التفاصيل</Button>{TRIP_STATUS_TRANSITIONS[t.status][0]&&<Button size="sm" onClick={()=>void advance(t)}>{TRIP_STATUS_LABELS[TRIP_STATUS_TRANSITIONS[t.status][0]]}</Button>}</div>}
 ]
 const advance=async(t:Trip)=>{try{const next=TRIP_STATUS_TRANSITIONS[t.status][0];if(!next)return;await tripsService.updateStatus(t.id,next);await load()}catch(e){setError(e instanceof Error?e.message:'تعذر تغيير حالة النقل.')}}
 const count=(pred:(t:Trip)=>boolean)=>trips.filter(pred).length
 return <div className="space-y-6 phase2-page trips-page" dir="rtl"><PageHeader title="النقل" description="التخطيط والتشغيل والمتابعة والفوترة لدورة نقل واحدة من الإنشاء حتى السداد." action={<div className="flex flex-wrap gap-2"><Button variant="secondary" icon={<ClipboardList size={16}/>} onClick={()=>onRoute('trips/dispatch')}>لوحة الإرسال</Button><Button variant="secondary" icon={<RefreshCw size={16}/>} onClick={()=>void load()}>تحديث</Button><Button onClick={()=>{setError('');setFormError('');setShowForm(true)}} icon={<Plus size={17}/>}>نقل جديد</Button></div>}/>
 {error&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">{error}</div>}
 <OperationalSummaryStrip items={[
   { id:'all', label:'كل عمليات النقل', value:trips.length },
   { id:'active', label:'قيد التنفيذ', value:count(t=>['assigned','dispatched','in_transit'].includes(t.status)) },
   { id:'delayed', label:'متأخرة', value:count(t=>['assigned','dispatched','in_transit'].includes(t.status) && !!t.scheduled_end && new Date(t.scheduled_end).getTime() < Date.now()), tone:'alert' },
   { id:'delivered', label:'تم التسليم', value:count(t=>['delivered','received'].includes(t.status)), tone:'success' },
   { id:'unbilled', label:'غير مفوتر', value:count(t=>t.status==='received'&&t.is_billable&&!t.invoice_id), tone:count(t=>t.status==='received'&&t.is_billable&&!t.invoice_id)?'alert':'default' },
   { id:'value', label:'قيمة النقل', value:money(trips.reduce((s,t)=>s+Number(t.total_charge||0),0),currencyCode) },
 ]} />
 <Card><div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center"><div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3"><Search size={17}/><input className="min-h-11 w-full bg-transparent text-sm outline-none" value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث برقم النقل أو السائق أو المسار أو الحمولة"/></div><select className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">كل الحالات</option><option value="active">قيد التنفيذ</option><option value="unbilled">غير مفوتر</option>{Object.entries(TRIP_STATUS_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select><select className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm" value={tripType} onChange={e=>setTripType(e.target.value)}><option value="all">كل الأنواع</option>{Object.entries(TRIP_TYPE_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select><input aria-label="من تاريخ" type="date" className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm" value={from} onChange={e=>setFrom(e.target.value)}/><input aria-label="إلى تاريخ" type="date" className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm" value={to} onChange={e=>setTo(e.target.value)}/><div className="flex shrink-0 gap-1 rounded-lg border border-slate-200 p-1"><button type="button" aria-pressed={view==='list'} aria-label="عرض القائمة" className={`rounded-md px-3 py-2 ${view==='list'?'bg-slate-900 text-white':'text-slate-600'}`} onClick={()=>setView('list')}><List size={16}/></button><button type="button" aria-pressed={view==='board'} aria-label="عرض اللوحة" className={`rounded-md px-3 py-2 ${view==='board'?'bg-slate-900 text-white':'text-slate-600'}`} onClick={()=>setView('board')}><LayoutGrid size={16}/></button></div></div>
 {view==='list'?<DataTable printOrientation="landscape" rows={filtered} columns={columns} rowKey={t=>t.id} loading={loading} searchable={false} mobilePresentation="cards" enableColumnVisibility columnVisibilityStorageKey="kemex.trips.columns.v1" exportable exportFileName={`KEMEX-transport-${new Date().toISOString().slice(0,10)}`} pageSizeOptions={[10,25,50]} emptyState={<div className="py-8 text-center text-sm text-slate-500">{loading?'جارٍ تحميل عمليات النقل…':'لا توجد عمليات نقل مطابقة.'}</div>}/>:<DispatchBoard trips={filtered} assets={assets} drivers={drivers} projects={projects} onRoute={onRoute} onAdvance={advance}/>}</Card>
 {showForm&&<TransportForm assets={assets} drivers={drivers} projects={projects} clients={clients} saving={saving} onClose={()=>!saving&&setShowForm(false)} onSave={async(payload)=>{setSaving(true);try{await tripsService.create(payload);setShowForm(false);await load()}catch(e){setError(e instanceof Error?e.message:'تعذر إنشاء عملية النقل.')}finally{setSaving(false)}}}/>}</div>
}

function LocationField({title,name,latitude,longitude,onSelect}:{title:string;name:string;latitude:string;longitude:string;onSelect:()=>void}){const selected=latitude&&longitude;return <div className="field"><span>{title}</span><div className="rounded-xl border border-slate-200 bg-white p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><strong className="block truncate text-sm text-slate-900">{name||'لم يتم تحديد اسم الموقع'}</strong><p className="mt-1 text-[11px] text-slate-500">{selected?`${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}`:'اختر نقطة دقيقة على الخريطة'}</p></div><Button type="button" size="sm" variant="secondary" icon={<MapPin size={14}/>} onClick={onSelect}>{selected?'تعديل الموقع':'اختيار الموقع'}</Button></div></div></div>}

function DispatchBoard({trips,assets,drivers,projects,onRoute,onAdvance}:{trips:Trip[];assets:Asset[];drivers:Driver[];projects:Project[];onRoute:(path:string)=>void;onAdvance:(trip:Trip)=>void}){const name=(id:string|null,items:{id:string;name:string}[])=>items.find(x=>x.id===id)?.name??id??'—';return <div className="grid gap-3 overflow-x-auto pb-2 xl:grid-cols-4 snap-x snap-mandatory scroll-px-3">{boardColumns.map(status=>{const rows=trips.filter(t=>t.status===status);return <section key={status} className="min-w-[260px] snap-start rounded-xl bg-slate-50 p-3"><div className="mb-3 flex items-center justify-between"><span className="font-semibold text-slate-800">{TRIP_STATUS_LABELS[status]}</span><span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-500">{rows.length}</span></div><div className="space-y-2">{rows.map(t=>{const next=TRIP_STATUS_TRANSITIONS[t.status][0];return <article key={t.id} className="rounded-xl border border-slate-200 bg-white p-3 text-right shadow-sm hover:border-slate-300"><button type="button" className="w-full text-right" onClick={()=>onRoute(`trips/${t.id}`)}><div className="flex items-center justify-between gap-2"><strong className="text-sm text-slate-900">{t.trip_number}</strong><StatusBadge tone={statusTone(t.status)}>{TRIP_TYPE_LABELS[t.trip_type]}</StatusBadge></div><div className="mt-2 text-sm text-slate-700">{t.cargo_description}</div><div className="mt-2 text-xs text-slate-500">{name(t.truck_asset_id,assets)} • {name(t.driver_id,drivers)}</div><div className="mt-1 text-xs text-slate-400">{t.from_location||name(t.from_project_id,projects)} ← {t.to_location||name(t.to_project_id,projects)}</div>{t.execution_status&&<div className="mt-2"><StatusBadge tone={EXECUTION_STATUS_TONES[t.execution_status]||'gray'}>{EXECUTION_STATUS_LABELS[t.execution_status]||t.execution_status}</StatusBadge></div>}</button>{next&&<button type="button" className="mt-3 w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800" onClick={()=>onAdvance(t)}>نقل إلى: {TRIP_STATUS_LABELS[next]}</button>}</article>})}</div></section>})}</div>}

function TransportForm({assets,drivers,projects,clients,saving,onClose,onSave}:{assets:Asset[];drivers:Driver[];projects:Project[];clients:Customer[];saving:boolean;onClose:()=>void;onSave:(payload:Parameters<typeof tripsService.create>[0])=>Promise<void>}){
 const [form,setForm]=useState({trip_type:'cargo' as TripType,truck_asset_id:'',trailer_asset_id:'',driver_id:'',reference_number:'',priority:'normal' as NonNullable<Trip['priority']>,from_project_id:'',to_project_id:'',from_location:'',to_location:'',pickup_latitude:'',pickup_longitude:'',delivery_latitude:'',delivery_longitude:'',operational_instructions:'',pickup_instructions:'',delivery_instructions:'',cargo_description:'',cargo_quantity:'',cargo_unit:'ton',scheduled_start:'',scheduled_end:'',rate_type:'per_trip' as Trip['rate_type'],rate_amount:'',billed_to_client_id:'',is_billable:true,notes:''})
 const [mapTarget,setMapTarget]=useState<'pickup'|'delivery'|null>(null)
 const [formError,setFormError]=useState('')
 const set=(key:string,value:string|boolean)=>setForm(x=>({...x,[key]:value}))
 const submit=async(e:FormEvent)=>{
  e.preventDefault()
  setFormError('')
  const quantity=form.cargo_quantity ? Number(form.cargo_quantity) : null
  const rate=form.rate_amount ? Number(form.rate_amount) : null
  const start=form.scheduled_start ? new Date(form.scheduled_start).getTime() : null
  const end=form.scheduled_end ? new Date(form.scheduled_end).getTime() : null
  const coords=[form.pickup_latitude,form.pickup_longitude,form.delivery_latitude,form.delivery_longitude]
  try {
   if(!form.truck_asset_id||!form.driver_id||!form.cargo_description.trim()) throw new Error('الشاحنة والسائق ووصف الحمولة حقول مطلوبة.')
   if(quantity!==null && (!Number.isFinite(quantity)||quantity<0)) throw new Error('كمية الحمولة يجب أن تكون رقمًا غير سالب.')
   if(rate!==null && (!Number.isFinite(rate)||rate<0)) throw new Error('قيمة النقل يجب أن تكون رقمًا غير سالب.')
   if(start!==null && end!==null && end<start) throw new Error('موعد الوصول المتوقع لا يمكن أن يسبق موعد الانطلاق.')
   const hasAnyCoord=coords.some(Boolean),hasAllCoords=coords.every(Boolean)
   if(hasAnyCoord&&!hasAllCoords) throw new Error('أكمل إحداثيات التحميل والتسليم أو اتركها فارغة بالكامل.')
   await onSave({...form,reference_number:form.reference_number.trim()||null,priority:form.priority,operational_instructions:form.operational_instructions.trim()||null,pickup_instructions:form.pickup_instructions.trim()||null,delivery_instructions:form.delivery_instructions.trim()||null,pickup_latitude:form.pickup_latitude?Number(form.pickup_latitude):null,pickup_longitude:form.pickup_longitude?Number(form.pickup_longitude):null,delivery_latitude:form.delivery_latitude?Number(form.delivery_latitude):null,delivery_longitude:form.delivery_longitude?Number(form.delivery_longitude):null,cargo_description:form.cargo_description.trim(),cargo_quantity:quantity,cargo_unit:form.cargo_unit||null,scheduled_start:form.scheduled_start||null,scheduled_end:form.scheduled_end||null,status:'draft',distance_km:null,fuel_consumed_liters:null,rate_type:form.rate_type,rate_amount:rate,is_billable:form.is_billable,billed_to_client_id:form.billed_to_client_id||null,invoice_id:null,notes:form.notes.trim()||null})
  } catch(err) {
   setFormError(err instanceof Error ? err.message : 'تعذر حفظ عملية النقل.')
  }
 }
 return (<>
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
      {formError&&<div className="global-error" role="alert">{formError}</div>}
      <div className="modal-context-strip"><strong>دورة النقل</strong><span className="context-separator">•</span><span>ابدأ بالبيانات الأساسية؛ الحقول الاختيارية يمكن استكمالها لاحقًا.</span></div>

      <section className="form-section">
       <div className="form-section-head"><div><strong>البيانات الأساسية</strong><span>النوع والوسيلة والسائق</span></div></div>
       <div className="form-grid">
        <label className="field"><span>نوع النقل</span><select value={form.trip_type} onChange={e=>set('trip_type',e.target.value)}>{Object.entries(TRIP_TYPE_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
        <label className="field"><span>الشاحنة <em className="required-mark">*</em></span><select required value={form.truck_asset_id} onChange={e=>set('truck_asset_id',e.target.value)}><option value="">اختر الشاحنة</option>{assets.filter(a=>/شاحنة|truck|نقل/i.test(`${a.type} ${a.cat} ${a.name}`)).map(a=><option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}</select></label>
        <label className="field"><span>المقطورة</span><select value={form.trailer_asset_id} onChange={e=>set('trailer_asset_id',e.target.value)}><option value="">بدون</option>{assets.filter(a=>/مقطورة|trailer|نصف مقطورة/i.test(`${a.type} ${a.cat} ${a.name}`)).map(a=><option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}</select></label>
        <label className="field"><span>السائق <em className="required-mark">*</em></span><select required value={form.driver_id} onChange={e=>set('driver_id',e.target.value)}><option value="">اختر السائق</option>{drivers.map(d=><option key={d.id} value={d.id}>{d.name} — {d.code}</option>)}</select></label>
        <label className="field"><span>رقم المرجع</span><input value={form.reference_number} onChange={e=>set('reference_number',e.target.value)} placeholder="رقم أمر / مرجع العميل"/></label>
        <label className="field"><span>الأولوية</span><select value={form.priority} onChange={e=>set('priority',e.target.value)}><option value="low">منخفضة</option><option value="normal">عادية</option><option value="high">عالية</option><option value="critical">حرجة</option></select></label>
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
        <LocationField title="موقع التحميل" name={form.from_location} latitude={form.pickup_latitude} longitude={form.pickup_longitude} onSelect={()=>setMapTarget('pickup')} />
        <LocationField title="موقع التسليم" name={form.to_location} latitude={form.delivery_latitude} longitude={form.delivery_longitude} onSelect={()=>setMapTarget('delivery')} />
       </div>
      </section>

      <section className="form-section">
       <div className="form-section-head"><div><strong>الوقت والفوترة</strong><span>الجدولة والتسعير والعميل</span></div></div>
       <div className="form-grid">
        <label className="field"><span>موعد الانطلاق</span><input type="datetime-local" value={form.scheduled_start} onChange={e=>set('scheduled_start',e.target.value)}/></label>
        <label className="field"><span>الوصول المتوقع</span><input type="datetime-local" value={form.scheduled_end} onChange={e=>set('scheduled_end',e.target.value)}/></label>
        <label className="field"><span>أساس التسعير</span><select value={form.rate_type ?? ''} onChange={e=>set('rate_type',e.target.value)}><option value="per_trip">بالعملية</option><option value="per_ton">بالطن</option><option value="per_km">بالكيلومتر</option><option value="per_m3">بالمتر المكعب</option><option value="fixed_monthly">شهري ثابت</option></select></label>
        <label className="field"><span>القيمة</span><input type="number" min="0" step="0.01" value={form.rate_amount} onChange={e=>set('rate_amount',e.target.value)} placeholder="0.00"/></label>
        <label className="field"><span>العميل</span><select value={form.billed_to_client_id} onChange={e=>set('billed_to_client_id',e.target.value)}><option value="">غير محدد</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="check-field"><input type="checkbox" checked={form.is_billable} onChange={e=>set('is_billable',e.target.checked)}/><span>قابل للفوترة</span></label>
        <label className="field field-full"><span>تعليمات تشغيلية للسائق</span><textarea rows={3} value={form.operational_instructions} onChange={e=>set('operational_instructions',e.target.value)} placeholder="التعليمات الأساسية للتنفيذ..."/></label>
        <label className="field"><span>تعليمات التحميل</span><textarea rows={3} value={form.pickup_instructions} onChange={e=>set('pickup_instructions',e.target.value)} placeholder="تعليمات موقع التحميل..."/></label>
        <label className="field"><span>تعليمات التسليم</span><textarea rows={3} value={form.delivery_instructions} onChange={e=>set('delivery_instructions',e.target.value)} placeholder="تعليمات موقع التسليم..."/></label>
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
 {mapTarget&&<LocationMapPicker title={mapTarget==='pickup'?'اختيار موقع التحميل':'اختيار موقع التسليم'} value={mapTarget==='pickup'?(form.pickup_latitude&&form.pickup_longitude?{latitude:Number(form.pickup_latitude),longitude:Number(form.pickup_longitude)}:null):(form.delivery_latitude&&form.delivery_longitude?{latitude:Number(form.delivery_latitude),longitude:Number(form.delivery_longitude)}:null)} locationText={mapTarget==='pickup'?form.from_location:form.to_location} onChange={value=>{if(mapTarget==='pickup'){setForm(x=>({...x,pickup_latitude:String(value.latitude),pickup_longitude:String(value.longitude)}))}else{setForm(x=>({...x,delivery_latitude:String(value.latitude),delivery_longitude:String(value.longitude)}))}}} onLocationLabelChange={label=>{if(mapTarget==='pickup')set('from_location',label);else set('to_location',label)}} onClose={()=>setMapTarget(null)}/>}
 </>)
}
