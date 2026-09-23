import { useMemo, useState } from 'react'
import { Download, ChartColumn, CircleDollarSign, Gauge, Scale } from 'lucide-react'
import type { Asset, FuelOperation, Project, WorkOrder } from '../types/tfms'
import { calculateAssetCost } from './CostsPage'
import { sameReference } from '../utils/referenceLabels'
import { ReferenceValue } from '../components/ReferenceValue'
import { useCurrency } from '../features/settings'
import { PageHeader, Card, CardGrid, StatCard, DataTable, EmptyState, Button } from '../components/ui'
import type { DataTableColumn } from '../components/ui/DataTable'

type Props={assets:Asset[];projects:Project[];moduleData:Record<string,Record<string,unknown>[]>;workOrders:WorkOrder[];fuelOps:FuelOperation[];chargingRates:Rate[];assetTypes:AssetTypeRef[]}
type Rate={id:string;assetTypeId?:string;assetId?:string;projectId?:string;unit:string;rate:number;minimum?:number;active:boolean}
type AssetTypeRef={id:string;code:string;name:string;defaultMeterType:string;standardConsumption?:number;billingUnit?:string;billingRate?:number;billingMinimum?:number;active:boolean}
export function ChargingPage({assets,projects,moduleData,workOrders,fuelOps,chargingRates,assetTypes}:Props){
 const {formatMoney}=useCurrency()
 const current=new Date().toISOString().slice(0,7);const [month,setMonth]=useState(current);const [project,setProject]=useState('')
 const rows=useMemo(()=>assets.flatMap(a=>{const selected=projects.find(p=>sameReference(project,p));if(selected&&!sameReference(a.proj,selected))return [];const rate=rateFor(a,chargingRates,assetTypes,project);if(!rate)return [];const [from,to]=monthRange(month);const ops=(moduleData.operations??[]).filter(x=>(String(x.assetId??'')===a.id||String(x.assetId??'')===a.code)&&String(x.status??'')==='معتمد'&&String(x.date??'')>=from&&String(x.date??'')<=to);const qty=rate.unit==='ساعة'?ops.reduce((s,x)=>s+Number(x.hours||0),0):rate.unit==='كم'?ops.reduce((s,x)=>s+Number(x.km||0),0):ops.length;const billed=rate.unit==='كم'?qty:Math.max(qty,(rate.minimum||0)*daysInMonth(month)/30.4);const amount=billed*rate.rate;const cost=calculateAssetCost(a,from,to,workOrders,fuelOps,moduleData).total;return [{a,rate,qty,billed,amount,cost,net:amount-cost}] }),[assets,projects,moduleData,month,project,workOrders,fuelOps,chargingRates,assetTypes])
 const total=rows.reduce((s,x)=>s+x.amount,0);const qty=rows.reduce((s,x)=>s+x.qty,0);const net=rows.reduce((s,x)=>s+x.net,0)
 function exportCsv(){const headers=['الأصل','المشروع','الوحدة','السعر','الاستخدام الفعلي','الكمية المفوترة','قيمة التحميل','الفارق عن التكلفة'];const esc=(v:unknown)=>`"${String(v??'').replace(/"/g,'""')}"`;const csv='\ufeff'+[headers.map(esc).join(','),...rows.map(x=>[x.a.name,projects.find(p=>sameReference(x.a.proj,p))?.name??'المقر',x.rate?.unit??'—',x.rate?.rate??0,x.qty,x.billed,x.amount,x.net].map(esc).join(','))].join('\r\n');const b=new Blob([csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`KEMEX-charging-${month}.csv`;a.click();URL.revokeObjectURL(a.href)}
 type ChargeRow = { a: Asset; rate?: Rate; qty: number; billed: number; amount: number; cost: number; net: number }
 const detailColumns: DataTableColumn<ChargeRow>[] = [
   { key: 'asset', header: 'الأصل', accessor: (x) => x.a.name, render: (x) => <ReferenceValue field="asset" value={x.a.id} lookups={{ assets }} /> },
   { key: 'proj', header: 'المشروع', accessor: (x) => projects.find((p) => sameReference(x.a.proj, p))?.name ?? '', render: (x) => <ReferenceValue field="proj" value={x.a.proj} lookups={{ projects }} /> },
   { key: 'unit', header: 'الوحدة', accessor: (x) => x.rate?.unit ?? '', render: (x) => x.rate?.unit ?? '—', hideOnMobile: true },
   { key: 'rate', header: 'السعر', accessor: (x) => x.rate?.rate ?? 0, render: (x) => fmt(x.rate?.rate ?? 0), hideOnMobile: true },
   { key: 'qty', header: 'الاستخدام الفعلي', sortable: true, render: (x) => fmt(x.qty) },
   { key: 'billed', header: 'المفوتر بحد أدنى', render: (x) => fmt(x.billed), hideOnMobile: true },
   { key: 'amount', header: 'قيمة التحميل', sortable: true, render: (x) => <strong className="font-semibold text-gray-900">{fmt(x.amount)}</strong> },
   { key: 'net', header: 'الفارق عن التكلفة', sortable: true, render: (x) => <strong className="font-semibold text-gray-900">{fmt(x.net)}</strong> },
 ]
 const rateColumns: DataTableColumn<Rate>[] = [
   { key: 'target', header: 'الأصل / النوع', render: (r) => (r.assetId ? <ReferenceValue field="asset" value={r.assetId} lookups={{ assets }} /> : r.assetTypeId ? (assetTypes.find((t) => t.id === r.assetTypeId)?.name ?? 'نوع أصل') : r.projectId ? (projects.find((p) => p.id === r.projectId)?.name ?? 'مشروع') : 'عام') },
   { key: 'unit', header: 'الوحدة' },
   { key: 'rate', header: 'السعر', render: (r) => formatMoney(r.rate) },
   { key: 'minimum', header: 'الحد الأدنى', render: (r) => (r.minimum == null ? '—' : fmt(r.minimum)) },
 ]

 return (
   <div className="space-y-6">
     <PageHeader
       title="التحميل الداخلي على المشروعات"
       description="الأسعار والحد الأدنى للفوترة — يفصل الاستخدام الفعلي عن أساس الاحتساب."
       action={
         <Button variant="secondary" icon={<Download size={16} />} onClick={exportCsv}>
           تصدير CSV
         </Button>
       }
     />

     <Card>
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
         <label className="block">
           <span className="text-xs font-medium text-gray-500 mb-1.5 block">شهر الفوترة</span>
           <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition" />
         </label>
         <label className="block">
           <span className="text-xs font-medium text-gray-500 mb-1.5 block">المشروع</span>
           <select value={project} onChange={(e) => setProject(e.target.value)} className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition">
             <option value="">كل المشروعات</option>
             {projects.map((p) => (
               <option key={p.id} value={p.id}>{p.name}</option>
             ))}
           </select>
         </label>
       </div>
     </Card>

     <CardGrid cols={4}>
       <StatCard icon={<CircleDollarSign size={18} />} label="إجمالي التحميل" value={formatMoney(total)} />
       <StatCard icon={<Gauge size={18} />} label="الأصول المحملة" value={rows.length} />
       <StatCard icon={<ChartColumn size={18} />} label="الاستخدام الفعلي" value={fmt(qty)} />
       <StatCard icon={<Scale size={18} />} label="صافي الفرق عن التكلفة" value={formatMoney(net)} />
     </CardGrid>

     <Card title="تفاصيل التحميل" description="التحميل يحسب من البيانات التشغيلية المعتمدة.">
       <DataTable columns={detailColumns} rows={rows} rowKey={(x) => x.a.id} emptyState="لا توجد أصول لها تعريفة تحميل مطابقة." />
     </Card>

     <Card title="تعريفات التحميل الداخلية" description="لا يعرض النظام أي تعريفة افتراضية؛ يتم احتساب التحميل فقط من التعريفات الفعلية المسجلة.">
       {chargingRates.length ? (
         <DataTable columns={rateColumns} rows={chargingRates} rowKey={(r) => r.id} />
       ) : (
         <EmptyState title="لا توجد تعريفات تحميل" description="أضف تعريفات فعلية مرتبطة بنوع أصل أو أصل أو مشروع من إدارة التعريفات قبل تشغيل التحميل الداخلي." />
       )}
     </Card>
   </div>
 )
}
function rateFor(a:Asset,rates:Rate[],assetTypes:AssetTypeRef[],projectId:string){
  const direct=rates.find(r=>r.active && (r.assetId===a.id || r.assetId===a.code) && (!r.projectId || r.projectId===projectId))
  if(direct)return direct
  const projectRate=rates.find(r=>r.active && r.projectId===projectId && !r.assetId && !r.assetTypeId)
  if(projectRate)return projectRate
  const typeId=a.assetTypeId
  const typeRate=rates.find(r=>r.active && r.assetTypeId===typeId && (!r.projectId || r.projectId===projectId))
  if(typeRate)return typeRate
  const type=assetTypes.find(t=>t.id===typeId)
  if(type?.billingRate != null && type.billingUnit) return {id:`type-${type.id}`,assetTypeId:type.id,unit:type.billingUnit,rate:type.billingRate,minimum:type.billingMinimum,active:true}
  return undefined
}
function monthRange(month:string){const [y,m]=month.split('-').map(Number);const last=new Date(y,m,0).getDate();return [`${month}-01`,`${month}-${String(last).padStart(2,'0')}`]}
function daysInMonth(month:string){const [y,m]=month.split('-').map(Number);return new Date(y,m,0).getDate()}
function fmt(n:number){return new Intl.NumberFormat('ar-EG',{maximumFractionDigits:1}).format(Number(n||0))}
