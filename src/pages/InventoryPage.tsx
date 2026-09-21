import { Boxes, MinusCircle, Pencil, Plus, Search, ShoppingCart, AlertTriangle } from 'lucide-react'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { Asset, Project, WorkOrder } from '../types/tfms'

export type InventoryRecord = Record<string, unknown>

export function InventoryPage({records,userName,assets,projects,workOrders,onSave,onSaveMovement,onCreatePurchase}:{records:InventoryRecord[];userName:string;assets:Asset[];projects:Project[];workOrders:WorkOrder[];onSave:(record:InventoryRecord)=>Promise<void>|void;onSaveMovement:(record:InventoryRecord)=>Promise<void>|void;onCreatePurchase:(item:InventoryRecord)=>void}) {
  const [q,setQ]=useState('')
  const [editing,setEditing]=useState<InventoryRecord|null>(null)
  const [issuing,setIssuing]=useState<InventoryRecord|null>(null)
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const rows=useMemo(()=>records.filter(r=>{const text=Object.values(r).map(v=>String(v??'')).join(' ').toLowerCase();return !q.trim()||text.includes(q.trim().toLowerCase())}),[records,q])
  const low=records.filter(r=>Number(r.qty||0)<Number(r.min||0)).length
  const total=records.reduce((sum,r)=>sum+Number(r.qty||0)*Number(r.cost||0),0)
  const fmt=(n:number)=>new Intl.NumberFormat('ar-EG',{maximumFractionDigits:2}).format(n)

  async function saveItem(e:FormEvent<HTMLFormElement>){
    e.preventDefault(); if(!editing||busy)return; setError('');setBusy(true)
    try{
      const fd=new FormData(e.currentTarget)
      const next={...editing,code:String(fd.get('code')||'').trim(),name:String(fd.get('name')||'').trim(),cat:String(fd.get('cat')||''),unit:String(fd.get('unit')||''),brand:String(fd.get('brand')||''),warehouse:String(fd.get('warehouse')||''),location:String(fd.get('location')||''),barcode:String(fd.get('barcode')||''),min:Number(fd.get('min')||0),max:Number(fd.get('max')||0),reorder:Number(fd.get('reorder')||0),lead:Number(fd.get('lead')||0),cost:Number(fd.get('cost')||0),lastCost:Number(fd.get('lastCost')||0),qty:Number(fd.get('qty')||0),opening:Number(fd.get('opening')||0),notes:String(fd.get('notes')||'')}
      if(!next.code||!next.name)throw new Error('الكود واسم الصنف مطلوبان.')
      if([next.min,next.cost,next.qty].some(n=>!Number.isFinite(n)||n<0))throw new Error('الكميات والتكاليف يجب أن تكون أرقامًا غير سالبة.')
      await onSave(next);setEditing(null)
    }catch(err){setError(err instanceof Error?err.message:'تعذر حفظ الصنف.')}finally{setBusy(false)}
  }

  async function issue(e:FormEvent<HTMLFormElement>){
    e.preventDefault(); if(!issuing||busy)return; setError('');setBusy(true)
    try{
      const fd=new FormData(e.currentTarget); const qty=Number(fd.get('qty')||0)
      if(!Number.isFinite(qty)||qty<=0)throw new Error('أدخل كمية صرف أكبر من صفر.')
      const available=Number(issuing.qty||0)
      if(qty>available)throw new Error(`الكمية المطلوبة أكبر من الرصيد المتاح: ${fmt(available)} ${String(issuing.unit||'')}`)
      const asset=String(fd.get('asset')||'').trim(); const wo=String(fd.get('wo')||'').trim(); const proj=String(fd.get('proj')||'').trim(); const date=String(fd.get('date')||new Date().toISOString().slice(0,10));
      const movement={id:`MV-${Date.now()}`,item:String(issuing.id),type:'صرف',qty,date,asset,wo,proj,status:'معتمد',notes:`صرف بواسطة ${userName}`}
      await onSaveMovement(movement)
      await onSave({...issuing,qty:available-qty})
      setIssuing(null)
    }catch(err){setError(err instanceof Error?err.message:'تعذر تسجيل حركة الصرف.')}finally{setBusy(false)}
  }

  return <div>
    <div className="page-head"><div><h1>المخازن وقطع الغيار</h1><p>الأصناف والأرصدة والحد الأدنى — الصرف مرتبط بالأصل وأمر العمل.</p></div><div className="page-actions"><button type="button" className="secondary-button" onClick={()=>{setError('');setEditing({id:`SP-${Date.now()}`,code:'',name:'',cat:'قطع غيار',brand:'',unit:'قطعة',warehouse:'',location:'',barcode:'',min:0,max:0,reorder:0,lead:0,cost:0,lastCost:0,qty:0,opening:0,notes:''})}}><Plus size={16}/> صنف جديد</button></div></div>
    {error&&<div className="global-error" role="alert">{error}</div>}
    <div className="metric-grid compact">
      <Metric icon={Boxes} label="الأصناف" value={records.length}/><Metric icon={AlertTriangle} label="تحت الحد الأدنى" value={low}/><Metric icon={ShoppingCart} label="قيمة المخزون" value={`${fmt(total)} ج.م`}/>
    </div>
    <section className="panel"><div className="toolbar"><div className="search-field"><Search size={16}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="بحث في الأصناف..."/></div><span className="toolbar-count">{rows.length} من {records.length} صنف</span></div>
      <div className="table-wrap"><table><thead><tr><th>الكود</th><th>الصنف</th><th>التصنيف</th><th>الوحدة</th><th>الرصيد</th><th>الحد الأدنى</th><th>تكلفة الوحدة</th><th>قيمة الرصيد</th><th>إجراءات</th></tr></thead><tbody>{rows.map(r=>{const qty=Number(r.qty||0);const min=Number(r.min||0);return <tr key={String(r.id)}><td><strong>{String(r.code??'—')}</strong></td><td>{String(r.name??'—')}</td><td>{String(r.cat??'—')}</td><td>{String(r.unit??'—')}</td><td><span className={`badge ${qty<min?'red':'green'}`}>{fmt(qty)}</span></td><td>{fmt(min)}</td><td>{fmt(Number(r.cost||0))} ج.م</td><td>{fmt(qty*Number(r.cost||0))} ج.م</td><td><div className="row-actions"><button type="button" className="workflow-button secondary" onClick={()=>{setError('');setIssuing({...r})}}><MinusCircle size={13}/> صرف</button>{qty<min&&<button type="button" className="workflow-button secondary" onClick={()=>onCreatePurchase(r)}><ShoppingCart size={13}/> طلب شراء</button>}<button type="button" className="icon-button" title="تعديل الصنف" onClick={()=>{setError('');setEditing({...r})}} aria-label="تعديل الصنف"><Pencil size={14}/></button></div></td></tr>})}</tbody></table>{!rows.length&&<div className="empty">لا توجد أصناف مطابقة.</div>}</div>
    </section>
    {editing&&<div className="modal-backdrop" onMouseDown={()=>!busy&&setEditing(null)}><form className="modal-card wide form-modal-premium" onSubmit={saveItem} onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><h2>{records.some(r=>r.id===editing.id)?'تعديل صنف':'صنف جديد'}</h2><p>بيانات الصنف والرصيد الافتتاحي</p></div><button type="button" className="icon-button" onClick={()=>setEditing(null)} aria-label="إغلاق">×</button></div><div className="form-sections"><FormBlock title="هوية الصنف" hint="التعريف الأساسي داخل المخزن"><Input name="code" label="كود الصنف" value={String(editing.code??'')} required/><Input name="name" label="اسم الصنف" value={String(editing.name??'')} required/><Select name="cat" label="التصنيف" value={String(editing.cat??'')} options={['قطع غيار','زيوت','إطارات','مواد']}/><Input name="brand" label="الماركة / المصنع" value={String(editing.brand??'')}/></FormBlock><FormBlock title="التخزين والتكويد" hint="الوحدة والموقع والحدود التشغيلية"><Select name="unit" label="وحدة القياس" value={String(editing.unit??'')} options={['قطعة','طقم','لتر','عبوة','متر']}/><Input name="warehouse" label="المخزن" value={String(editing.warehouse??'')}/><Input name="location" label="الموقع داخل المخزن" value={String(editing.location??'')}/><Input name="barcode" label="الباركود" value={String(editing.barcode??'')}/></FormBlock><FormBlock title="الأرصدة والتكلفة" hint="بيانات الرصيد الافتتاحي وحدود إعادة الطلب"><Input name="min" label="الحد الأدنى" type="number" value={String(editing.min??0)}/><Input name="max" label="الحد الأقصى" type="number" value={String(editing.max??0)}/><Input name="reorder" label="نقطة إعادة الطلب" type="number" value={String(editing.reorder??editing.min??0)}/><Input name="lead" label="مدة التوريد بالأيام" type="number" value={String(editing.lead??0)}/><Input name="cost" label="التكلفة الحالية ج.م" type="number" value={String(editing.cost??0)}/><Input name="lastCost" label="آخر تكلفة شراء ج.م" type="number" value={String(editing.lastCost??editing.cost??0)}/><Input name="qty" label="الرصيد" type="number" value={String(editing.qty??0)}/><Input name="opening" label="الرصيد الافتتاحي" type="number" value={String(editing.opening??editing.qty??0)}/></FormBlock><label className="field field-full"><span>ملاحظات الصنف</span><textarea name="notes" defaultValue={String(editing.notes??'')} rows={4} placeholder="المواصفة، البدائل المقبولة، الموقع الدقيق، الحد الخاص أو أي بيانات مهمة..."/></label></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setEditing(null)}>إلغاء</button><button className="primary-button" disabled={busy}>{busy?'جارٍ الحفظ...':'حفظ الصنف'}</button></div></form></div>}
    {issuing&&<div className="modal-backdrop" onMouseDown={()=>!busy&&setIssuing(null)}><form className="modal-card wide form-modal-premium" onSubmit={issue} onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><h2>صرف مادة من المخزن</h2><p>{String(issuing.code??'')} — {String(issuing.name??'')} · الرصيد {fmt(Number(issuing.qty||0))} {String(issuing.unit??'')}</p></div><button type="button" className="icon-button" onClick={()=>setIssuing(null)} aria-label="إغلاق">×</button></div><div className="form-grid"><Input name="qty" label="الكمية المصروفة" type="number" value="" required/><SelectRef name="asset" label="الأصل المستفيد" value="" options={assets.map(a=>({v:a.id,l:`${a.name} — ${a.code}`}))}/><SelectRef name="wo" label="أمر العمل المرتبط" value="" options={workOrders.map(w=>({v:w.id,l:`${w.desc||w.type} — ${w.id}`}))}/><SelectRef name="proj" label="المشروع" value="" options={projects.map(p=>({v:p.id,l:`${p.name} — ${p.code}`}))}/><Input name="date" label="التاريخ" type="date" value={new Date().toISOString().slice(0,10)} required/></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setIssuing(null)}>إلغاء</button><button className="primary-button" disabled={busy}>{busy?'جارٍ التسجيل...':'تسجيل الصرف'}</button></div></form></div>}
  </div>
}

