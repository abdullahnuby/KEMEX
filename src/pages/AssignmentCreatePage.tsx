import { useMemo, useState, type FormEvent } from 'react'
import { ArrowRight, ClipboardCheck, Truck } from 'lucide-react'
import type { Asset, AssetStatus, Project } from '../types/tfms'
import { ReferenceValue } from '../components/ReferenceValue'
import { PageHeader } from '../shared/ui'
import { PrintRecordButton } from '../shared/printing'

import { APP_LOCALE } from '../shared/formatters/locale'
type RecordLike=Record<string,unknown>

type Props={
  request:RecordLike|null
  assets:Asset[]
  projects:Project[]
  onSaveAssignment:(record:RecordLike)=>Promise<void>
  onSaveAsset:(asset:Asset)=>Promise<void>
  onUpdateRequest:(request:RecordLike)=>Promise<void>
  userName:string
  onBack:()=>void
}

export function AssignmentCreatePage({request,assets,projects,onSaveAssignment,onSaveAsset,onUpdateRequest,userName,onBack}:Props){
  const [assetId,setAssetId]=useState('')
  const [cust,setCust]=useState(request?.req?String(request.req):'')
  const [from,setFrom]=useState(new Date().toISOString().slice(0,10))
  const [months,setMonths]=useState('1')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [saved,setSaved]=useState<{assignment:RecordLike;asset:Asset}|null>(null)

  const available=useMemo(()=>assets.filter(a=>a.status==='متاح'||a.status==='محجوز'),[assets])
  const selected=assets.find(a=>a.id===assetId)

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault(); if(busy)return
    setError('')
    if(!request){setError('الطلب غير موجود أو تعذر تحميله.');return}
    if(!selected){setError('اختر أصلًا متاحًا للتخصيص.');return}
    const duration=Math.max(1,Number(months)||1)
    setBusy(true)
    try{
      const number=`AS-${300+Date.now().toString().slice(-6)}`
      const assignment={
        id:`AS-${Date.now()}`,
        number,
        asset:selected.id,
        proj:String(request.proj??selected.proj??''),
        from,
        toP:addDays(from,duration*30),
        toA:'',
        cust:cust.trim()||String(request.req??''),
        meterStart:selected.meter,
        rate:'',
        status:'ساري',
        req:String(request.id),
        notes:`تخصيص وفق الطلب ${String(request.number??request.id)}`,
      }
      const nextRequest={
        ...request,
        status:'قيد التنفيذ',
        apprs:[...(Array.isArray(request.apprs)?request.apprs:[]),{by:userName,act:`اعتماد التخصيص — ${number}`}],
      }
      const nextAsset: Asset = { ...selected, status: (selected.own === 'مملوك' ? 'مخصص لمشروع' : 'يعمل') as AssetStatus, proj: String(request.proj ?? selected.proj ?? '') }
      await onSaveAssignment(assignment)
      await onSaveAsset(nextAsset)
      await onUpdateRequest(nextRequest)
      setSaved({assignment,asset:selected})
    }catch(err){setError(err instanceof Error?err.message:'تعذر حفظ التخصيص. حاول مرة أخرى.')}finally{setBusy(false)}
  }

  return <div>
    <PageHeader title="تخصيص أصل" description={request?<>للطلب {String(request.number??request.id)} — <ReferenceValue field="proj" value={request.proj} lookups={{projects}}/></>:'الطلب غير متاح'} action={<button className="secondary-button" type="button" onClick={onBack}><ArrowRight size={16}/> العودة لطلبات المعدات</button>} />
    {!request?<section className="panel placeholder-panel"><div className="placeholder-icon"><ClipboardCheck size={28}/></div><h2>تعذر تحميل الطلب</h2><p>الطلب المطلوب غير موجود في البيانات الحالية.</p><button className="primary-button" type="button" onClick={onBack}>العودة</button></section>:
    saved?<section className="panel assignment-form-panel"><div className="section-title"><div className="section-title-icon"><ClipboardCheck size={17}/></div><div><strong>تم تسجيل التسليم بنجاح</strong><small>اطبع سند التسليم ووقّع عليه مع المسؤول عن العهدة قبل إنهاء الإجراء.</small></div></div>
      <PrintRecordButton documentTitle="سند تسليم عهدة" documentNumber={String(saved.assignment.number||'')} documentDate={String(saved.assignment.from||'')} documentStatus="ساري" meta={[{label:'الأصل',value:`${saved.asset.name} — ${saved.asset.code}`},{label:'المسؤول عن العهدة',value:String(saved.assignment.cust||'—')},{label:'عداد التسليم',value:`${Number(saved.assignment.meterStart||0).toLocaleString(APP_LOCALE)} — ${saved.asset.mt}`},{label:'تاريخ نهاية الخطة',value:String(saved.assignment.toP||'—')}]} signatures={[{label:'المسلِّم'},{label:'المستلم / المسؤول عن العهدة'},{label:'اعتماد الإدارة'}]} footerNote="سند تسليم أصل صادر من نظام KEMEX — يُحتفظ به كإثبات استلام العهدة."><div className="print-section-title">حالة الأصل عند التسليم</div><table><tbody><tr><th>البند</th><th>القيمة</th></tr><tr><td>حالة الأصل</td><td>{saved.asset.cond||'—'}</td></tr><tr><td>الفئة / النوع</td><td>{`${saved.asset.cat} — ${saved.asset.type}`}</td></tr><tr><td>ملاحظات التخصيص</td><td>{String(saved.assignment.notes||'—')}</td></tr></tbody></table></PrintRecordButton>
      <div className="modal-actions form-span-all"><button type="button" className="primary-button" onClick={onBack}>إنهاء والعودة لطلبات المعدات</button></div>
    </section>:
    <section className="panel assignment-form-panel"><div className="section-title"><div className="section-title-icon"><Truck size={17}/></div><div><strong>تسجيل التسليم</strong><small>اختر أصلًا متاحًا وحدد بداية ومدة التخصيص كما في مسار النظام المرجعي.</small></div></div>
      {error&&<div className="global-error" role="alert">{error}</div>}
      {!available.length?<div className="empty"><strong>لا توجد أصول متاحة حاليًا</strong><span>يلزم إجراء الاستئجار وفق الصلاحيات قبل إتمام هذا الطلب.</span></div>:
      <form className="form-grid" onSubmit={submit}>
        <label className="field"><span>الطلب</span><div className="workflow-status-readonly"><strong>{String(request.number??request.id)}</strong><small>{String(request.type??'')} · الكمية {String(request.qty??'—')}</small></div></label>
        <label className="field"><span>الأصل المتاح فقط *</span><select value={assetId} onChange={e=>setAssetId(e.target.value)} required><option value="">— اختر الأصل —</option>{available.map(a=><option key={a.id} value={a.id}>{a.name} — {a.code} — العداد {a.meter}</option>)}</select></label>
        <label className="field"><span>المسؤول عن العهدة</span><input value={cust} onChange={e=>setCust(e.target.value)} /></label>
        <label className="field"><span>تاريخ بداية التخصيص *</span><input type="date" value={from} onChange={e=>setFrom(e.target.value)} required /></label>
        <label className="field"><span>المدة المخططة (شهر) *</span><input type="number" min="1" step="1" value={months} onChange={e=>setMonths(e.target.value)} required /></label>
        {selected&&<label className="field"><span>عداد التسليم</span><div className="workflow-status-readonly"><strong>{selected.meter.toLocaleString(APP_LOCALE)}</strong><small>{selected.mt}</small></div></label>}
        <div className="modal-actions form-span-all"><button type="button" className="secondary-button" disabled={busy} onClick={onBack}>إلغاء</button><button className="primary-button" disabled={busy}>{busy?'جارٍ تسجيل التخصيص...':'اعتماد التخصيص وتسجيل التسليم'}</button></div>
      </form>}
    </section>}
  </div>
}

function addDays(value:string,days:number){const d=new Date(`${value}T00:00:00`);d.setDate(d.getDate()+days);return d.toISOString().slice(0,10)}
