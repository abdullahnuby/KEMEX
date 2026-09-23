import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Eye, Pencil, Plus, Truck, X } from 'lucide-react'
import type { Asset, Project } from '../types/tfms'
import { ReferenceValue } from '../components/ReferenceValue'
import { Button, DataTable, EmptyState, IconButton, PageHeader, StatusBadge, useToast } from '../components/ui'
import { FormSection, OperationalSummaryStrip } from '../shared/ui'

export function AssetsPage({assets, projects, onSave, onRoute, canEdit=true, focusAssetId}: {assets:Asset[]; projects:Project[]; onSave:(asset:Asset)=>Promise<void>; onRoute:(r:string)=>void; canEdit?:boolean; focusAssetId?:string}) {
  const [editing, setEditingState] = useState<Asset|null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const { show } = useToast()
  // الصلاحية مفروضة في القاعدة (RLS)؛ ده بس بيمنع فتح النموذج لمن لا يملكها
  const setEditing = (a:Asset|null) => { if (a && !canEdit) { window.alert('ليس لديك صلاحية تعديل الأصول'); return } setFormError(''); setEditingState(a) }
  useEffect(() => { if (focusAssetId) { const target = assets.find(item => item.id === focusAssetId); if (target) setEditing(target) } }, [assets, focusAssetId])

  const statusCounts = assets.reduce((acc, asset) => {
    acc.total += 1
    if (asset.status === 'متاح') acc.available += 1
    if (asset.status === 'يعمل') acc.active += 1
    if (asset.status === 'تحت الصيانة') acc.maintenance += 1
    if (asset.own === 'مستأجر') acc.rented += 1
    return acc
  }, { total: 0, available: 0, active: 0, maintenance: 0, rented: 0 })

  const assetColumns = [
    { id:'asset', header:'الأصل', searchable:true, sortValue:(a:Asset)=>a.name, render:(a:Asset)=><div className="table-main"><span className="asset-chip"><Truck size={15}/></span><div><strong>{a.name}</strong><small><span className="reference-code">{a.code}</span>{a.mfr || a.model ? ` · ${a.mfr ?? ''} ${a.model ?? ''}`.trim() : ''}</small></div></div> },
    { id:'category', header:'الفئة', sortValue:(a:Asset)=>a.cat, render:(a:Asset)=>a.cat },
    { id:'type', header:'النوع', sortValue:(a:Asset)=>a.type, render:(a:Asset)=>a.type },
    { id:'ownership', header:'الملكية', sortValue:(a:Asset)=>a.own, render:(a:Asset)=>a.own },
    { id:'project', header:'المشروع', sortValue:(a:Asset)=>a.proj, render:(a:Asset)=><ReferenceValue field="proj" value={a.proj} lookups={{projects}}/> },
    { id:'meter', header:'العداد', sortValue:(a:Asset)=>a.meter, render:(a:Asset)=>`${fmt(a.meter)} ${a.mt}` },
    { id:'status', header:'حالة التشغيل', sortValue:(a:Asset)=>a.status, render:(a:Asset)=><StatusBadge>{a.status}</StatusBadge> },
    { id:'condition', header:'الحالة الفنية', sortValue:(a:Asset)=>a.cond, render:(a:Asset)=><StatusBadge>{a.cond}</StatusBadge> },
    { id:'actions', header:'إجراءات', mobileVisible:true, render:(a:Asset)=><div className="row-actions"><button className="icon-button" title="عرض" onClick={()=>onRoute(`asset/${a.id}`)}><Eye size={16}/></button>{canEdit&&<button className="icon-button" title="تعديل" onClick={()=>setEditing(a)}><Pencil size={15}/></button>}</div> },
  ]

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault()
    if(!editing || saving) return
    setSaving(true)
    setFormError('')
    try {
      const fd=new FormData(e.currentTarget)
      const n=(k:string)=>Number(fd.get(k)||0)
      const asset: Asset = {
        ...editing,
        code:String(fd.get('code')||'').trim(),
        name:String(fd.get('name')||'').trim(),
        cat:String(fd.get('cat')||'').trim(),
        type:String(fd.get('type')||'').trim(),
        status:String(fd.get('status')||''),
        cond:String(fd.get('cond')||''),
        own:String(fd.get('own')||''),
        mfr:String(fd.get('mfr')||'').trim(),
        model:String(fd.get('model')||'').trim(),
        year:n('year'), fuel:String(fd.get('fuel')||''), mt:String(fd.get('mt')||'كم'), meter:n('meter'),
        std:n('std'), capex:n('capex'), life:n('life'), resid:n('resid'), proj:String(fd.get('proj')||''), drv:String(fd.get('drv')||''),
        cust:String(fd.get('cust')||'').trim(), plate:String(fd.get('plate')||'').trim(), buy:String(fd.get('buy')||''), lic:String(fd.get('lic')||''),
        ins:String(fd.get('ins')||''), contract:String(fd.get('contract')||'').trim(), notes:String(fd.get('notes')||'')
      }
      if(!asset.code) throw new Error('كود الأصل مطلوب.')
      if(!asset.name) throw new Error('اسم الأصل مطلوب.')
      if(!asset.cat) throw new Error('فئة الأصل مطلوبة.')
      if(!asset.type) throw new Error('نوع / استخدام الأصل مطلوب.')
      await onSave(asset)
      show({ message: `تم حفظ الأصل ${asset.name} بنجاح.`, tone: 'success' })
      setEditing(null)
    } catch(err) {
      setFormError(err instanceof Error ? err.message : 'تعذر حفظ الأصل. حاول مرة أخرى.')
    } finally {
      setSaving(false)
    }
  }

  return <div className="space-y-6">
    <PageHeader
      title="الأصول والأسطول والمعدات"
      description="سجل مركزي للأصول مع الحالة والتخصيص والعداد."
      action={<Button onClick={()=>setEditing({id:`NEW-${Date.now()}`,code:'',name:'',cat:'',type:'',own:'مملوك',status:'متاح',cond:'سليم',mfr:'',model:'',year:new Date().getFullYear(),fuel:'ديزل',mt:'كم',meter:0,std:0,capex:0,life:5,resid:0,proj:'',drv:'',cust:'',plate:'',buy:'',lic:'',ins:'',contract:'',notes:''})}><Plus size={16}/> إضافة أصل</Button>}
    />
    <OperationalSummaryStrip items={[
      { id: 'total', label: 'إجمالي الأصول', value: statusCounts.total },
      { id: 'available', label: 'متاح للتخصيص', value: statusCounts.available, tone: statusCounts.available ? 'success' : 'default' },
      { id: 'active', label: 'قيد التشغيل', value: statusCounts.active },
      { id: 'maintenance', label: 'تحت الصيانة', value: statusCounts.maintenance, tone: statusCounts.maintenance ? 'alert' : 'default' },
    ]} />
    <div className="enterprise-section-note"><span>الأصول المستأجرة: <strong>{statusCounts.rented}</strong></span><span>العمليات الجماعية غير مفعّلة على حالة الأصل لحماية دورة الاعتماد والتخصيص.</span></div>
    <DataTable
      rows={assets}
      columns={assetColumns}
      rowKey={row=>row.id}
      searchPlaceholder="بحث بالكود أو الاسم أو النوع أو اللوحة..."
      enableColumnVisibility
      columnVisibilityStorageKey="kemex.assets.columns.v1"
      exportable
      exportFileName="KEMEX-assets"
      searchableText={row=>[row.code,row.name,row.type,row.cat,row.plate||'',row.mfr||'',row.model||''].join(' ')}
      filters={[{ id:'status', label:'حالة التشغيل', options:[{value:'متاح',label:'متاح'},{value:'يعمل',label:'يعمل'},{value:'مخصص لمشروع',label:'مخصص لمشروع'},{value:'متوقف مؤقتًا',label:'متوقف مؤقتًا'},{value:'تحت الصيانة',label:'تحت الصيانة'},{value:'خارج الخدمة',label:'خارج الخدمة'}], getValue:row=>row.status }, { id:'condition', label:'الحالة الفنية', options:[{value:'سليم',label:'سليم'},{value:'يحتاج صيانة',label:'يحتاج صيانة'},{value:'تالف',label:'تالف'}], getValue:row=>row.cond }]}
      initialSort={{columnId:'asset',direction:'asc'}}
      pageSize={15}
      pageSizeOptions={[15, 30, 60]}
      emptyState={<EmptyState title="لا توجد أصول" description="لا توجد سجلات أصول فعلية مطابقة للبحث أو الفلاتر الحالية." action={canEdit ? <Button variant="secondary" onClick={()=>setEditing({id:`NEW-${Date.now()}`,code:'',name:'',cat:'',type:'',own:'مملوك',status:'متاح',cond:'سليم',mfr:'',model:'',year:new Date().getFullYear(),fuel:'',mt:'كم',meter:0,std:0,capex:0,life:0,resid:0,proj:'',drv:'',cust:'',plate:'',buy:'',lic:'',ins:'',contract:'',notes:''})}>إضافة أصل</Button> : undefined}/>}
    />
    {editing && <div className="modal-backdrop" onMouseDown={()=>setEditing(null)}><form className="modal-card wide" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><h2>{editing.code?'تعديل أصل':'إضافة أصل'}</h2><p>البيانات الأساسية</p></div><button type="button" className="icon-button" onClick={()=>setEditing(null)}><X size={18}/></button></div><div className="form-sections form-sections-core"><FormSection title="الهوية والتصنيف"><Field name="code" label="كود الأصل" defaultValue={editing.code} required/><Field name="name" label="اسم الأصل" defaultValue={editing.name} required/><Field name="cat" label="الفئة" defaultValue={editing.cat} required/><Field name="type" label="النوع / الاستخدام" defaultValue={editing.type} required/></FormSection><FormSection title="المواصفات"><Field name="mfr" label="الشركة المصنعة" defaultValue={editing.mfr??''}/><Field name="model" label="الموديل" defaultValue={editing.model??''}/><Field name="year" label="سنة الصنع" type="number" defaultValue={String(editing.year??'')}/><Select name="fuel" label="نوع الوقود" value={editing.fuel??''} options={['ديزل','بنزين','غاز','كهرباء','هجين','غير محدد']}/><Select name="mt" label="نوع العداد" value={editing.mt} options={['كم','ساعة','عداد مركب']}/><Field name="meter" label="قراءة العداد الحالية" type="number" defaultValue={String(editing.meter??0)}/></FormSection><FormSection title="الملكية والحالة"><Select name="own" label="الملكية" value={editing.own} options={['مملوك','مستأجر']}/><Select name="status" label="حالة التشغيل" value={editing.status} options={['متاح','يعمل','مخصص لمشروع','متوقف مؤقتًا','تحت الصيانة','خارج الخدمة']}/><Select name="cond" label="الحالة الفنية" value={editing.cond} options={['سليم','يحتاج صيانة','تالف']}/><Field name="plate" label="رقم اللوحة / التسجيل" defaultValue={editing.plate??''}/></FormSection><FormSection title="القيمة والتكلفة"><Field name="std" label="الاستهلاك المعياري" type="number" defaultValue={String(editing.std??0)}/><Field name="capex" label="تكلفة الاقتناء" type="number" defaultValue={String(editing.capex??0)}/><Field name="life" label="العمر الإنتاجي (سنة)" type="number" defaultValue={String(editing.life??0)}/><Field name="resid" label="القيمة المتبقية" type="number" defaultValue={String(editing.resid??0)}/></FormSection><FormSection title="التشغيل والارتباط"><Select name="proj" label="المشروع الحالي" value={editing.proj??''} options={[{v:'',l:'المقر / بدون مشروع'},...projects.map(p=>({v:p.id,l:`${p.name} — ${p.code}`}))]}/><Field name="drv" label="السائق / المشغل" defaultValue={editing.drv??''}/><Field name="cust" label="العميل / المستخدم" defaultValue={editing.cust??''}/><Field name="contract" label="مرجع العقد" defaultValue={editing.contract??''}/></FormSection><FormSection title="التواريخ والمستندات"><Field name="buy" label="تاريخ الشراء" type="date" defaultValue={editing.buy??''}/><Field name="lic" label="انتهاء الترخيص" type="date" defaultValue={editing.lic??''}/><Field name="ins" label="انتهاء التأمين" type="date" defaultValue={editing.ins??''}/></FormSection><label className="field field-full"><span>ملاحظات الأصل</span><textarea name="notes" defaultValue={editing.notes??''} rows={4} placeholder="الحالة، التجهيزات، الملاحظات الفنية أو أي بيانات إضافية مهمة..."/></label></div><div className="modal-actions"><div>{formError&&<div className="form-error" role="alert">{formError}</div>}</div><div className="head-actions"><button type="button" className="secondary-button" onClick={()=>setEditing(null)} disabled={saving}>إلغاء</button><button type="submit" className="primary-button" disabled={saving}>{saving?'جارٍ الحفظ...':'حفظ'}</button></div></div></form></div>}
  </div>
}

function Field({name,label,defaultValue,type='text',required=false}:{name:string;label:string;defaultValue:string;type?:string;required?:boolean}){return <label className="field"><span>{label}{required&&<em className="required-mark"> *</em>}</span><input name={name} type={type} defaultValue={defaultValue} required={required} min={type==='number'?0:undefined} step={type==='number'?'any':undefined}/></label>}
function Select({name,label,value,options}:{name:string;label:string;value:string;options:Array<string|{v:string;l:string}>}){return <label className="field"><span>{label}</span><select name={name} defaultValue={value}>{options.map(o=>typeof o==='string'?<option key={o} value={o}>{o}</option>:<option key={o.v} value={o.v}>{o.l}</option>)}</select></label>}
function Detail({label,value}:{label:string;value:ReactNode}){return <div className="detail-item"><span>{label}</span><strong>{value}</strong></div>}
const fmt=(n:number)=>new Intl.NumberFormat('ar-EG',{maximumFractionDigits:0}).format(n)
const fmtDate=(v?:string)=>v?new Intl.DateTimeFormat('ar-EG',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(v)):'—'