function SelectRef({name,label,value,options}:{name:string;label:string;value:string;options:{v:string;l:string}[]}){return <label className="field"><span>{label}</span><select name={name} defaultValue={value}><option value="">— غير مرتبط —</option>{options.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select></label>}

function Metric({icon:Icon,label,value}:{icon:LucideIcon;label:string;value:number|string}){return <div className="metric-card"><div className="metric-icon"><Icon size={18}/></div><div className="metric-body"><span>{label}</span><strong>{value}</strong></div></div>}
function Input({name,label,value='',type='text',required=false}:{name:string;label:string;value?:string;type?:string;required?:boolean}){return <label className="field"><span>{label}{required&&' *'}</span><input name={name} type={type} defaultValue={value} required={required} min={type==='number'?0:undefined} step={type==='number'?'any':undefined}/></label>}
function FormBlock({title,hint,children}:{title:string;hint:string;children:ReactNode}){return <section className="form-section"><div className="form-section-head"><strong>{title}</strong><span>{hint}</span></div><div className="form-grid">{children}</div></section>}
function Select({name,label,value,options}:{name:string;label:string;value:string;options:string[]}){return <label className="field"><span>{label}</span><select name={name} defaultValue={value}>{options.map(v=><option key={v} value={v}>{v}</option>)}</select></label>}
