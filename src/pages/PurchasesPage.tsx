import { ConfirmModal, OperationalSummaryStrip } from '../shared/ui'
import { Ban, CheckCircle2, ClipboardCheck, Pencil, Plus, ShoppingCart, X, type LucideIcon } from 'lucide-react'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import type { InventoryItem, Project, StockMovement, User, Warehouse } from '../types/tfms'
import { ReferenceValue } from '../components/ReferenceValue'
import { Button, DataTable, PageHeader, StatusBadge } from '../components/ui'
import { useCurrency } from '../features/settings'

import { APP_LOCALE } from '../shared/formatters/locale'
type RecordType = Record<string, unknown>

type Props = {
  records: RecordType[]
  user: User
  projects: Project[]
  inventoryItems?: InventoryItem[]
  warehouses?: Warehouse[]
  canEdit: boolean
  onSave: (record: RecordType) => Promise<void> | void
  onReceive?: (input:{purchase:RecordType; inventoryItemId:string; warehouseId:string; quantity:number; unitCost:number; notes:string}) => Promise<StockMovement>
}

const APPROVER_ROLES = ['admin', 'fleet', 'maint']

function fmt(n:number) {
  return new Intl.NumberFormat(APP_LOCALE,{maximumFractionDigits:2}).format(Number(n||0))
}
function dateText(value:string) {
  if(!value)return '—'
  const d=new Date(value)
  return Number.isNaN(d.getTime())?value:new Intl.DateTimeFormat(APP_LOCALE,{day:'2-digit',month:'2-digit',year:'numeric'}).format(d)
}

