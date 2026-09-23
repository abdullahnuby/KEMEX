import { CalendarClock, CheckCircle2, Droplets, Plus, X, type LucideIcon } from 'lucide-react'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import type { Asset, WorkOrder } from '../types/tfms'
import { ReferenceValue } from '../components/ReferenceValue'
import { useCurrency } from '../features/settings'
import { Button, DataTable, PageHeader, StatusBadge } from '../components/ui'

export type OilRecord = Record<string, unknown>

type Props = {
  plans: OilRecord[]
  changes: OilRecord[]
  assets: Asset[]
  workOrders?: WorkOrder[]
  moduleData?: Record<string, Record<string, unknown>[]>
  userName: string
  canEdit: boolean
  onSavePlan: (record: OilRecord) => Promise<void> | void
  onSaveChange: (record: OilRecord) => Promise<void> | void
}

function fmt(n: number) {
  return new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 1 }).format(Number(n || 0))
}
function dateText(value: string) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : new Intl.DateTimeFormat('ar-EG', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d)
}
function daysBetween(from: string, to = new Date().toISOString().slice(0, 10)) {
  const a = new Date(from); const b = new Date(to)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0
  return Math.ceil((b.getTime() - a.getTime()) / 86400000)
}

type Due = { label: string; tone: 'green' | 'amber' | 'red' }

function dueFor(plan: OilRecord, assets: Asset[]): Due {
  const asset = assets.find(a => a.id === String(plan.asset ?? ''))
  const everyKm = Number(plan.everyKm || 0)
  const everyHours = Number(plan.everyHours || 0)
  const everyDays = Number(plan.everyDays || 0)
  const lastMeter = Number(plan.lastMeter || 0)
  const currentMeter = asset?.meter ?? lastMeter

  const checks: Due[] = []
  if (everyKm > 0 && asset?.mt === 'كم') {
    const remaining = everyKm - Math.max(0, currentMeter - lastMeter)
    checks.push({ label: remaining <= 0 ? 'مستحق بالعداد' : `متبقي ${fmt(remaining)} كم`, tone: remaining <= 500 ? 'amber' : 'green' })
  }
  if (everyHours > 0 && asset?.mt !== 'كم') {
    const remaining = everyHours - Math.max(0, currentMeter - lastMeter)
    checks.push({ label: remaining <= 0 ? 'مستحق بالساعات' : `متبقي ${fmt(remaining)} ساعة`, tone: remaining <= 80 ? 'amber' : 'green' })
  }
  if (everyDays > 0) {
    const lastDate = String(plan.lastDate ?? '')
    const remaining = everyDays - Math.max(0, daysBetween(lastDate))
    checks.push({ label: remaining <= 0 ? 'مستحق زمنيًا' : `متبقي ${fmt(remaining)} يوم`, tone: remaining <= 7 ? 'amber' : 'green' })
  }
  if (!checks.length) return { label: 'لا توجد قاعدة استحقاق', tone: 'amber' }
  if (checks.some(c => c.tone === 'amber' && /مستحق/.test(c.label))) return { label: checks.find(c => /مستحق/.test(c.label))?.label ?? 'مستحق', tone: 'red' }
  return checks.find(c => c.tone === 'amber') ?? checks[0]
}

