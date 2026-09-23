import { useMemo, useState, type FormEvent } from 'react'
import { Plus, ShieldCheck, X } from 'lucide-react'
import type { Asset, Driver } from '../types/tfms'
import { Button, DataTable, EmptyState, PageHeader, StatusBadge } from '../components/ui'
import { FormSection, OperationalSummaryStrip } from '../shared/ui'

type Props = {
  drivers: Driver[]
  assets: Asset[]
  canEdit: boolean
  onSave: (record: Record<string, unknown>) => Promise<void>
}

/** Enterprise driver/operator registry with direct reverse-link to the assigned asset. */
export function DriversPage({ drivers, assets, canEdit, onSave }: Props) {
  const [editing, setEditing] = useState<Driver | null>(null)
  const [busy, setBusy] = useState(false)
  const rows = useMemo(() => drivers.map(driver => ({
    ...driver,
    currentAsset: assets.find(asset => asset.drv === driver.id)?.name ?? driver.cur ?? '',
    currentAssetId: assets.find(asset => asset.drv === driver.id)?.code ?? '',
  })), [drivers, assets])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return
    const fd = new FormData(event.currentTarget)
    const next = {
      ...editing,
      code: String(fd.get('code') ?? '').trim(),
      name: String(fd.get('name') ?? '').trim(),
      phone: String(fd.get('phone') ?? '').trim(),
      kind: String(fd.get('kind') ?? '').trim(),
      employeeNo: String(fd.get('employeeNo') ?? '').trim(),
      shift: String(fd.get('shift') ?? '').trim(),
      licNo: String(fd.get('licNo') ?? '').trim(),
      licType: String(fd.get('licType') ?? '').trim(),
      licExp: String(fd.get('licExp') ?? ''),
      medicalExp: String(fd.get('medicalExp') ?? ''),
      cur: String(fd.get('cur') ?? '').trim(),
      joinDate: String(fd.get('joinDate') ?? ''),
      status: String(fd.get('status') ?? 'نشط'),
    }
    if (!next.code || !next.name || !next.licNo) return
    setBusy(true)
    try { await onSave(next); setEditing(null) } finally { setBusy(false) }
  }

  const driverCounts = useMemo(() => ({
    total: rows.length,
    active: rows.filter(row => row.status === 'نشط').length,
    assigned: rows.filter(row => Boolean(row.currentAsset)).length,
    expiring: rows.filter(row => row.licExp && ((new Date(row.licExp).getTime() - Date.now()) / 86400000) <= 30).length,
  }), [rows])

  const columns = [
    { id:'code', header:'الكود', sortValue:(row:typeof rows[number])=>row.code, render:(row:typeof rows[number])=><strong>{row.code}</strong> },
    { id:'name', header:'الاسم', sortValue:(row:typeof rows[number])=>row.name, render:(row:typeof rows[number])=>row.name },
    { id:'kind', header:'التخصص', sortValue:(row:typeof rows[number])=>row.kind ?? '', render:(row:typeof rows[number])=>row.kind || '—' },
    { id:'phone', header:'التواصل', sortValue:(row:typeof rows[number])=>row.phone ?? '', render:(row:typeof rows[number])=>row.phone || '—' },
    { id:'licExp', header:'انتهاء الرخصة', sortValue:(row:typeof rows[number])=>row.licExp ?? '', render:(row:typeof rows[number])=>row.licExp ? <StatusBadge>{expiryStatus(row.licExp)}</StatusBadge> : '—' },
    { id:'currentAsset', header:'الأصل الحالي', sortValue:(row:typeof rows[number])=>row.currentAsset, render:(row:typeof rows[number])=>row.currentAsset ? <span>{row.currentAsset} <small>({row.currentAssetId})</small></span> : 'غير مرتبط' },
    { id:'status', header:'الحالة', sortValue:(row:typeof rows[number])=>String(row.status ?? 'نشط'), render:(row:typeof rows[number])=><StatusBadge>{String(row.status ?? 'نشط')}</StatusBadge> },
  ]

  return <div className="space-y-6">
    <PageHeader title="السائقون والمشغلون" description="سجل العاملين التشغيليين والرخص والتكليفات الحالية مع ربط مباشر بالأصول." action={canEdit ? <Button onClick={()=>setEditing({id:`DRV-${Date.now()}`,code:'',name:'',phone:'',kind:'',licNo:'',licExp:'',cur:'',status:'نشط'})}><Plus size={16}/> إضافة سائق / مشغل</Button> : undefined}/>
    <OperationalSummaryStrip items={[
      { id: 'total', label: 'إجمالي السائقين والمشغلين', value: driverCounts.total },
      { id: 'active', label: 'نشط', value: driverCounts.active, tone: 'success' },
      { id: 'assigned', label: 'مرتبط بأصل', value: driverCounts.assigned },
      { id: 'expiring', label: 'رخصة خلال 30 يوم', value: driverCounts.expiring, tone: driverCounts.expiring ? 'alert' : 'default' },
    ]} />
    {!rows.length ? <EmptyState title="لا توجد سجلات سائقين ومشغلين" description="لم يتم تسجيل أي سائق أو مشغل فعلي في قاعدة البيانات حتى الآن." action={canEdit ? <Button variant="secondary" onClick={()=>setEditing({id:`DRV-${Date.now()}`,code:'',name:'',phone:'',kind:'',licNo:'',licExp:'',cur:'',status:'نشط'})}>إضافة أول سجل</Button> : undefined}/> : <DataTable rows={rows} columns={columns} rowKey={row=>row.id} pageSize={12} pageSizeOptions={[12, 24, 48]} searchPlaceholder="بحث بالاسم أو الكود أو التخصص..." enableColumnVisibility columnVisibilityStorageKey="kemex.drivers.columns.v1" exportable exportFileName="KEMEX-drivers" filters={[{id:'status',label:'الحالة',options:[{value:'نشط',label:'نشط'},{value:'غير نشط',label:'غير نشط'},{value:'إجازة',label:'إجازة'},{value:'موقوف',label:'موقوف'}],getValue:row=>String(row.status??'نشط')}]}/>}
    {rows.length>0 && <div className="ds-context-strip"><ShieldCheck size={16}/><span>انتهاء الرخصة والكشف الطبي تتم متابعتهما من محرك التنبيهات المركزي.</span></div>}
    {editing&&<div className="modal-backdrop" onMouseDown={()=>!busy&&setEditing(null)}><form className="modal-card wide form-modal-premium" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}>
      <div className="modal-head"><div><div className="form-kicker">ملف تشغيلي</div><h2>{drivers.some(item=>item.id===editing.id)?'تعديل سائق / مشغل':'إضافة سائق / مشغل'}</h2><p>البيانات الوظيفية والرخصة والتكليف الحالي.</p></div><button type="button" className="icon-button" onClick={()=>!busy&&setEditing(null)} aria-label="إغلاق"><X size={18}/></button></div>
      <div className="form-sections"><FormSection title="البيانات الأساسية"><Field name="code" label="الكود" value={editing.code} required/><Field name="name" label="الاسم" value={editing.name} required/><Field name="phone" label="الهاتف" value={editing.phone ?? ''}/><Field name="kind" label="التخصص" value={editing.kind ?? ''}/></FormSection>
      <FormSection title="البيانات الوظيفية"><Field name="employeeNo" label="رقم الموظف" value={String((editing as Driver & Record<string,unknown>).employeeNo ?? '')}/><Field name="shift" label="الوردية" value={String((editing as Driver & Record<string,unknown>).shift ?? '')}/><Field name="joinDate" label="تاريخ بدء العمل" type="date" value={String((editing as Driver & Record<string,unknown>).joinDate ?? '')}/><Select name="status" label="الحالة" value={String(editing.status ?? 'نشط')} options={['نشط','غير نشط','إجازة','موقوف']}/></FormSection>
      <FormSection title="الرخصة والتأهيل"><Field name="licNo" label="رقم الرخصة / الشهادة" value={editing.licNo ?? ''} required/><Field name="licType" label="نوع الرخصة" value={String((editing as Driver & Record<string,unknown>).licType ?? '')}/><Field name="licExp" label="تاريخ انتهاء الرخصة" type="date" value={editing.licExp ?? ''}/><Field name="medicalExp" label="انتهاء الكشف الطبي" type="date" value={String((editing as Driver & Record<string,unknown>).medicalExp ?? '')}/></FormSection>
      <FormSection title="التكليف"><Field name="cur" label="الوصف الحالي للتكليف" value={editing.cur ?? ''}/></FormSection></div>
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>!busy&&setEditing(null)}>إلغاء</button><button className="primary-button" disabled={busy}>{busy?'جارٍ الحفظ...':'حفظ السجل'}</button></div>
    </form></div>}
  </div>
}

function expiryStatus(value:string){
  const days = Math.ceil((new Date(value).getTime() - Date.now()) / 86400000)
  if (days < 0) return 'منتهية'
  if (days <= 30) return `متبقي ${days} يوم`
  return 'سارية'
}
function Field({name,label,value,type='text',required}:{name:string;label:string;value:string;type?:string;required?:boolean}){return <label className="field"><span>{label}{required&&' *'}</span><input name={name} type={type} defaultValue={value} required={required} /></label>}
function Select({name,label,value,options}:{name:string;label:string;value:string;options:string[]}){return <label className="field"><span>{label}</span><select name={name} defaultValue={value}>{options.map(v=><option key={v}>{v}</option>)}</select></label>}
