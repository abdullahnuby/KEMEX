import { CalendarClock, Gauge, Pencil, Plus, Wrench, X } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { Asset, WorkOrder } from '../types/tfms'
import { ReferenceValue } from '../components/ReferenceValue'
import { Button, DataTable, PageHeader, StatusBadge } from '../components/ui'
import { useCurrency } from '../features/settings'

import { APP_LOCALE } from '../shared/formatters/locale'
export type PlanRecord = {
  id?: string
  name?: string
  asset?: string
  type?: string
  everyHours?: number
  everyKm?: number
  everyDays?: number
  lastMeter?: number
  lastDate?: string
  tasks?: string
  est?: number
  resp?: string
  [key: string]: unknown
}

export function PlansPage({records,assets,onSave,onCreateWorkOrder}:{records:PlanRecord[];assets:Asset[];onSave:(record:PlanRecord)=>Promise<void>|void;onCreateWorkOrder:(workOrder:WorkOrder,plan:PlanRecord)=>Promise<void>|void}){
  const [editing,setEditing]=useState<PlanRecord|null>(null); const [busy,setBusy]=useState(false); const [error,setError]=useState('')
  const rows=useMemo(()=>records.map(plan=>{
    const asset=assets.find(a=>a.id===String(plan.asset??'')||a.code===String(plan.asset??'')); const meter=asset?.meter??0; const lastMeter=Number(plan.lastMeter||0)
    const everyKm=Number(plan.everyKm||0), everyHours=Number(plan.everyHours||0), everyDays=Number(plan.everyDays||0)
    const meterKmDue=everyKm>0&&asset?.mt==='كم'&&meter>=lastMeter+everyKm; const hoursDue=everyHours>0&&asset?.mt==='ساعة'&&meter>=lastMeter+everyHours
    const dateDue=everyDays>0&&!!plan.lastDate&&((Date.now()-new Date(String(plan.lastDate)).getTime())/86400000>=everyDays)
    const due=meterKmDue||hoursDue||dateDue; const rule=[everyKm?`${everyKm} كم`:null,everyHours?`${everyHours} ساعة`:null,everyDays?`${everyDays} يوم`:null].filter(Boolean).join(' أو ')||'—'
    return {plan,asset,due,rule}
  }),[records,assets])
  const dueCount=rows.filter(x=>x.due).length
  const {formatMoney}=useCurrency()
  const fmt=(n:number)=>new Intl.NumberFormat(APP_LOCALE,{maximumFractionDigits:0}).format(n)
  async function createWO(plan:PlanRecord){const asset=assets.find(a=>a.id===String(plan.asset??'')||a.code===String(plan.asset??''));if(!asset){setError('لا يمكن إنشاء أمر عمل بدون أصل مرتبط بالخطة.');return}const wo:WorkOrder={id:`WO-${Date.now()}`,asset:asset.id,proj:asset.proj,type:String(plan.type??'وقائية'),desc:`${String(plan.name??'خطة صيانة')} — ${String(plan.tasks??'')}`.trim(),opened:new Date().toISOString().slice(0,10),prio:'عادية',status:'مفتوح',laborCost:0,partsCost:0,vendorCost:0,planId:String(plan.id??'')};await onCreateWorkOrder(wo,plan)}
  async function savePlan(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!editing||busy)return;setBusy(true);setError('');try{const fd=new FormData(e.currentTarget);const n=(k:string)=>Number(fd.get(k)||0);const next={...editing,name:String(fd.get('name')||'').trim(),asset:String(fd.get('asset')||''),type:String(fd.get('type')||'وقائية'),everyHours:n('everyHours'),everyKm:n('everyKm'),everyDays:n('everyDays'),lastMeter:n('lastMeter'),lastDate:String(fd.get('lastDate')||''),tasks:String(fd.get('tasks')||''),est:n('est'),resp:String(fd.get('resp')||'')};if(!next.name)throw new Error('اسم الخطة مطلوب.');if([next.everyHours,next.everyKm,next.everyDays,next.lastMeter,next.est].some(v=>!Number.isFinite(v)||v<0))throw new Error('قيم دورية الصيانة والتكلفة يجب أن تكون أرقامًا غير سالبة.');if(!next.everyHours&&!next.everyKm&&!next.everyDays)throw new Error('أدخل معيار استحقاق واحدًا على الأقل: ساعات أو كيلومترات أو أيام.');await onSave(next);setEditing(null)}catch(err){setError(err instanceof Error?err.message:'تعذر حفظ الخطة.')}finally{setBusy(false)}}
  return <div className="space-y-6">
    <PageHeader title="خطط الصيانة الوقائية" description="الاستحقاق يُحتسب من التاريخ أو العداد أو ساعات التشغيل — أي معيار يصل أولًا." action={<Button icon={<Plus size={16}/>} onClick={()=>{setError('');setEditing({id:`MP-${Date.now()}`,name:'',asset:assets[0]?.id??'',type:'وقائية',everyHours:0,everyKm:0,everyDays:30,lastMeter:assets[0]?.meter??0,lastDate:new Date().toISOString().slice(0,10),tasks:'',est:0,resp:''})}}>خطة جديدة</Button>} />
    {error&&<div className="global-error" role="alert">{error}</div>}
    <div className="metric-grid compact"><Metric icon={Wrench} label="عدد الخطط" value={records.length}/><Metric icon={CalendarClock} label="مستحقة الآن" value={dueCount}/><Metric icon={Gauge} label="أصول مرتبطة" value={new Set(records.map(r=>String(r.asset??'')).filter(Boolean)).size}/></div>
    <DataTable
      rows={rows}
      columns={[
        { id:'name', header:'اسم الخطة', render:x=><div><strong>{String(x.plan.name??'—')}</strong><div className="text-sm font-medium text-gray-500">{String(x.plan.resp??'')}</div></div>, sortValue:x=>String(x.plan.name??'') },
        { id:'asset', header:'الأصل', render:x=><ReferenceValue field="asset" value={x.plan.asset} lookups={{assets}}/> },
        { id:'type', header:'النوع', render:x=>String(x.plan.type??'—'), sortValue:x=>String(x.plan.type??'') },
        { id:'rule', header:'قاعدة الاستحقاق', render:x=>x.rule },
        { id:'lastDate', header:'آخر تنفيذ', render:x=>String(x.plan.lastDate??'—'), sortValue:x=>String(x.plan.lastDate??'') },
        { id:'lastMeter', header:'العداد المرجعي', render:x=>fmt(Number(x.plan.lastMeter||0)), sortValue:x=>Number(x.plan.lastMeter||0) },
        { id:'due', header:'الاستحقاق', render:x=><StatusBadge tone={x.due?'red':'emerald'}>{x.due?'مستحقة':'غير مستحقة'}</StatusBadge>, sortValue:x=>x.due?1:0 },
        { id:'estimate', header:'التكلفة التقديرية', render:x=>formatMoney(Number(x.plan.est||0)), sortValue:x=>Number(x.plan.est||0) },
        { id:'actions', header:'إجراءات', render:x=><div className="flex flex-wrap gap-2"><Button size="sm" disabled={!x.asset||!x.due} icon={<Wrench size={13}/>} onClick={()=>void createWO(x.plan)}>إنشاء أمر عمل</Button><Button variant="ghost" size="sm" icon={<Pencil size={14}/>} onClick={()=>{setError('');setEditing({...x.plan})}}>تعديل</Button></div> },
      ]}
      rowKey={x=>String(x.plan.id)}
      pageSize={12}
      pageSizeOptions={[12, 24, 48]}
      stickyHeader
      enableColumnVisibility
      columnVisibilityStorageKey="kemex.plans.columns.v1"
      exportable
      exportFileName="KEMEX-maintenance-plans"
      searchableText={x=>`${String(x.plan.name??'')} ${String(x.plan.resp??'')} ${String(x.plan.type??'')} ${x.rule}`}
      emptyState={<div className="px-6 py-16 text-center text-sm font-medium text-gray-500">لا توجد خطط صيانة.</div>}
    />
    <p className="block-muted mt-2">إنشاء أمر العمل لا يحدّث «آخر تنفيذ»؛ يتم تحديث الخطة بعد إنجاز أمر العمل المرتبط.</p>
    {editing&&<div className="modal-backdrop" onMouseDown={()=>!busy&&setEditing(null)}><form className="modal-card wide" onSubmit={savePlan} onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><h2>{records.some(r=>r.id===editing.id)?'تعديل خطة صيانة':'خطة صيانة جديدة'}</h2><p>يمكن استخدام معيار واحد أو أكثر للاستحقاق.</p></div><button type="button" className="icon-button" onClick={()=>setEditing(null)} aria-label="إغلاق"><X size={18}/></button></div><div className="form-grid"><Input name="name" label="اسم الخطة" value={String(editing.name??'')} required/><Select name="asset" label="الأصل" value={String(editing.asset??'')} options={assets.map(a=>({v:a.id,l:`${a.name} — ${a.code}`}))}/><Select name="type" label="نوع الصيانة" value={String(editing.type??'وقائية')} options={['وقائية','دورية','فحص'].map(v=>({v,l:v}))}/><Input name="everyHours" label="كل ساعات تشغيل" type="number" value={String(editing.everyHours??0)}/><Input name="everyKm" label="كل كم" type="number" value={String(editing.everyKm??0)}/><Input name="everyDays" label="كل أيام" type="number" value={String(editing.everyDays??0)}/><Input name="lastMeter" label="آخر عداد" type="number" value={String(editing.lastMeter??0)}/><Input name="lastDate" label="آخر تنفيذ" type="date" value={String(editing.lastDate??'')}/><Input name="est" label="التكلفة التقديرية" type="number" value={String(editing.est??0)}/><Input name="resp" label="المسؤول" value={String(editing.resp??'')}/><label className="field"><span>المهام وتعليمات السلامة</span><textarea name="tasks" defaultValue={String(editing.tasks??'')} rows={4}/></label></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setEditing(null)}>إلغاء</button><button className="primary-button" disabled={busy}>{busy?'جارٍ الحفظ...':'حفظ الخطة'}</button></div></form></div>}
  </div>
}
function Input({name,label,value,type='text',required=false}:{name:string;label:string;value:string;type?:string;required?:boolean}){return <label className="field"><span>{label}{required&&' *'}</span><input name={name} type={type} defaultValue={value} required={required} min={type==='number'?0:undefined} step={type==='number'?'any':undefined}/></label>}
function Select({name,label,value,options}:{name:string;label:string;value:string;options:{v:string;l:string}[]}){return <label className="field"><span>{label}</span><select name={name} defaultValue={value}>{options.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select></label>}
function Metric({icon:Icon,label,value}:{icon:LucideIcon;label:string;value:number}){return <div className="metric-card"><div className="metric-icon"><Icon size={18}/></div><div className="metric-body"><span>{label}</span><strong>{value}</strong></div></div>}
