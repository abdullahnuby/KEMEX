import { CircleCheckBig, CircleDot, Eye, MinusCircle, Plus, RotateCcw, Search, TriangleAlert, Wrench, X, type LucideIcon } from 'lucide-react'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import type { Asset } from '../types/tfms'
import { ReferenceValue } from '../components/ReferenceValue'

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
  const [editing, setEditing] = useState<TireRecord | null>(null)
  const [action, setAction] = useState<{ tire:TireRecord; kind:TireAction } | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const rows = useMemo(() => records.filter(t => {
    const text = [t.code, t.brand, t.size, t.asset, t.position, t.status].join(' ').toLowerCase()
    return !query.trim() || text.includes(query.trim().toLowerCase())
  }), [records, query])

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

  return <div>
    <div className="page-head"><div><h1>إدارة الإطارات</h1><p>سجل مستقل للإطارات مع التركيب والتدوير والفك والفحص والإصلاح والاستبعاد.</p></div>{canEdit&&<button type="button" className="primary-button" onClick={openNew}><Plus size={16}/> إطار جديد</button>}</div>
    {error&&<div className="global-error" role="alert">{error}</div>}
    <div className="metric-grid compact">
      <Metric icon={CircleDot} label="إجمالي الإطارات" value={records.length}/>
      <Metric icon={CircleCheckBig} label="بالخدمة" value={service}/>
      <Metric icon={MinusCircle} label="بالمخزن" value={stored}/>
      <Metric icon={TriangleAlert} label="تحتاج متابعة" value={inspection}/>
    </div>

    <section className="panel">
      <div className="toolbar"><div className="search-field"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="بحث في الإطارات..."/></div><span className="toolbar-count">{rows.length} من {records.length} إطار</span></div>
      <div className="table-wrap"><table><thead><tr><th>الكود</th><th>الماركة</th><th>المقاس</th><th>التكلفة</th><th>التركيب</th><th>الأصل</th><th>الموضع</th><th>العداد</th><th>الحالة</th>{canEdit&&<th>إجراءات</th>}</tr></thead>
        <tbody>{rows.map(t=>{const asset=assets.find(a=>a.id===String(t.asset??'')); return <tr key={String(t.id)}>
          <td><strong>{String(t.code??'—')}</strong></td><td>{String(t.brand??'—')}</td><td>{String(t.size??'—')}</td><td>{fmt(Number(t.cost||0))} ج.م</td><td>{dateText(String(t.install??''))}</td>
          <td><ReferenceValue field="asset" value={t.asset} lookups={{assets}}/></td><td>{String(t.position??'—')}</td><td>{fmt(Number(t.meterAt||0))}</td>
          <td><span className={`badge ${String(t.status)==='مستبعد'?'red':String(t.status)==='يحتاج فحص'||String(t.status)==='قيد الإصلاح'?'amber':'green'}`}>{String(t.status??'—')}</span></td>
          {canEdit&&<td><div className="row-actions">
            {(String(t.status)==='مخزن'||String(t.status)==='قيد الإصلاح')&&<button type="button" className="workflow-button primary" onClick={()=>openAction(t,'تركيب')}><Wrench size={13}/> تركيب</button>}
            {String(t.status)==='بالخدمة'&&<><button type="button" className="workflow-button secondary" onClick={()=>openAction(t,'فحص')}><Eye size={13}/> فحص</button><button type="button" className="workflow-button secondary" onClick={()=>openAction(t,'تدوير')}><RotateCcw size={13}/> تدوير</button><button type="button" className="workflow-button secondary" onClick={()=>openAction(t,'فك')}><MinusCircle size={13}/> فك</button></>}
            {String(t.status)==='يحتاج فحص'&&<button type="button" className="workflow-button secondary" onClick={()=>openAction(t,'إصلاح')}>إصلاح</button>}
            {String(t.status)!=='مستبعد'&&<button type="button" className="workflow-button danger" onClick={()=>openAction(t,'استبدال')}>إخراج</button>}
          </div></td>}
        </tr>})}</tbody>
      </table>{!rows.length&&<div className="empty">لا توجد إطارات مطابقة.</div>}</div>
    </section>

    <section className="panel">
      <div className="panel-head"><div><h2>سجل أعمال الإطارات</h2><p>عمليات الإطار وتكلفة كل عملية.</p></div></div>
      <div className="table-wrap"><table><thead><tr><th>التاريخ</th><th>الإطار</th><th>العملية</th><th>الأصل</th><th>الموضع</th><th>التكلفة</th><th>ملاحظات</th></tr></thead>
      <tbody>{operations.slice(0,100).map(o=><tr key={String(o.id)}><td>{dateText(String(o.date??''))}</td><td><ReferenceValue field="tire" value={o.tire} lookups={{assets,records:{tires:records}}}/></td><td>{String(o.op??'—')}</td><td><ReferenceValue field="asset" value={o.asset} lookups={{assets}}/></td><td>{String(o.position??'—')}</td><td>{fmt(Number(o.cost||0))} ج.م</td><td>{String(o.notes??'—')}</td></tr>)}</tbody>
      </table>{!operations.length&&<div className="empty">لا توجد عمليات مسجلة.</div>}</div>
    </section>

    {editing&&<div className="modal-backdrop" onMouseDown={()=>!busy&&setEditing(null)}><form className="modal-card wide form-modal-premium" onSubmit={saveNew} onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><h2>إضافة إطار للمخزون</h2><p>الإطار الجديد يبدأ بحالة «مخزن».</p></div><button type="button" className="icon-button" onClick={()=>setEditing(null)} aria-label="إغلاق"><X size={18}/></button></div>
      <div className="form-sections"><FormBlock title="هوية الإطار" hint="بيانات التعريف والمقاس"><Input name="code" label="كود الإطار" value="" required/><Input name="brand" label="الماركة" value="" required/><Input name="size" label="المقاس" value="" required/><Input name="serial" label="الرقم التسلسلي" value=""/></FormBlock><FormBlock title="الشراء والتخزين" hint="بيانات الشراء والمورد"><Input name="cost" label="تكلفة الشراء ج.م" type="number" value="0" required/><Input name="buy" label="تاريخ الشراء" type="date" value={new Date().toISOString().slice(0,10)} required/><Input name="supplier" label="المورد" value=""/><Input name="warranty" label="الضمان / العمر المتوقع" value=""/></FormBlock><label className="field field-full"><span>ملاحظات</span><textarea name="notes" rows={3} placeholder="المواصفة، بلد المنشأ، التخزين أو أي بيان مرتبط بالإطار..."/></label></div>
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setEditing(null)}>إلغاء</button><button className="primary-button" disabled={busy}>{busy?'جارٍ الحفظ...':'حفظ الإطار'}</button></div>
    </form></div>}

    {action&&<div className="modal-backdrop" onMouseDown={()=>!busy&&setAction(null)}><form className="modal-card wide form-modal-premium" onSubmit={execute} onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><h2>{action.kind} — إطار {String(action.tire.code??action.tire.id)}</h2><p>تسجيل العملية ثم تحديث حالة الإطار.</p></div><button type="button" className="icon-button" onClick={()=>setAction(null)} aria-label="إغلاق"><X size={18}/></button></div>
      <div className="form-grid">
        {['تركيب','تدوير','فك'].includes(action.kind)&&<Select name="asset" label="الأصل" value={String(action.tire.asset??'')} options={assets.map(a=>({v:a.id,l:`${a.name} — ${a.code}`}))} required/>}
        {['تركيب','تدوير'].includes(action.kind)&&<Input name="position" label="موضع التركيب" value={String(action.tire.position??'')} required/>}
        <Input name="date" label="التاريخ" type="date" value={new Date().toISOString().slice(0,10)} required/>
        <Input name="cost" label="تكلفة العملية ج.م" type="number" value="0"/>
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