export function PurchasesPage({records,user,projects,inventoryItems=[],warehouses=[],canEdit,onSave,onReceive}:Props) {
  const [q,setQ]=useState('')
  const {formatMoney}=useCurrency(); const [editing,setEditing]=useState<RecordType|null>(null)
  const [po,setPo]=useState<RecordType|null>(null)
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const [receiving,setReceiving]=useState<RecordType|null>(null)
  const [rejecting,setRejecting]=useState<RecordType|null>(null)

  const rows=useMemo(()=>records,[records])

  const pending=records.filter(r=>String(r.status)==='قيد الاعتماد').length
  const approved=records.filter(r=>String(r.status)==='معتمد').length
  const orders=records.filter(r=>String(r.status)==='أمر شراء').length
  const total=records.filter(r=>String(r.status)!=='مرفوض').reduce((s,r)=>s+Number(r.est||0),0)

  function openNew() {
    setError('')
    setEditing({id:`PR-${Date.now()}`,number:`PR-${100+records.length+1}`,date:new Date().toISOString().slice(0,10),req:user.name,desc:'',qty:1,unit:'قطعة',est:0,proj:'',status:'قيد الاعتماد',po:'',supplier:'',notes:'',inventoryItemId:'',warehouseId:'',receivedQty:0,receiptStatus:'غير مستلم'})
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

  async function applyAction(record:RecordType, next:string, actionKey:'approve'|'reject') {
    if(!APPROVER_ROLES.includes(user.role)||busy)return
    setBusy(true);setError('')
    try {
      const trail=Array.isArray(record.apprs)?record.apprs:[]
      await onSave({...record,status:next,apprs:[...trail,{by:user.name,act:actionKey==='approve'?'اعتماد طلب شراء':'رفض طلب شراء'}],reason:actionKey==='reject'?`رفض بواسطة ${user.name}`:record.reason})
      setRejecting(null)
    } catch(err) { setError(err instanceof Error?err.message:'تعذر تنفيذ الإجراء.') }
    finally { setBusy(false) }
  }

  async function action(record:RecordType, next:string, actionKey:'approve'|'reject') {
    if(actionKey==='reject') {
      setRejecting(record)
      return
    }
    await applyAction(record,next,actionKey)
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


  async function receive(e:FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!receiving || !onReceive || busy) return
    setBusy(true); setError('')
    try {
      const fd=new FormData(e.currentTarget)
      const inventoryItemId=String(fd.get('inventoryItemId')||'').trim()
      const warehouseId=String(fd.get('warehouseId')||'').trim()
      const quantity=Number(fd.get('quantity')||0)
      const rawUnitCost=String(fd.get('unitCost')||'').trim()
      const unitCost=rawUnitCost==='' ? Number(receiving.est||0)/Math.max(1,Number(receiving.qty||1)) : Number(rawUnitCost)
      const notes=String(fd.get('notes')||'').trim()
      if(!inventoryItemId) throw new Error('اختر الصنف المخزني الذي سيُستلم.')
      if(!warehouseId) throw new Error('اختر المخزن المستلم.')
      if(!Number.isFinite(quantity)||quantity<=0) throw new Error('كمية الاستلام يجب أن تكون أكبر من صفر.')
      const orderedQty=Number(receiving.qty||0)
      const receivedBefore=Number(receiving.receivedQty||0)
      if(orderedQty>0 && quantity>Math.max(0,orderedQty-receivedBefore)) throw new Error(`الكمية المتبقية للاستلام ${Math.max(0,orderedQty-receivedBefore)} فقط.`)
      const movement=await onReceive({purchase:receiving,inventoryItemId,warehouseId,quantity,unitCost:Number.isFinite(unitCost)&&unitCost>=0?unitCost:0,notes})
      const newReceived=receivedBefore+quantity
      const receiptStatus=orderedQty>0&&newReceived>=orderedQty?'مستلم بالكامل':'مستلم جزئي'
      await onSave({...receiving,inventoryItemId,warehouseId,receivedQty:newReceived,receiptStatus,receiptNo:movement.movementNo,lastReceiptDate:new Date().toISOString().slice(0,10),apprs:[...(Array.isArray(receiving.apprs)?receiving.apprs:[]),{by:user.name,act:`استلام مخزني ${movement.movementNo}`,qty:quantity}]})
      setReceiving(null)
    } catch(err) { setError(err instanceof Error?err.message:'تعذر تسجيل الاستلام المخزني.') }
    finally { setBusy(false) }
  }

  const canApprove=APPROVER_ROLES.includes(user.role)

  return <div className="space-y-6">
    <PageHeader title="المشتريات وطلبات الشراء" description="الموقع يطلب ولا يشتري مباشرة: طلب ← مراجعة ← اعتماد ← إصدار أمر شراء." action={canEdit&&<Button icon={<Plus size={16}/>} onClick={openNew}>طلب شراء</Button>} />
    {error&&<div className="global-error" role="alert">{error}</div>}
    <div className="metric-grid compact">
      <Metric icon={ClipboardCheck} label="قيد الاعتماد" value={pending}/>
      <Metric icon={CheckCircle2} label="معتمدة" value={approved}/>
      <Metric icon={ShoppingCart} label="أوامر شراء" value={orders}/>
      <Metric icon={ShoppingCart} label="القيمة غير المرفوضة" value={formatMoney(total)}/>
    </div>
    <OperationalSummaryStrip items={[
      { id:'pending', label:'قيد الاعتماد', value:pending, tone:pending?'alert':'default' },
      { id:'approved', label:'معتمدة', value:approved, tone:'success' },
      { id:'orders', label:'أوامر شراء', value:orders },
      { id:'value', label:'القيمة غير المرفوضة', value:formatMoney(total) },
    ]} />
    <DataTable
      rows={rows}
      columns={[
        { id:'number', header:'رقم الطلب', render:r=><strong>{String(r.number??r.id??'—')}</strong>, sortValue:r=>String(r.number??r.id??'') },
        { id:'date', header:'التاريخ', render:r=>dateText(String(r.date??'')), sortValue:r=>String(r.date??''), hideOnMobile:true },
        { id:'req', header:'مقدم الطلب', render:r=>String(r.req??'—'), sortValue:r=>String(r.req??''), hideOnMobile:true },
        { id:'desc', header:'الوصف', render:r=>String(r.desc??'—') },
        { id:'qty', header:'الكمية', render:r=>`${fmt(Number(r.qty||0))} ${String(r.unit??'')}`, sortValue:r=>Number(r.qty||0) },
        { id:'est', header:'التقديري', render:r=>formatMoney(Number(r.est||0)), sortValue:r=>Number(r.est||0), hideOnMobile:true },
        { id:'proj', header:'المشروع', render:r=><ReferenceValue field="proj" value={r.proj} lookups={{projects}} /> },
        { id:'status', header:'الحالة', render:r=>{const status=String(r.status??'');return <StatusBadge tone={status==='مرفوض'?'red':status==='أمر شراء'||status==='معتمد'?'emerald':'amber'}>{status||'—'}</StatusBadge>}, sortValue:r=>String(r.status??'') },
                { id:'supplier', header:'المورد', render:r=>String(r.supplier??'—'), hideOnMobile:true },
        { id:'po', header:'أمر الشراء', render:r=>String(r.po??'—'), hideOnMobile:true },
        { id:'received', header:'الاستلام', render:r=>`${fmt(Number(r.receivedQty||0))} / ${fmt(Number(r.qty||0))} ${String(r.unit??'')}`, hideOnMobile:true },
        { id:'receiptStatus', header:'حالة الاستلام', render:r=>String(r.receiptStatus??'غير مستلم') },

        ...((canEdit||canApprove)?[{ id:'actions', header:'إجراءات', render:(r:RecordType)=><div className="flex flex-wrap gap-2">{canApprove&&String(r.status)==='قيد الاعتماد'&&<><Button size="sm" icon={<CheckCircle2 size={13}/>} disabled={busy} onClick={()=>void action(r,'معتمد','approve')}>اعتماد</Button><Button variant="danger" size="sm" icon={<Ban size={13}/>} disabled={busy} onClick={()=>void action(r,'مرفوض','reject')}>رفض</Button></>}{canApprove&&String(r.status)==='معتمد'&&<Button size="sm" icon={<ShoppingCart size={13}/>} disabled={busy} onClick={()=>openPo(r)}>إصدار أمر شراء</Button>}{onReceive&&String(r.status)==='أمر شراء'&&Number(r.receivedQty||0)<Number(r.qty||0)&&<Button size="sm" variant="secondary" disabled={busy} onClick={()=>{setReceiving({...r});setError('')}}>استلام</Button>}{canEdit&&['قيد الاعتماد','مسودة'].includes(String(r.status))&&<Button variant="ghost" size="sm" icon={<Pencil size={14}/>} onClick={()=>setEditing({...r})}>تعديل</Button>}</div>}]:[]),
      ]}
      rowKey={r=>String(r.id)}
      searchable
      search={q}
      onSearchChange={setQ}
      searchableText={r=>Object.values(r).map(v=>String(v??'')).join(' ')}
      searchPlaceholder="ابحث برقم الطلب أو الوصف أو المورد أو أمر الشراء..."
      filters={[
        {
          id:'status',
          label:'الحالة',
          options:[
            {value:'قيد الاعتماد',label:'قيد الاعتماد'},
            {value:'معتمد',label:'معتمد'},
            {value:'أمر شراء',label:'أمر شراء'},
            {value:'مرفوض',label:'مرفوض'},
          ],
          getValue:r=>String(r.status??''),
        },
        {
          id:'receiptStatus',
          label:'الاستلام',
          options:[
            {value:'غير مستلم',label:'غير مستلم'},
            {value:'مستلم جزئي',label:'مستلم جزئي'},
            {value:'مستلم بالكامل',label:'مستلم بالكامل'},
          ],
          getValue:r=>String(r.receiptStatus??'غير مستلم'),
        },
      ]}
      emptyState={<div className="px-6 py-16 text-center text-sm font-medium text-gray-500">لا توجد طلبات مطابقة.</div>}
      enableColumnVisibility
      columnVisibilityStorageKey="kemex.purchases.columns.v1"
      exportable
      exportFileName="KEMEX-purchases"
      pageSizeOptions={[15, 30, 60]}
    />

    {editing&&<div className="modal-backdrop" onMouseDown={()=>!busy&&setEditing(null)}><form className="modal-card wide form-modal-premium" onSubmit={saveNew} onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><h2>طلب شراء جديد</h2><p>يبدأ الطلب بحالة «قيد الاعتماد».</p></div><button type="button" className="icon-button" onClick={()=>setEditing(null)} aria-label="إغلاق"><X size={18}/></button></div>
      <div className="form-sections"><FormBlock title="بيانات الطلب" hint="الصنف والكمية ووحدة القياس"><Input name="desc" label="وصف المادة أو الصنف" value={String(editing.desc??'')} required/><Select name="category" label="التصنيف" value={String(editing.category??'قطع غيار')} options={['قطع غيار','زيوت','إطارات','مواد','معدات','خدمات']} required/><Input name="qty" label="الكمية" type="number" value={String(editing.qty??1)} required/><Select name="unit" label="الوحدة" value={String(editing.unit??'قطعة')} options={['قطعة','طقم','لتر','عبوة','متر','ساعة']} required/></FormBlock><FormBlock title="التوجيه والاحتياج" hint="مكان الاستخدام وموعد الاحتياج"><label className="field"><span>المشروع</span><select name="proj" defaultValue={String(editing.proj??'')}><option value="">المقر / بدون مشروع</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name} — {p.code}</option>)}</select></label><Input name="warehouse" label="المخزن المطلوب" value={String(editing.warehouse??'')}/><Input name="requiredDate" label="تاريخ الاحتياج" type="date" value={String(editing.requiredDate??'')}/><Input name="reason" label="سبب الطلب" value={String(editing.reason??'')} /></FormBlock><FormBlock title="الميزانية والمقارنة" hint="بيانات تساعد في المراجعة قبل الاعتماد"><Input name="est" label="التكلفة التقديرية" type="number" value={String(editing.est??0)} required/><Input name="budget" label="البند / الميزانية" value={String(editing.budget??'')} /><Input name="quotationCount" label="عدد عروض الأسعار" type="number" value={String(editing.quotationCount??0)}/><Input name="paymentTerms" label="شروط الدفع" value={String(editing.paymentTerms??'')} /></FormBlock><label className="field field-full"><span>ملاحظات الطلب</span><textarea name="notes" defaultValue={String(editing.notes??'')} rows={4} placeholder="المواصفة المطلوبة، بدائل مقبولة، عاجل/تشغيلي، أو أي مرفقات مرجعية..."/></label></div>
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setEditing(null)}>إلغاء</button><button className="primary-button" disabled={busy}>{busy?'جارٍ الحفظ...':'حفظ الطلب'}</button></div>
    </form></div>}

    {receiving&&onReceive&&<div className="modal-backdrop" onMouseDown={()=>!busy&&setReceiving(null)}><form className="modal-card wide form-modal-premium" onSubmit={receive} onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><h2>استلام إلى المخزون</h2><p>{String(receiving.po??receiving.number??receiving.id)} · تسجيل الاستلام ينشئ حركة «استلام» مرتبطة بطلب الشراء.</p></div><button type="button" className="icon-button" onClick={()=>!busy&&setReceiving(null)} aria-label="إغلاق"><X size={18}/></button></div><div className="form-sections"><FormBlock title="الصنف والمخزن" hint="اربط الاستلام بالبطاقة المخزنية الفعلية"><label className="field"><span>الصنف المخزني *</span><select name="inventoryItemId" defaultValue={String(receiving.inventoryItemId??'')} required><option value="">— اختر الصنف —</option>{inventoryItems.map(item=><option key={item.id} value={item.id}>{item.name} — {item.code} · الرصيد {fmt(item.currentQty)}</option>)}</select></label><label className="field"><span>المخزن المستلم *</span><select name="warehouseId" defaultValue={String(receiving.warehouseId??'')} required><option value="">— اختر المخزن —</option>{warehouses.filter(w=>w.active!==false).map(w=><option key={w.id} value={w.id}>{w.name} — {w.code}</option>)}</select></label><Input name="quantity" label={`الكمية المستلمة (المتبقي ${fmt(Math.max(0,Number(receiving.qty||0)-Number(receiving.receivedQty||0)))} ${String(receiving.unit??'')})`} type="number" value={String(Math.max(0,Number(receiving.qty||0)-Number(receiving.receivedQty||0)))} required/><Input name="unitCost" label="تكلفة الوحدة الفعلية" type="number" value={String(Number(receiving.est||0)/Math.max(1,Number(receiving.qty||1)))} /></FormBlock><label className="field field-full"><span>ملاحظات الاستلام</span><textarea name="notes" rows={4} placeholder="رقم إذن الاستلام، الفحص، النواقص أو أي ملاحظات..." /></label></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setReceiving(null)} disabled={busy}>إلغاء</button><button className="primary-button" disabled={busy}>{busy?'جارٍ تسجيل الاستلام...':'تسجيل الاستلام'}</button></div></form></div>}\n\n    {po&&<div className="modal-backdrop" onMouseDown={()=>!busy&&setPo(null)}><form className="modal-card wide form-modal-premium" onSubmit={issuePo} onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><h2>إصدار أمر شراء</h2><p>{String(po.number??po.id??'')} — يجب تحديد المورد قبل الإصدار.</p></div><button type="button" className="icon-button" onClick={()=>setPo(null)} aria-label="إغلاق"><X size={18}/></button></div>
      <div className="form-sections"><FormBlock title="المورد وأمر الشراء" hint="البيانات الأساسية لإصدار الأمر"><Input name="supplier" label="المورد" value={String(po.supplier??'')} required/><Input name="date" label="تاريخ أمر الشراء" type="date" value={new Date().toISOString().slice(0,10)} required/><Input name="paymentTerms" label="شروط الدفع" value={String(po.paymentTerms??'')} /><Input name="deliveryDate" label="تاريخ التوريد المتوقع" type="date" value={String(po.deliveryDate??'')} /></FormBlock><FormBlock title="القيمة والتسليم" hint="تفاصيل التنفيذ مع المورد"><Input name="quotationRef" label="مرجع عرض السعر" value={String(po.quotationRef??'')} /><Input name="deliveryLocation" label="مكان التسليم" value={String(po.deliveryLocation??'')} /><Input name="shipping" label="الشحن / النقل" type="number" value={String(po.shipping??0)} /><Input name="tax" label="الضريبة" type="number" value={String(po.tax??0)} /></FormBlock><label className="field field-full"><span>ملاحظات الأمر</span><textarea name="notes" defaultValue={String(po.notes??'')} rows={4} placeholder="شروط التوريد، الضمان، المستندات المطلوبة وملاحظات الاستلام..."/></label></div>
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setPo(null)}>إلغاء</button><button className="primary-button" disabled={busy}>{busy?'جارٍ الإصدار...':'إصدار أمر الشراء'}</button></div>
    </form></div>}
    <ConfirmModal
      open={Boolean(rejecting)}
      title="رفض طلب الشراء"
      description={rejecting ? <>سيتم تغيير حالة الطلب <strong>{String(rejecting.number ?? rejecting.id ?? '—')}</strong> إلى «مرفوض» وتسجيل الإجراء باسم {user.name}.</> : ''}
      confirmLabel="تأكيد الرفض"
      danger
      busy={busy}
      onCancel={() => !busy && setRejecting(null)}
      onConfirm={() => rejecting ? applyAction(rejecting,'مرفوض','reject') : undefined}
    />

  </div>
}

function Input({name,label,value,type='text',required=false}:{name:string;label:string;value:string;type?:string;required?:boolean}){return <label className="field"><span>{label}{required&&' *'}</span><input name={name} type={type} defaultValue={value} required={required} min={type==='number'?0:undefined} step={type==='number'?'any':undefined}/></label>}
function Select({name,label,value,options,required=false}:{name:string;label:string;value:string;options:string[];required?:boolean}){return <label className="field"><span>{label}{required&&' *'}</span><select name={name} defaultValue={value} required={required}>{options.map(o=><option key={o} value={o}>{o}</option>)}</select></label>}
function FormBlock({title,hint,children}:{title:string;hint:string;children:ReactNode}){return <section className="form-section"><div className="form-section-head"><strong>{title}</strong><span>{hint}</span></div><div className="form-grid">{children}</div></section>}

function Metric({icon:Icon,label,value}:{icon:LucideIcon;label:string;value:number|string}){return <div className="metric-card"><div className="metric-icon"><Icon size={18}/></div><div className="metric-body"><span>{label}</span><strong>{value}</strong></div></div>}