export function OilsPage({ plans, changes, assets, workOrders = [], moduleData = {}, userName, canEdit, onSavePlan, onSaveChange }: Props) {
  const {formatMoney}=useCurrency()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<OilRecord | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const rows = useMemo(() => plans, [plans])

  const dueCount = rows.filter(p => dueFor(p, assets).tone === 'red').length
  const monthChanges = changes.filter(c => String(c.date ?? '').slice(0, 7) === new Date().toISOString().slice(0, 7)).length

  function openNew() {
    setError('')
    setEditing({
      id: `OC-${Date.now()}`,
      asset: assets[0]?.id ?? '',
      planId: '',
      oilType: 'زيت محرك 15W40',
      date: new Date().toISOString().slice(0, 10),
      meter: assets[0]?.meter ?? 0,
      qty: 0,
      matCost: 0,
      labCost: 0,
      by: userName,
      wo: '',
      notes: '',
    })
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editing || busy) return
    setBusy(true); setError('')
    try {
      const fd = new FormData(e.currentTarget)
      const asset = String(fd.get('asset') || '')
      const planId = String(fd.get('planId') || '')
      const meter = Number(fd.get('meter') || 0)
      const qty = Number(fd.get('qty') || 0)
      const matCost = Number(fd.get('matCost') || 0)
      const labCost = Number(fd.get('labCost') || 0)
      if (!asset) throw new Error('اختيار الأصل مطلوب.')
      if (![meter, qty, matCost, labCost].every(Number.isFinite) || [meter, qty, matCost, labCost].some(n => n < 0)) {
        throw new Error('العداد والكميات والتكاليف يجب أن تكون أرقامًا غير سالبة.')
      }
      const change = {
        ...editing,
        asset,
        planId,
        oilType: String(fd.get('oilType') || ''),
        date: String(fd.get('date') || ''),
        meter,
        qty,
        matCost,
        labCost,
        by: String(fd.get('by') || userName),
        wo: String(fd.get('wo') || ''),
        notes: String(fd.get('notes') || ''),
      }
      await onSaveChange(change)

      if (planId) {
        const plan = plans.find(p => String(p.id) === planId)
        if (plan) await onSavePlan({ ...plan, lastDate: change.date, lastMeter: change.meter })
      } else {
        const sameAsset = plans.find(p => String(p.asset ?? '') === asset)
        if (sameAsset) await onSavePlan({ ...sameAsset, lastDate: change.date, lastMeter: change.meter })
      }

      setEditing(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تسجيل تغيير الزيت أو الفلاتر.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="space-y-6">
    <PageHeader
      title="الزيوت والفلاتر"
      description="خطط التغيير حسب الكيلومتر أو ساعات التشغيل أو الأيام، مع سجل تنفيذ مرتبط بالأصل وأمر العمل."
      action={canEdit && <Button icon={<Plus size={16}/>} onClick={openNew}>تسجيل تغيير</Button>}
    />

    {error && <div className="global-error" role="alert">{error}</div>}

    <div className="metric-grid compact">
      <Metric icon={CalendarClock} label="خطط المتابعة" value={plans.length}/>
      <Metric icon={Droplets} label="خطط مستحقة" value={dueCount}/>
      <Metric icon={CheckCircle2} label="تغييرات هذا الشهر" value={monthChanges}/>
    </div>

    <section className="space-y-4"><div><h2 className="text-lg font-bold text-slate-900">خطط التغيير</h2><p className="text-sm font-medium text-gray-500">العداد الحالي للأصل يُقارن بآخر عداد مسجل في الخطة.</p></div>
      <DataTable
        rows={rows}
        columns={[
          { id:'asset', header:'الأصل', render:plan=><ReferenceValue field="asset" value={plan.asset} lookups={{assets}} /> },
          { id:'item', header:'المادة/الخطة', render:plan=><ReferenceValue field="item" value={plan.item} lookups={{assets,workOrders,records:moduleData}} /> },
          { id:'qty', header:'الكمية', render:plan=>`${fmt(Number(plan.qty||0))} ${String(plan.unit??'')}`, sortValue:plan=>Number(plan.qty||0) },
          { id:'rule', header:'قاعدة التغيير', render:plan=>[Number(plan.everyKm||0)>0?`${fmt(Number(plan.everyKm))} كم`:'',Number(plan.everyHours||0)>0?`${fmt(Number(plan.everyHours))} ساعة`:'',Number(plan.everyDays||0)>0?`${fmt(Number(plan.everyDays))} يوم`:''].filter(Boolean).join(' أو ')||'—' },
          { id:'lastDate', header:'آخر تنفيذ', render:plan=>dateText(String(plan.lastDate??'')), sortValue:plan=>String(plan.lastDate??'') },
          { id:'lastMeter', header:'العداد', render:plan=>fmt(Number(plan.lastMeter||0)), sortValue:plan=>Number(plan.lastMeter||0) },
          { id:'due', header:'الاستحقاق', render:plan=>{const due=dueFor(plan,assets);return <StatusBadge tone={due.tone==='green'?'emerald':due.tone==='red'?'red':'amber'}>{due.label}</StatusBadge>}, sortValue:plan=>{const due=dueFor(plan,assets);return due.tone==='red'?2:due.tone==='amber'?1:0} },
        ]}
        enableColumnVisibility columnVisibilityStorageKey="kemex.oils.plans.columns.v1" exportable exportFileName="KEMEX-oils"
      rowKey={plan=>String(plan.id)}
        searchable
        search={query}
        onSearchChange={setQuery}
        searchableText={plan=>[plan.asset,plan.item,plan.type,plan.lastDate].map(v=>String(v??'')).join(' ')}
        emptyState={<div className="px-6 py-16 text-center text-sm font-medium text-gray-500">لا توجد خطط مطابقة.</div>}
      />
    </section>

    <section className="space-y-4"><div><h2 className="text-lg font-bold text-slate-900">سجل عمليات التغيير</h2><p className="text-sm font-medium text-gray-500">كل عملية تسجل المادة والتاريخ والعداد والتكلفة والمنفذ.</p></div>
      <DataTable
        rows={changes.slice(0,100)}
        columns={[
          { id:'date', header:'التاريخ', render:change=>dateText(String(change.date??'')), sortValue:change=>String(change.date??'') },
          { id:'asset', header:'الأصل', render:change=><ReferenceValue field="asset" value={change.asset} lookups={{assets}} /> },
          { id:'oilType', header:'الزيت/الفلتر', render:change=>String(change.oilType??'—'), sortValue:change=>String(change.oilType??'') },
          { id:'meter', header:'العداد', render:change=>fmt(Number(change.meter||0)), sortValue:change=>Number(change.meter||0) },
          { id:'qty', header:'الكمية', render:change=>`${fmt(Number(change.qty||0))} لتر`, sortValue:change=>Number(change.qty||0) },
          { id:'cost', header:'التكلفة', render:change=>formatMoney(Number(change.matCost||0)+Number(change.labCost||0)), sortValue:change=>Number(change.matCost||0)+Number(change.labCost||0) },
          { id:'by', header:'المنفذ', render:change=>String(change.by??'—'), sortValue:change=>String(change.by??'') },
          { id:'wo', header:'أمر العمل', render:change=><ReferenceValue field="wo" value={change.wo} lookups={{assets,workOrders,records:{}}} /> },
        ]}
        enableColumnVisibility columnVisibilityStorageKey="kemex.oils.changes.columns.v1" exportable exportFileName="KEMEX-oils"
      rowKey={change=>String(change.id)}
        searchableText={change=>Object.values(change).map(value=>String(value??'')).join(' ')}
        emptyState={<div className="px-6 py-16 text-center text-sm font-medium text-gray-500">لا توجد عمليات تغيير مسجلة.</div>}
      />
    </section>

    {editing && <div className="modal-backdrop" onMouseDown={() => !busy && setEditing(null)}>
      <form className="modal-card wide form-modal-premium" onSubmit={submit} onMouseDown={e => e.stopPropagation()}>
        <div className="modal-head"><div><h2>تسجيل تغيير زيت أو فلاتر</h2><p>تحديث الخطة المرتبطة بعد التسجيل.</p></div><button type="button" className="icon-button" onClick={() => setEditing(null)} aria-label="إغلاق"><X size={18}/></button></div>
        <div className="form-grid">
          <Select name="asset" label="الأصل" value={String(editing.asset ?? '')} options={assets.map(a => ({v:a.id,l:`${a.name} — ${a.code}`}))} required/>
          <Select name="planId" label="الخطة المرتبطة" value={String(editing.planId ?? '')} options={[{v:'',l:'تحديث أقرب خطة تلقائيًا'}, ...plans.filter(p => String(p.asset ?? '') === String(editing.asset ?? '')).map(p => ({v:String(p.id),l:`${String(p.item ?? 'خطة زيوت')} — ${String(p.id)}`}))]}/>
          <Select name="oilType" label="نوع الزيت أو الفلتر" value={String(editing.oilType ?? '')} options={['زيت محرك 15W40','زيت هيدروليك','زيت ناقل حركة','فلتر زيت','فلتر وقود','فلتر هواء']}/>
          <Input name="date" label="التاريخ" type="date" value={String(editing.date ?? '')} required/>
          <Input name="meter" label="قراءة العداد/الساعات" type="number" value={String(editing.meter ?? 0)} required/>
          <Input name="qty" label="الكمية لتر" type="number" value={String(editing.qty ?? 0)}/>
          <Input name="matCost" label="تكلفة المواد" type="number" value={String(editing.matCost ?? 0)}/>
          <Input name="labCost" label="تكلفة العمالة" type="number" value={String(editing.labCost ?? 0)}/>
          <Input name="by" label="الفني/المنفذ" value={String(editing.by ?? userName)}/>
          <Select name="wo" label="أمر العمل المرتبط" value={String(editing.wo ?? '')} options={[{v:'',l:'بدون أمر عمل'}, ...workOrders.map(w=>({v:w.id,l:`${w.desc || w.type || 'أمر عمل'} — ${w.id}`}))]}/>
          <label className="field"><span>ملاحظات</span><textarea name="notes" defaultValue={String(editing.notes ?? '')} rows={3}/></label>
        </div>
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setEditing(null)}>إلغاء</button><button className="primary-button" disabled={busy}>{busy?'جارٍ التسجيل...':'حفظ التغيير'}</button></div>
      </form>
    </div>}
  </div>
}

function Input({name,label,value,type='text',required=false}:{name:string;label:string;value:string;type?:string;required?:boolean}) {
  return <label className="field"><span>{label}{required&&' *'}</span><input name={name} type={type} defaultValue={value} required={required} min={type==='number'?0:undefined} step={type==='number'?'any':undefined}/></label>
}
function Select({name,label,value,options,required=false}:{name:string;label:string;value:string;options:Array<string|{v:string;l:string}>;required?:boolean}) {
  return <label className="field"><span>{label}{required&&' *'}</span><select name={name} defaultValue={value} required={required}><option value="">— اختر —</option>{options.map(o => typeof o==='string'?<option key={o} value={o}>{o}</option>:<option key={o.v} value={o.v}>{o.l}</option>)}</select></label>
}
function FormBlock({title,hint,children}:{title:string;hint:string;children:ReactNode}){return <section className="form-section"><div className="form-section-head"><strong>{title}</strong><span>{hint}</span></div><div className="form-grid">{children}</div></section>}
function Metric({icon:Icon,label,value}:{icon:LucideIcon;label:string;value:number}) {
  return <div className="metric-card"><div className="metric-icon"><Icon size={18}/></div><div className="metric-body"><span>{label}</span><strong>{value}</strong></div></div>
}
