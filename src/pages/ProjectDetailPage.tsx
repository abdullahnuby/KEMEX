import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowRight, Building2, CalendarDays, CircleDollarSign, FileText, Gauge, ReceiptText, Truck, Users, Wrench } from 'lucide-react'
import type { Asset, FuelOperation, Operation, Project, WorkOrder } from '../types/tfms'
import type { Repository } from '../core/repository/types'
import type { Trip, TripCost } from '../features/trips/types'
import { sameReference } from '../utils/referenceLabels'
import { DataTable, DetailTabs, EmptyState, StatusBadge } from '../shared/ui'
import { Button, Card, PageHeader } from '../components/ui'
import { useCurrency } from '../features/settings'

import { APP_LOCALE } from '../shared/formatters/locale'
type Props={
  project:Project
  assets:Asset[]
  operations:Operation[]
  workOrders:WorkOrder[]
  fuelOps:FuelOperation[]
  trips:Trip[]
  tripCosts:TripCost[]
  invoices:Record<string,unknown>[]
  repository:Repository
  moduleData:Record<string,Record<string,unknown>[]>
  onBack:()=>void
  onRoute:(route:string)=>void
}

/** مركز موحد لبطاقة المشروع: المعلومات + الأصول + التشغيل + الصيانة + النقل + المالية. */
export function ProjectDetailPage({project,assets,operations,workOrders,fuelOps,trips,tripCosts,invoices,repository,moduleData,onBack,onRoute}:Props){
 const {formatMoney}=useCurrency()
 const linkedAssets=useMemo(()=>assets.filter(a=>sameReference(a.proj,project)),[assets,project])
 const linkedOps=useMemo(()=>operations.filter(o=>sameReference(o.proj,project)),[operations,project])
 const linkedOrders=useMemo(()=>workOrders.filter(w=>sameReference(w.proj,project)),[workOrders,project])
 const linkedFuel=useMemo(()=>fuelOps.filter(f=>sameReference(f.proj,project)),[fuelOps,project])
 const linkedTrips=useMemo(()=>trips.filter(t=>sameReference(t.from_project_id,project)||sameReference(t.to_project_id,project)),[trips,project])
 const linkedCosts=useMemo(()=>(
   (moduleData.costs??[]).filter(r=>sameReference(r.projectId??r.proj??r.project,project))
 ),[moduleData,project])
 const linkedInvoices=useMemo(()=>invoices.filter(r=>sameReference(r.projectId??r.proj??r.project??r.link,project)),[invoices,project])
 const tripCostById=useMemo(()=>{
   const map=new Map<string,number>()
   for(const c of tripCosts)map.set(c.trip_id,(map.get(c.trip_id)??0)+Number(c.amount||0))
   return map
 },[tripCosts])
 const projectCostQuery=useMemo(()=>repository.getProjectCost30d(project.id),[repository,project.id])
 const [cost30d,setCost30d]=useState<{totalCost30d:number;costEntries30d:number}|null>(null)
 const [costLoading,setCostLoading]=useState(false)

 // Keep a local async read here instead of adding another repository surface.
 useEffect(()=>{let alive=true;setCostLoading(true);void projectCostQuery.then(v=>{if(alive)setCost30d(v)}).catch(()=>{if(alive)setCost30d(null)}).finally(()=>{if(alive)setCostLoading(false)});return()=>{alive=false}},[projectCostQuery])

 const totalFuelCost=linkedFuel.reduce((s,f)=>s+Number(f.total||0),0)
 const maintenanceCost=linkedOrders.reduce((s,w)=>s+Number(w.laborCost||0)+Number(w.partsCost||0)+Number(w.vendorCost||0),0)
 const transportRevenue=linkedTrips.reduce((s,t)=>s+Number(t.total_charge||0),0)
 const transportCost=linkedTrips.reduce((s,t)=>s+(tripCostById.get(t.id)??0)+linkedFuel.filter(f=>String(f.tripId??'')===t.id).reduce((x,f)=>x+Number(f.total||0),0),0)

 const tabs=[
  {id:'overview',label:'نظرة عامة',content:<Overview project={project} linkedAssets={linkedAssets} operations={linkedOps} cost30d={cost30d} loading={costLoading} formatMoney={formatMoney}/>},
  {id:'assets',label:`الأصول (${linkedAssets.length})`,content:linkedAssets.length?<DataTable rows={linkedAssets} columns={[
    {id:'code',header:'الكود',sortValue:(r:Asset)=>r.code,render:(r:Asset)=><button className="font-semibold text-primary-700 hover:underline" onClick={()=>onRoute(`asset/${r.id}`)}>{r.code}</button>},
    {id:'name',header:'الأصل',sortValue:(r:Asset)=>r.name,render:(r:Asset)=>r.name},
    {id:'type',header:'النوع',sortValue:(r:Asset)=>r.type,render:(r:Asset)=>r.type},
    {id:'status',header:'الحالة',sortValue:(r:Asset)=>r.status,render:(r:Asset)=><StatusBadge>{r.status}</StatusBadge>},
    {id:'meter',header:'العداد',sortValue:(r:Asset)=>r.meter,render:(r:Asset)=>`${Number(r.meter||0).toLocaleString(APP_LOCALE)} ${r.mt}`},
  ]} rowKey={r=>r.id} pageSize={12} searchPlaceholder="بحث في أصول المشروع..."/>:<EmptyState title="لا توجد أصول مرتبطة" description="اربط الأصول بالمشروع من بطاقة الأصل أو التخصيص."/>},
  {id:'operations',label:`التشغيل (${linkedOps.length})`,content:<section className="panel"><Section title="التشغيل والعدادات" icon={<Gauge size={18}/>} meta={`${linkedOps.length} سجل`}/>{linkedOps.length?<DataTable rows={linkedOps} columns={[
    {id:'asset',header:'الأصل',render:r=>String(linkedAssets.find(a=>sameReference(r.assetId,a))?.name??r.assetId)},
    {id:'date',header:'التاريخ',render:r=>r.date},
    {id:'hours',header:'الساعات',render:r=>Number(r.hours||0).toLocaleString(APP_LOCALE)},
    {id:'meter',header:'العداد',render:r=>Number(r.meter||0).toLocaleString(APP_LOCALE)},
    {id:'status',header:'الحالة',render:r=><StatusBadge>{r.status}</StatusBadge>},
  ]} rowKey={r=>r.id} pageSize={12}/>:<EmptyState title="لا يوجد تشغيل مسجل" description="لم يتم اعتماد تشغيل يومي مرتبط بالمشروع."/>}</section>},
  {id:'maintenance',label:`الصيانة (${linkedOrders.length})`,content:<section className="panel"><Section title="أوامر الصيانة" icon={<Wrench size={18}/>} meta={formatMoney(maintenanceCost)}/>{linkedOrders.length?<DataTable rows={linkedOrders} columns={[
    {id:'asset',header:'الأصل',render:r=>String(linkedAssets.find(a=>sameReference(r.asset,a))?.name??r.asset)},
    {id:'desc',header:'الوصف',render:r=>r.desc},
    {id:'opened',header:'الفتح',render:r=>r.opened},
    {id:'status',header:'الحالة',render:r=><StatusBadge>{r.status}</StatusBadge>},
    {id:'cost',header:'التكلفة',render:r=>formatMoney(Number(r.laborCost||0)+Number(r.partsCost||0)+Number(r.vendorCost||0))},
  ]} rowKey={r=>r.id} pageSize={12}/>:<EmptyState title="لا توجد أوامر صيانة" description="لا توجد أوامر صيانة مرتبطة بالمشروع."/>}<button className="secondary-button mt-4" onClick={()=>onRoute('maintenance')}>فتح مساحة الصيانة</button></section>},
  {id:'transport',label:`النقل (${linkedTrips.length})`,content:<section className="panel"><Section title="عمليات النقل" icon={<Truck size={18}/>} meta={formatMoney(transportRevenue)}/>{linkedTrips.length?<DataTable rows={linkedTrips} columns={[
    {id:'number',header:'رقم النقل',render:r=><button className="font-semibold text-primary-700 hover:underline" onClick={()=>onRoute(`trips/${r.id}`)}>{r.trip_number}</button>},
    {id:'route',header:'المسار',render:r=>`${r.from_location||'—'} ← ${r.to_location||'—'}`},
    {id:'status',header:'الحالة',render:r=><StatusBadge>{r.status}</StatusBadge>},
    {id:'charge',header:'قيمة النقل',render:r=>formatMoney(r.total_charge)},
    {id:'cost',header:'التكلفة',render:r=>formatMoney((tripCostById.get(r.id)??0)+linkedFuel.filter(f=>String(f.tripId??'')===r.id).reduce((s,f)=>s+Number(f.total||0),0))},
  ]} rowKey={r=>r.id} pageSize={12}/>:<EmptyState title="لا توجد عمليات نقل" description="لا توجد عمليات نقل مرتبطة بالمشروع."/>}</section>},
  {id:'finance',label:'المالية',content:<section className="space-y-4"><div className="ds-stat-grid"><Metric icon={<CircleDollarSign size={16}/>} label="وقود المشروع" value={formatMoney(totalFuelCost)}/><Metric icon={<Wrench size={16}/>} label="صيانة المشروع" value={formatMoney(maintenanceCost)}/><Metric icon={<Truck size={16}/>} label="إيراد النقل" value={formatMoney(transportRevenue)}/><Metric icon={<CircleDollarSign size={16}/>} label="تكلفة النقل" value={formatMoney(transportCost)}/></div><div className="grid gap-4 lg:grid-cols-2"><section className="panel"><Section title="الفواتير المرتبطة" icon={<ReceiptText size={18}/>} meta={`${linkedInvoices.length} فاتورة`}/>{linkedInvoices.length?<DataTable rows={linkedInvoices} columns={[{id:'number',header:'الفاتورة',render:r=>String(r.number??'—')},{id:'date',header:'التاريخ',render:r=>String(r.date??'—')},{id:'total',header:'الإجمالي',render:r=>formatMoney(Number(r.total||0))},{id:'status',header:'الحالة',render:r=><StatusBadge>{String(r.status??'—')}</StatusBadge>}]} rowKey={r=>String(r.id)} pageSize={8}/>:<EmptyState title="لا توجد فواتير" description="لا توجد فواتير مرتبطة بالمشروع."/>}</section><section className="panel"><Section title="قيود التكلفة" icon={<FileText size={18}/>} meta={`${linkedCosts.length} قيد`}/>{linkedCosts.length?<DataTable rows={linkedCosts} columns={[{id:'date',header:'التاريخ',render:r=>String(r.costDate??r.date??'—')},{id:'category',header:'البند',render:r=>String(r.category??'—')},{id:'amount',header:'المبلغ',render:r=>formatMoney(Number(r.amount||0))},{id:'status',header:'الحالة',render:r=><StatusBadge>{String(r.status??'—')}</StatusBadge>}]} rowKey={r=>String(r.id)} pageSize={8}/>:<EmptyState title="لا توجد تكاليف" description="لا توجد قيود تكلفة مرتبطة بالمشروع."/>}</section></div><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={()=>onRoute('costs')}>فتح المالية</Button><Button variant="secondary" onClick={()=>onRoute('invoices')}>فتح الفواتير</Button></div></section>},
 ]
 return <div className="space-y-6" dir="rtl"><PageHeader title={project.name} description={`المشروع ${project.code} · ${project.site||'بدون موقع'}`} meta={<StatusBadge>{project.status}</StatusBadge>} action={<Button variant="secondary" icon={<ArrowRight size={15}/>} onClick={onBack}>العودة للمشروعات</Button>}/><Card className="ds-detail-hero"><div className="section-title"><div className="section-title-icon"><Building2 size={18}/></div><div><strong>{project.name}</strong><small>{project.code} · {project.site||'بدون موقع'}</small></div><StatusBadge>{project.status}</StatusBadge></div><div className="ds-stat-grid"><Metric icon={<Users size={16}/>} label="الأصول المرتبطة" value={linkedAssets.length}/><Metric icon={<CalendarDays size={16}/>} label="نسبة الإنجاز" value={`${Number(project.progress||0)}%`}/><Metric icon={<CircleDollarSign size={16}/>} label="ميزانية المشروع" value={project.budget?formatMoney(project.budget):'غير محددة'}/></div></Card><DetailTabs tabs={tabs}/></div>
}

