import { Ban, CheckCircle2, ClipboardCheck, Pencil, Plus, Search, ShoppingCart, X, type LucideIcon } from 'lucide-react'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import type { Project, User } from '../types/tfms'
import { ReferenceValue } from '../components/ReferenceValue'

type RecordType = Record<string, unknown>

type Props = {
  records: RecordType[]
  user: User
  projects: Project[]
  canEdit: boolean
  onSave: (record: RecordType) => Promise<void> | void
}

const APPROVER_ROLES = ['admin', 'fleet', 'maint']

function fmt(n:number) {
  return new Intl.NumberFormat('ar-EG',{maximumFractionDigits:2}).format(Number(n||0))
}
function dateText(value:string) {
  if(!value)return '—'
  const d=new Date(value)
  return Number.isNaN(d.getTime())?value:new Intl.DateTimeFormat('ar-EG',{day:'2-digit',month:'2-digit',year:'numeric'}).format(d)
}

export function PurchasesPage({records,user,projects,canEdit,onSave}:Props) {
  const [q,setQ]=useState('')
  const [editing,setEditing]=useState<RecordType|null>(null)
  const [po,setPo]=useState<RecordType|null>(null)
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)

  const rows=useMemo(()=>records.filter(r=>{
    const text=Object.values(r).map(v=>String(v??'')).join(' ').toLowerCase()
    return !q.trim()||text.includes(q.trim().toLowerCase())
  }),[records,q])

  const pending=records.filter(r=>String(r.status)==='قيد الاعتماد').length
  const approved=records.filter(r=>String(r.status)==='معتمد').length
  const orders=records.filter(r=>String(r.status)==='أمر شراء').length
  const total=records.filter(r=>String(r.status)!=='مرفوض').reduce((s,r)=>s+Number(r.est||0),0)

  function openNew() {
    setError('')
    setEditing({id:`PR-${Date.now()}`,number:`PR-${100+records.length+1}`,date:new Date().toISOString().slice(0,10),req:user.name,desc:'',qty:1,unit:'قطعة',est:0,proj:'',status:'قيد الاعتماد',po:'',supplier:'',notes:''})
  }

  async function saveNew(e:FormEvent<HTMLFormElement>) {
    e.preventDefault(); if(!editing||busy)return
    setBusy(true);setError('')
    try{
      const fd=new FormData(e.currentTarget)
      const desc=String(fd.get('desc')||'').trim(), qty=Number(fd.get('qty')||0), est=Number(fd.get('est')||0)
      if(!desc)throw new Error('وصف الصنف أو المادة مطلوب.')
      if(!Number.isFinite(qty)||qty<=0)throw new Error('الكمية يجب أن تكون أكبر من صفر.')
      if(!Number.isFinite(est)||est<0)throw new Error('التكلفة التقديرية غير صالحة.')
      await onSave({...editing,desc,qty,est,unit:String(fd.get('unit')||''),proj:String(fd.get('proj')||''),requiredDate:String(fd.get('requiredDate')||''),category:String(fd.get('category')||''),warehouse:String(fd.get('warehouse')||''),reason:String(fd.get('reason')||''),budget:String(fd.get('budget')||''),quotationCount:Number(fd.get('quotationCount')||0),paymentTerms:String(fd.get('paymentTerms')||''),notes:String(fd.get('notes')||''),status:'قيد الاعتماد'})
      setEditing(null)
    }catch(err){setError(err instanceof Error?err.message:'تعذر إنشاء طلب الشراء.')}finally{setBusy(false)}
  }

  async function action(record:RecordType, next:string, actionKey:'approve'|'reject') {
    if(!APPROVER_ROLES.includes(user.role)||busy)return
    if(actionKey==='reject'&&!window.confirm('هل تريد رفض طلب الشراء؟'))return
    setBusy(true);setError('')
    try {
      const trail=Array.isArray(record.apprs)?record.apprs:[]
      await onSave({...record,status:next,apprs:[...trail,{by:user.name,act:actionKey==='approve'?'اعتماد طلب شراء':'رفض طلب شراء'}],reason:actionKey==='reject'?`رفض بواسطة ${user.name}`:record.reason})
    } catch(err) { setError(err instanceof Error?err.message:'تعذر تنفيذ الإجراء.') }
    finally { setBusy(false) }
  }

  function openPo(record:RecordType) {
    setError('');setPo({...record})
  }

  async function issuePo(e:FormEvent<HTMLFormElement>) {
    e.preventDefault(); if(!po||busy)return
    setBusy(true);setError('')
    try{
      const fd=new FormData(e.currentTarget)
      const supplier=String(fd.get('supplier')||'').trim()
      const date=String(fd.get('date')||new Date().toISOString().slice(0,10))
      if(!supplier)throw new Error('اسم المورد مطلوب قبل إصدار أمر الشراء.')
      const number=`PO-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`
      const trail=Array.isArray(po.apprs)?po.apprs:[]
      await onSave({...po,status:'أمر شراء',po:number,supplier,date,paymentTerms:String(fd.get('paymentTerms')||po.paymentTerms||''),deliveryDate:String(fd.get('deliveryDate')||''),quotationRef:String(fd.get('quotationRef')||''),deliveryLocation:String(fd.get('deliveryLocation')||''),shipping:Number(fd.get('shipping')||0),tax:Number(fd.get('tax')||0),notes:String(fd.get('notes')||''),apprs:[...trail,{by:user.name,act:'إصدار أمر شراء'}]})
      setPo(null)
    }catch(err){setError(err instanceof Error?err.message:'تعذر إصدار أمر الشراء.')}finally{setBusy(false)}
  }

  const canApprove=APPROVER_ROLES.includes(user.role)

  return <div>
    <div className="page-head"><div><h1>المشتريات وطلبات الشراء</h1><p>الموقع يطلب ولا يشتري مباشرة: طلب ← مراجعة ← اعتماد ← إصدار أمر شراء.</p></div>{canEdit&&<button type="button" className="primary-button" onClick={openNew}><Plus size={16}/> طلب شراء</button>}</div>
    {error&&<div className="global-error" role="alert">{error}</div>}
    <div className="metric-grid compact">
      <Metric icon={ClipboardCheck} label="قيد الاعتماد" value={pending}/>
      <Metric icon={CheckCircle2} label="معتمدة" value={approved}/>
      <Metric icon={ShoppingCart} label="أوامر شراء" value={orders}/>
      <Metric icon={ShoppingCart} label="القيمة غير المرفوضة" value={`${fmt(total)} ج.م`}/>
    </div>
    <section className="panel">
      <div className="toolbar"><div className="search-field"><Search size={16}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="بحث في طلبات الشراء..."/></div><span className="toolbar-count">{rows.length} من {records.length} طلب</span></div>
      <div className="table-wrap"><table><thead><tr><th>رقم الطلب</th><th>التاريخ</th><th>مقدم الطلب</th><th>الوصف</th><th>الكمية</th><th>التقديري</th><th>المشروع</th><th>الحالة</th><th>المورد</th><th>أمر الشراء</th>{(canEdit||canApprove)&&<th>إجراءات</th>}</tr></thead>
      <tbody>{rows.map(r=><tr key={String(r.id)}>
        <td><strong>{String(r.number??r.id??'—')}</strong></td><td>{dateText(String(r.date??''))}</td><td>{String(r.req??'—')}</td><td>{String(r.desc??'—')}</td><td>{fmt(Number(r.qty||0))} {String(r.unit??'')}</td><td>{fmt(Number(r.est||0))} ج.م</td><td><ReferenceValue field="proj" value={r.proj} lookups={{projects}}/></td>
        <td><span className={`badge ${String(r.status)==='مرفوض'?'red':String(r.status)==='أمر شراء'?'green':String(r.status)==='معتمد'?'green':'amber'}`}>{String(r.status??'—')}</span></td><td>{String(r.supplier??'—')}</td><td>{String(r.po??'—')}</td>
        {(canEdit||canApprove)&&<td><div className="row-actions">
          {canApprove&&String(r.status)==='قيد الاعتماد'&&<><button type="button" className="workflow-button primary" disabled={busy} onClick={()=>action(r,'معتمد','approve')}><CheckCircle2 size={13}/> اعتماد</button><button type="button" className="workflow-button danger" disabled={busy} onClick={()=>action(r,'مرفوض','reject')}><Ban size={13}/> رفض</button></>}
          {canApprove&&String(r.status)==='معتمد'&&<button type="button" className="workflow-button primary" disabled={busy} onClick={()=>openPo(r)}><ShoppingCart size={13}/> إصدار أمر شراء</button>}
          {canEdit&&['قيد الاعتماد','مسودة'].includes(String(r.status))&&<button type="button" className="icon-button" title="تعديل طلب الشراء" onClick={()=>setEditing({...r})} aria-label="تعديل طلب الشراء"><Pencil size={14}/></button>}
        </div></td>}
      </tr>)}</tbody></table>{!rows.length&&<div className="empty">لا توجد طلبات مطابقة.</div>}</div>
    </section>

    {editing&&<div className="modal-backdrop" onMouseDown={()=>!busy&&setEditing(null)}><form className="modal-card wide form-modal-premium" onSubmit={saveNew} onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><h2>طلب شراء جديد</h2><p>يبدأ الطلب بحالة «قيد الاعتماد».</p></div><button type="button" className="icon-button" onClick={()=>setEditing(null)} aria-label="إغلاق"><X size={18}/></button></div>
      <div className="form-sections"><FormBlock title="بيانات الطلب" hint="الصنف والكمية ووحدة القياس"><Input name="desc" label="وصف المادة أو الصنف" value={String(editing.desc??'')} required/><Select name="category" label="التصنيف" value={String(editing.category??'قطع غيار')} options={['قطع غيار','زيوت','إطارات','مواد','معدات','خدمات']} required/><Input name="qty" label="الكمية" type="number" value={String(editing.qty??1)} required/><Select name="unit" label="الوحدة" value={String(editing.unit??'قطعة')} options={['قطعة','طقم','لتر','عبوة','متر','ساعة']} required/></FormBlock><FormBlock title="التوجيه والاحتياج" hint="مكان الاستخدام وموعد الاحتياج"><label className="field"><span>المشروع</span><select name="proj" defaultValue={String(editing.proj??'')}><option value="">المقر / بدون مشروع</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name} — {p.code}</option>)}</select></label><Input name="warehouse" label="المخزن المطلوب" value={String(editing.warehouse??'')}/><Input name="requiredDate" label="تاريخ الاحتياج" type="date" value={String(editing.requiredDate??'')}/><Input name="reason" label="سبب الطلب" value={String(editing.reason??'')} /></FormBlock><FormBlock title="الميزانية والمقارنة" hint="بيانات تساعد في المراجعة قبل الاعتماد"><Input name="est" label="التكلفة التقديرية ج.م" type="number" value={String(editing.est??0)} required/><Input name="budget" label="البند / الميزانية" value={String(editing.budget??'')} /><Input name="quotationCount" label="عدد عروض الأسعار" type="number" value={String(editing.quotationCount??0)}/><Input name="paymentTerms" label="شروط الدفع" value={String(editing.paymentTerms??'')} /></FormBlock><label className="field field-full"><span>ملاحظات الطلب</span><textarea name="notes" defaultValue={String(editing.notes??'')} rows={4} placeholder="المواصفة المطلوبة، بدائل مقبولة، عاجل/تشغيلي، أو أي مرفقات مرجعية..."/></label></div>
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setEditing(null)}>إلغاء</button><button className="primary-button" disabled={busy}>{busy?'جارٍ الحفظ...':'حفظ الطلب'}</button></div>
    </form></div>}

    {po&&<div className="modal-backdrop" onMouseDown={()=>!busy&&setPo(null)}><form className="modal-card wide form-modal-premium" onSubmit={issuePo} onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><h2>إصدار أمر شراء</h2><p>{String(po.number??po.id??'')} — يجب تحديد المورد قبل الإصدار.</p></div><button type="button" className="icon-button" onClick={()=>setPo(null)} aria-label="إغلاق"><X size={18}/></button></div>
      <div className="form-sections"><FormBlock title="المورد وأمر الشراء" hint="البيانات الأساسية لإصدار الأمر"><Input name="supplier" label="المورد" value={String(po.supplier??'')} required/><Input name="date" label="تاريخ أمر الشراء" type="date" value={new Date().toISOString().slice(0,10)} required/><Input name="paymentTerms" label="شروط الدفع" value={String(po.paymentTerms??'')} /><Input name="deliveryDate" label="تاريخ التوريد المتوقع" type="date" value={String(po.deliveryDate??'')} /></FormBlock><FormBlock title="القيمة والتسليم" hint="تفاصيل التنفيذ مع المورد"><Input name="quotationRef" label="مرجع عرض السعر" value={String(po.quotationRef??'')} /><Input name="deliveryLocation" label="مكان التسليم" value={String(po.deliveryLocation??'')} /><Input name="shipping" label="الشحن / النقل" type="number" value={String(po.shipping??0)} /><Input name="tax" label="الضريبة" type="number" value={String(po.tax??0)} /></FormBlock><label className="field field-full"><span>ملاحظات الأمر</span><textarea name="notes" defaultValue={String(po.notes??'')} rows={4} placeholder="شروط التوريد، الضمان، المستندات المطلوبة وملاحظات الاستلام..."/></label></div>
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setPo(null)}>إلغاء</button><button className="primary-button" disabled={busy}>{busy?'جارٍ الإصدار...':'إصدار أمر الشراء'}</button></div>
    </form></div>}
  </div>
}

function Input({name,label,value,type='text',required=false}:{name:string;label:string;value:string;type?:string;required?:boolean}){return <label className="field"><span>{label}{required&&' *'}</span><input name={name} type={type} defaultValue={value} required={required} min={type==='number'?0:undefined} step={type==='number'?'any':undefined}/></label>}
function Select({name,label,value,options,required=false}:{name:string;label:string;value:string;options:string[];required?:boolean}){return <label className="field"><span>{label}{required&&' *'}</span><select name={name} defaultValue={value} required={required}>{options.map(o=><option key={o} value={o}>{o}</option>)}</select></label>}
function FormBlock({title,hint,children}:{title:string;hint:string;children:ReactNode}){return <section className="form-section"><div className="form-section-head"><strong>{title}</strong><span>{hint}</span></div><div className="form-grid">{children}</div></section>}

function Metric({icon:Icon,label,value}:{icon:LucideIcon;label:string;value:number|string}){return <div className="metric-card"><div className="metric-icon"><Icon size={18}/></div><div className="metric-body"><span>{label}</span><strong>{value}</strong></div></div>}
