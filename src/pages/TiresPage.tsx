import { CircleCheckBig, CircleDot, Eye, MinusCircle, Plus, RotateCcw, TriangleAlert, Wrench, X, type LucideIcon } from 'lucide-react'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import type { Asset } from '../types/tfms'
import { useCurrency } from '../features/settings'
import { ReferenceValue } from '../components/ReferenceValue'
import { Button, DataTable, PageHeader, StatusBadge } from '../components/ui'

export type TireRecord = Record<string, unknown>
export type TireOperationRecord = Record<string, unknown>
type TireAction = 'تركيب' | 'فحص' | 'تدوير' | 'فك' | 'إصلاح' | 'استبدال'

type Props = {
  records: TireRecord[]
  operations: TireOperationRecord[]
  assets: Asset[]
  canEdit: boolean
  onSave: (record: TireRecord) => Promise<void> | void
  onSaveOperation: (record: TireOperationRecord) => Promise<void> | void
}

function fmt(n: number) {
  return new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 1 }).format(Number(n || 0))
}
function dateText(value: string) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : new Intl.DateTimeFormat('ar-EG', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d)
}

export function TiresPage({ records, operations, assets, canEdit, onSave, onSaveOperation }: Props) {
  const [query, setQuery] = useState('')
  const {formatMoney}=useCurrency(); const [editing, setEditing] = useState<TireRecord | null>(null)
  const [action, setAction] = useState<{ tire:TireRecord; kind:TireAction } | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const rows = useMemo(() => records, [records])

  const service = records.filter(t => String(t.status) === 'بالخدمة').length
  const stored = records.filter(t => String(t.status) === 'مخزن').length
  const inspection = records.filter(t => ['يحتاج فحص','قيد الإصلاح'].includes(String(t.status))).length

  function openNew() {
    setError('')
    setEditing({id:`TY-${Date.now()}`,code:'',brand:'',size:'',cost:0,buy:new Date().toISOString().slice(0,10),install:'',asset:'',position:'',meterAt:0,status:'مخزن',reason:''})
  }

  function openAction(tire: TireRecord, kind: TireAction) {
    setError('')
    setAction({tire:{...tire}, kind})
  }

  async function saveNew(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editing || busy) return
    setBusy(true); setError('')
    try {
      const fd = new FormData(e.currentTarget)
      const cost = Number(fd.get('cost') || 0)
      if (!String(fd.get('code') || '').trim() || !String(fd.get('brand') || '').trim() || !String(fd.get('size') || '').trim()) {
        throw new Error('كود الإطار والماركة والمقاس مطلوبة.')
      }
      if (!Number.isFinite(cost) || cost < 0) throw new Error('تكلفة شراء الإطار يجب أن تكون رقمًا غير سالب.')
      await onSave({...editing, code:String(fd.get('code')||'').trim(), brand:String(fd.get('brand')||'').trim(), size:String(fd.get('size')||'').trim(), cost, buy:String(fd.get('buy')||''), status:'مخزن'})
      setEditing(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ الإطار.')
    } finally { setBusy(false) }
  }

  async function execute(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!action || busy) return
    setBusy(true); setError('')
    try {
      const fd = new FormData(e.currentTarget)
      const kind = action.kind
      const tire = action.tire
      const asset = String(fd.get('asset') || String(tire.asset ?? ''))
      const position = String(fd.get('position') || String(tire.position ?? ''))
      const date = String(fd.get('date') || new Date().toISOString().slice(0,10))
      const cost = Number(fd.get('cost') || 0)
      const reason = String(fd.get('reason') || '')
      const notes = String(fd.get('notes') || '')
      if (!date) throw new Error('تاريخ العملية مطلوب.')
      if (!Number.isFinite(cost) || cost < 0) throw new Error('تكلفة العملية يجب أن تكون رقمًا غير سالب.')
      if (['تركيب','تدوير','فك'].includes(kind) && !asset) throw new Error('اختيار الأصل مطلوب لهذه العملية.')
      if (['تركيب','تدوير'].includes(kind) && !position) throw new Error('موضع التركيب مطلوب.')

      const next: TireRecord = {...tire, asset, position, install:String(tire.install ?? ''), status:String(tire.status ?? 'مخزن'), reason:String(tire.reason ?? '')}
      if (kind === 'تركيب') { next.status='بالخدمة'; next.install=date; next.meterAt=assets.find(a=>a.id===asset)?.meter ?? Number(tire.meterAt || 0) }
      if (kind === 'فحص') { next.status='بالخدمة' }
      if (kind === 'إصلاح') { next.status='مخزن'; next.reason=notes || 'تم الإصلاح وإعادته للمخزون' }
      if (kind === 'تدوير') { next.status='بالخدمة'; next.position=position }
      if (kind === 'فك') { next.status='مخزن'; next.asset=''; next.position=''; next.install=''; next.meterAt=0 }
      if (kind === 'استبدال') { if (!reason.trim()) throw new Error('سبب إخراج الإطار من الخدمة مطلوب.'); next.status='مستبعد'; next.reason=reason }

      await onSave(next)
      await onSaveOperation({id:`TO-${Date.now()}`,tire:tire.id,op:kind,date,asset:kind==='استبدال'?'':String(next.asset ?? ''),position:String(next.position ?? ''),cost,notes:notes || reason})
      setAction(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تسجيل عملية الإطار.')
    } finally { setBusy(false) }
  }

  return <div className="space-y-6">
    <PageHeader title="إدارة الإطارات" description="سجل مستقل للإطارات مع التركيب والتدوير والفك والفحص والإصلاح والاستبعاد." action={canEdit&&<Button icon={<Plus size={16}/>} onClick={openNew}>إطار جديد</Button>} />
    {error&&<div className="global-error" role="alert">{error}</div>}
    <div className="metric-grid compact">
      <Metric icon={CircleDot} label="إجمالي الإطارات" value={records.length}/>
      <Metric icon={CircleCheckBig} label="بالخدمة" value={service}/>
      <Metric icon={MinusCircle} label="بالمخزن" value={stored}/>
      <Metric icon={TriangleAlert} label="تحتاج متابعة" value={inspection}/>
    </div>

    <section className="space-y-4"><div><h2 className="text-lg font-bold text-slate-900">الإطارات</h2><p className="text-sm font-medium text-gray-500">إدارة المخزون والتركيب والفحص والإصلاح والاستبعاد من الخدمة.</p></div>
      <DataTable
        rows={rows}
        columns={[
          { id:'code', header:'الكود', render:t=><strong>{String(t.code??'—')}</strong>, sortValue:t=>String(t.code??'') },
          { id:'brand', header:'الماركة', render:t=>String(t.brand??'—'), sortValue:t=>String(t.brand??'') },
          { id:'size', header:'المقاس', render:t=>String(t.size??'—'), sortValue:t=>String(t.size??'') },
          { id:'cost', header:'التكلفة', render:t=>formatMoney(Number(t.cost||0)), sortValue:t=>Number(t.cost||0) },
          { id:'install', header:'التركيب', render:t=>dateText(String(t.install??'')), sortValue:t=>String(t.install??'') },
          { id:'asset', header:'الأصل', render:t=><ReferenceValue field="asset" value={t.asset} lookups={{assets}} /> },
          { id:'position', header:'الموضع', render:t=>String(t.position??'—') },
          { id:'meterAt', header:'العداد', render:t=>fmt(Number(t.meterAt||0)), sortValue:t=>Number(t.meterAt||0) },
          { id:'status', header:'الحالة', render:t=>{const status=String(t.status??'');return <StatusBadge tone={status==='مستبعد'?'red':status==='يحتاج فحص'||status==='قيد الإصلاح'?'amber':status==='بالخدمة'?'emerald':'gray'}>{status||'—'}</StatusBadge>}, sortValue:t=>String(t.status??'') },
          ...(canEdit?[{ id:'actions', header:'إجراءات', render:(t:TireRecord)=><div className="flex flex-wrap gap-2">{(String(t.status)==='مخزن'||String(t.status)==='قيد الإصلاح')&&<Button size="sm" icon={<Wrench size={13}/>} onClick={()=>openAction(t,'تركيب')}>تركيب</Button>}{String(t.status)==='بالخدمة'&&<><Button variant="secondary" size="sm" icon={<Eye size={13}/>} onClick={()=>openAction(t,'فحص')}>فحص</Button><Button variant="secondary" size="sm" icon={<RotateCcw size={13}/>} onClick={()=>openAction(t,'تدوير')}>تدوير</Button><Button variant="secondary" size="sm" icon={<MinusCircle size={13}/>} onClick={()=>openAction(t,'فك')}>فك</Button></>}{String(t.status)==='يحتاج فحص'&&<Button variant="secondary" size="sm" onClick={()=>openAction(t,'إصلاح')}>إصلاح</Button>}{String(t.status)!=='مستبعد'&&<Button variant="danger" size="sm" onClick={()=>openAction(t,'استبدال')}>إخراج</Button>}</div>}]:[]),
        ]}
        enableColumnVisibility columnVisibilityStorageKey="kemex.tires.registry.columns.v1" exportable exportFileName="KEMEX-tires"
      rowKey={t=>String(t.id)}
        search={query}
        onSearchChange={setQuery}
        searchableText={t=>[t.code,t.brand,t.size,t.asset,t.position,t.status].map(v=>String(v??'')).join(' ')}
        emptyState={<div className="px-6 py-16 text-center text-sm font-medium text-gray-500">لا توجد إطارات مطابقة.</div>}
      />
    </section>

    <section className="space-y-4"><div><h2 className="text-lg font-bold text-slate-900">سجل أعمال الإطارات</h2><p className="text-sm font-medium text-gray-500">عمليات الإطار وتكلفة كل عملية.</p></div>
      <DataTable
        rows={operations.slice(0,100)}
        columns={[
          { id:'date', header:'التاريخ', render:o=>dateText(String(o.date??'')), sortValue:o=>String(o.date??'') },
          { id:'tire', header:'الإطار', render:o=><ReferenceValue field="tire" value={o.tire} lookups={{assets,records:{tires:records}}} /> },
          { id:'op', header:'العملية', render:o=>String(o.op??'—'), sortValue:o=>String(o.op??'') },
          { id:'asset', header:'الأصل', render:o=><ReferenceValue field="asset" value={o.asset} lookups={{assets}} /> },
          { id:'position', header:'الموضع', render:o=>String(o.position??'—') },
          { id:'cost', header:'التكلفة', render:o=>formatMoney(Number(o.cost||0)), sortValue:o=>Number(o.cost||0) },
          { id:'notes', header:'ملاحظات', render:o=>String(o.notes??'—') },
        ]}
        enableColumnVisibility columnVisibilityStorageKey="kemex.tires.operations.columns.v1" exportable exportFileName="KEMEX-tires"
      rowKey={o=>String(o.id)}
        searchableText={o=>Object.values(o).map(value=>String(value??'')).join(' ')}
        emptyState={<div className="px-6 py-16 text-center text-sm font-medium text-gray-500">لا توجد عمليات مسجلة.</div>}
      />
    </section>

    {editing&&<div className="modal-backdrop" onMouseDown={()=>!busy&&setEditing(null)}><form className="modal-card wide form-modal-premium" onSubmit={saveNew} onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><h2>إضافة إطار للمخزون</h2><p>الإطار الجديد يبدأ بحالة «مخزن».</p></div><button type="button" className="icon-button" onClick={()=>setEditing(null)} aria-label="إغلاق"><X size={18}/></button></div>
      <div className="form-sections"><FormBlock title="هوية الإطار" hint="بيانات التعريف والمقاس"><Input name="code" label="كود الإطار" value="" required/><Input name="brand" label="الماركة" value="" required/><Input name="size" label="المقاس" value="" required/><Input name="serial" label="الرقم التسلسلي" value=""/></FormBlock><FormBlock title="الشراء والتخزين" hint="بيانات الشراء والمورد"><Input name="cost" label="تكلفة الشراء" type="number" value="0" required/><Input name="buy" label="تاريخ الشراء" type="date" value={new Date().toISOString().slice(0,10)} required/><Input name="supplier" label="المورد" value=""/><Input name="warranty" label="الضمان / العمر المتوقع" value=""/></FormBlock><label className="field field-full"><span>ملاحظات</span><textarea name="notes" rows={3} placeholder="المواصفة، بلد المنشأ، التخزين أو أي بيان مرتبط بالإطار..."/></label></div>
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setEditing(null)}>إلغاء</button><button className="primary-button" disabled={busy}>{busy?'جارٍ الحفظ...':'حفظ الإطار'}</button></div>
    </form></div>}

    {action&&<div className="modal-backdrop" onMouseDown={()=>!busy&&setAction(null)}><form className="modal-card wide form-modal-premium" onSubmit={execute} onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><h2>{action.kind} — إطار {String(action.tire.code??action.tire.id)}</h2><p>تسجيل العملية ثم تحديث حالة الإطار.</p></div><button type="button" className="icon-button" onClick={()=>setAction(null)} aria-label="إغلاق"><X size={18}/></button></div>
      <div className="form-grid">
        {['تركيب','تدوير','فك'].includes(action.kind)&&<Select name="asset" label="الأصل" value={String(action.tire.asset??'')} options={assets.map(a=>({v:a.id,l:`${a.name} — ${a.code}`}))} required/>}
        {['تركيب','تدوير'].includes(action.kind)&&<Input name="position" label="موضع التركيب" value={String(action.tire.position??'')} required/>}
        <Input name="date" label="التاريخ" type="date" value={new Date().toISOString().slice(0,10)} required/>
        <Input name="cost" label="تكلفة العملية" type="number" value="0"/>
        {action.kind==='استبدال'&&<Input name="reason" label="سبب الإخراج من الخدمة" value="" required/>}
        <label className="field"><span>ملاحظات</span><textarea name="notes" defaultValue="" rows={3}/></label>
      </div>
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setAction(null)}>إلغاء</button><button className={action.kind==='استبدال'?'workflow-button danger':'primary-button'} disabled={busy}>{busy?'جارٍ التسجيل...':'تسجيل العملية'}</button></div>
    </form></div>}
  </div>
}
function FormBlock({title,hint,children}:{title:string;hint:string;children:ReactNode}){return <section className="form-section"><div className="form-section-head"><strong>{title}</strong><span>{hint}</span></div><div className="form-grid">{children}</div></section>}

function Input({name,label,value,type='text',required=false}:{name:string;label:string;value:string;type?:string;required?:boolean}){return <label className="field"><span>{label}{required&&' *'}</span><input name={name} type={type} defaultValue={value} required={required} min={type==='number'?0:undefined} step={type==='number'?'any':undefined}/></label>}
function Select({name,label,value,options,required=false}:{name:string;label:string;value:string;options:{v:string;l:string}[];required?:boolean}){return <label className="field"><span>{label}{required&&' *'}</span><select name={name} defaultValue={value} required={required}><option value="">— اختر —</option>{options.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select></label>}
function Metric({icon:Icon,label,value}:{icon:LucideIcon;label:string;value:number}){return <div className="metric-card"><div className="metric-icon"><Icon size={18}/></div><div className="metric-body"><span>{label}</span><strong>{value}</strong></div></div>}