function Overview({project,linkedAssets,operations,cost30d,loading,formatMoney}:{project:Project;linkedAssets:Asset[];operations:Operation[];cost30d:{totalCost30d:number;costEntries30d:number}|null;loading:boolean;formatMoney:(value:number|null|undefined)=>string}){
 return <section className="space-y-4"><section className="panel"><div className="detail-grid"><Detail label="الكود" value={project.code}/><Detail label="الحالة" value={<StatusBadge>{project.status}</StatusBadge>}/><Detail label="العميل" value={project.client||'—'}/><Detail label="مدير المشروع" value={project.mgr||'—'}/><Detail label="الموقع" value={project.site||'—'}/><Detail label="مركز التكلفة" value={project.cc||'—'}/><Detail label="بداية المشروع" value={project.start||'—'}/><Detail label="نهاية المشروع" value={project.end||'—'}/><Detail label="الهاتف" value={project.phone||'—'}/><Detail label="ملاحظات" value={project.notes||'—'}/></div></section><div className="ds-stat-grid"><Metric icon={<Gauge size={16}/>} label="سجلات التشغيل" value={operations.length}/><Metric icon={<Truck size={16}/>} label="الأصول المرتبطة" value={linkedAssets.length}/><Metric icon={<CircleDollarSign size={16}/>} label="تكلفة آخر 30 يوم" value={loading?'جارٍ التحميل...':formatMoney(cost30d?.totalCost30d??0)}/><Metric icon={<FileText size={16}/>} label="قيود تكلفة 30 يوم" value={cost30d?.costEntries30d??0}/></div></section>
}
function Detail({label,value}:{label:string;value:ReactNode}){return <div className="detail-item"><span>{label}</span><strong>{value}</strong></div>}
function Metric({icon,label,value}:{icon:ReactNode;label:string;value:ReactNode}){return <article className="ds-financial-metric"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></article>}
function Section({title,icon,meta}:{title:string;icon:ReactNode;meta?:ReactNode}){return <div className="panel-heading"><div className="panel-heading-main">{icon}<h2>{title}</h2></div>{meta&&<span className="panel-heading-meta">{meta}</span>}</div>}
