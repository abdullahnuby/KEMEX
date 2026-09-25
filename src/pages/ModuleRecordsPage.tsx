import { useMemo, useState, type FormEvent } from 'react'
import { Ban, Check, Download, Eye, Flag, Info, Pencil, Plus, RotateCcw, Search, Send, ShoppingCart, Trash2, X } from 'lucide-react'
import { MODULE_CONFIG, canWriteModule, type ModuleField, type WorkflowAction } from '../config/modules'
import { canApproveModule, canDeleteModule, canExportModule } from '../config/app'
import type { Asset, Driver, Project, User, WorkOrder } from '../types/tfms'
import { ReferenceValue } from '../components/ReferenceValue'
import { displayReference, referenceOptions, type ReferenceLookups } from '../utils/referenceLabels'
import { Button, DataTable, PageHeader, StatusBadge } from '../components/ui'
import { FormSection, OperationalSummaryStrip } from '../shared/ui'

function valueText(v:unknown){if(v===null||v===undefined||v==='')return '—';if(typeof v==='object')return JSON.stringify(v);return String(v)}

export function ModuleRecordsPage({module,records,onSave,onDelete,onWorkflow,onNavigate,user,assets,projects,drivers,workOrders,moduleData}:{
  module:string;records:Record<string,unknown>[];onSave:(record:Record<string,unknown>)=>Promise<void>|void;onDelete:(id:string)=>Promise<void>|void;
  onWorkflow?:(record:Record<string,unknown>,previous:Record<string,unknown>,action:WorkflowAction)=>Promise<void>|void;onNavigate?:(route:string)=>void;user:User;
  assets?:Asset[];projects?:Project[];drivers?:Driver[];workOrders?:WorkOrder[];moduleData?:Record<string,Record<string,unknown>[]>
}){
  const cfg=MODULE_CONFIG[module]
  if(!cfg)return <section className="panel"><div className="empty">الوحدة المطلوبة غير معرفة.</div></section>
  const workflow=cfg.workflow
  const lookups:ReferenceLookups={assets,projects,drivers,workOrders,records:moduleData}
  const [q,setQ]=useState('');const [statusFilter,setStatusFilter]=useState('all');const [editing,setEditing]=useState<Record<string,unknown>|null>(null);const [viewing,setViewing]=useState<Record<string,unknown>|null>(null);const [busy,setBusy]=useState(false);const [actionError,setActionError]=useState('');const [deleting,setDeleting]=useState<string|null>(null)
  const statusOf=(r:Record<string,unknown>)=>String(r.status??'').trim().toLowerCase()
  const statusGroup=(r:Record<string,unknown>)=>{const s=statusOf(r);if(/رفض|مرفوض|مرفوضة|rejected|declined/.test(s))return 'rejected';if(/اعتماد|معتمد|معتمدة|موافق|approved|complete|مكتمل|مكتملة|منته|منتهي|مغلق|مغلقة|closed|أمر شراء/.test(s))return 'approved';if(/انتظار|معلق|مراجعة|قيد|pending|review|waiting|جديد|new|مقدمة|مسودة|معادة|معاد/.test(s))return 'pending';return 'other'}
  const counts=useMemo(()=>({all:records.length,pending:records.filter(r=>statusGroup(r)==='pending').length,approved:records.filter(r=>statusGroup(r)==='approved').length,rejected:records.filter(r=>statusGroup(r)==='rejected').length}),[records])
  const rows=useMemo(()=>records.filter(r=>statusFilter==='all'||statusGroup(r)===statusFilter),[records,statusFilter])
  const columns=(cfg.display??cfg.fields.map(f=>f.key)).slice(0,7).map(k=>cfg.fields.find(f=>f.key===k)!).filter(Boolean)
  const canEdit=!cfg.readOnly&&canWriteModule(module,user.role)
  const canDelete=canEdit&&canDeleteModule(module,user.role)
  const canApprove=canApproveModule(module,user.role)

  function availableActions(record:Record<string,unknown>){if(!workflow)return [];const status=String(record[workflow.statusField??'status']??'');return workflow.actions.filter(a=>a.roles.includes(user.role)&&a.from.includes(status)&&(a.key==='approve'||a.key==='reject'||a.key==='po'?canApprove:canEdit))}
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!editing||busy)return;setActionError('');setBusy(true);const fd=new FormData(e.currentTarget);const next={...editing};try{cfg.fields.forEach(f=>{if(workflow&&f.key===(workflow.statusField??'status'))return;const raw=String(fd.get(f.key)??'').trim();if(f.type==='number'){if(raw===''){next[f.key]='';return};const n=Number(raw);if(!Number.isFinite(n)||n<0)throw new Error(`قيمة غير صالحة في حقل ${f.label}؛ أدخل رقمًا غير سالب.`);next[f.key]=n;return}next[f.key]=raw});if(workflow&&!next.status)next.status=workflow.createStatus??'';await onSave(next);setEditing(null)}catch(err){setActionError(err instanceof Error?err.message:'تعذر حفظ السجل. حاول مرة أخرى.')}finally{setBusy(false)}}
  function newRecord(){const x:Record<string,unknown>={id:`${module.toUpperCase()}-${Date.now()}`};cfg.fields.forEach(f=>x[f.key]='');if(workflow?.createStatus)x[workflow.statusField??'status']=workflow.createStatus;if(module==='requests'){x.number=`REQ-${500+records.length+1}`;x.date=new Date().toISOString().slice(0,10);x.req=user.name;x.apprs=[];x.reason=''}if(module==='assignments')x.number=`AS-${300+records.length+1}`;if(module==='operations')x.src='ويب';if(module==='trips')x.number=`TRP-${100+records.length+1}`;if(module==='purchases'){x.number=`PR-${100+records.length+1}`;x.date=new Date().toISOString().slice(0,10);x.req=user.name;x.po='';x.supplier=''}setActionError('');setEditing(x)}
  async function runWorkflow(record:Record<string,unknown>,action:WorkflowAction){if(busy)return;if(action.kind==='navigate'&&action.route&&onNavigate){onNavigate(`${action.route}/${encodeURIComponent(String(record.id))}`);setViewing(null);return}const statusField=workflow?.statusField??'status';const current=String(record[statusField]??'');if(!action.from.includes(current)){setActionError('حالة السجل تغيّرت؛ أعد تحميل الصفحة قبل تنفيذ الإجراء.');return}if(action.tone==='danger'&&!window.confirm(`هل تريد تنفيذ «${action.label}» على هذا السجل؟`))return;setActionError('');setBusy(true);const next={...record,[statusField]:action.to};const trail=Array.isArray(record.apprs)?record.apprs:[];next.apprs=[...trail,{by:user.name,act:action.label}];if(module==='requests'&&action.key==='reject')next.reason=`رفض بواسطة ${user.name}`;if(module==='purchases'&&action.key==='po'&&!String(next.po??'').trim())next.po=`PO-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;try{if(onWorkflow)await onWorkflow(next,record,action);else await onSave(next);setViewing(null)}catch(err){setActionError(err instanceof Error?err.message:'تعذر تنفيذ الإجراء. حاول مرة أخرى.')}finally{setBusy(false)}}
  function exportCsv(){const headers=cfg.fields.map(c=>c.label);const escape=(value:unknown)=>{let text=String(value??'').replace(/\r?\n/g,' ');if(/^[=+@\-\t\r]/.test(text))text="'"+text;return `"${text.replace(/"/g,'""')}"`};const csv='\uFEFF'+[headers.map(escape).join(','),...rows.map(row=>cfg.fields.map(c=>escape(displayReference(c.key,row[c.key],lookups))).join(','))].join('\r\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`KEMEX-${module}-${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000)}

  return <div className="space-y-6 enterprise-module-page">
    <PageHeader
      title={cfg.title}
      description={cfg.description}
      meta={<span className="enterprise-page-count">{counts.all} سجل</span>}
      action={(
        <>
          <Button variant="secondary" icon={<Download size={16}/>} onClick={exportCsv} disabled={!rows.length || !canExportModule(module,user.role)}>تصدير CSV</Button>
          {canEdit ? <Button icon={<Plus size={16}/>} onClick={newRecord}>إضافة سجل</Button> : null}
        </>
      )}
    />
    {actionError&&<div className="global-error" role="alert">{actionError}</div>}
    {workflow ? <WorkflowQueueBanner total={counts.all} pending={counts.pending} actionable={records.filter(record => availableActions(record).length > 0).length} label={cfg.title} /> : null}
    <OperationalSummaryStrip items={[
      { id:'all', label:'إجمالي السجلات', value:counts.all },
      { id:'pending', label:'قيد الإجراء', value:counts.pending, tone:counts.pending?'alert':'default' },
      { id:'approved', label:'معتمد / مكتمل', value:counts.approved, tone:'success' },
      { id:'rejected', label:'مرفوض', value:counts.rejected, tone:counts.rejected?'alert':'default' },
    ]} />
    <section className="space-y-4"><div className="flex flex-wrap gap-2" role="group" aria-label="تصفية حسب الحالة">{[{key:'all',label:`الكل (${counts.all})`},{key:'pending',label:`قيد الإجراء (${counts.pending})`},{key:'approved',label:`معتمد/مكتمل (${counts.approved})`},{key:'rejected',label:`مرفوض (${counts.rejected})`}].map(item=><button key={item.key} type="button" aria-pressed={statusFilter===item.key} className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${statusFilter===item.key?'border-primary-600 bg-primary-700 text-white':'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`} onClick={()=>setStatusFilter(item.key)}>{item.label}</button>)}</div>
      <DataTable
        rows={rows}
        columns={[
          ...columns.map(c=>({ id:c.key, header:c.label, render:(r:Record<string,unknown>)=>c.key==='status'?<StatusBadge tone={statusGroup(r)==='approved'?'emerald':statusGroup(r)==='rejected'?'red':statusGroup(r)==='pending'?'amber':'blue'}>{valueText(r[c.key])}</StatusBadge>:<ReferenceValue field={c.key} value={r[c.key]} lookups={lookups} />, sortValue:(r:Record<string,unknown>)=>displayReference(c.key,r[c.key],lookups) })),
          { id:'view', header:'عرض', render:(r:Record<string,unknown>)=><Button variant="ghost" size="sm" icon={<Eye size={15}/>} onClick={()=>setViewing({...r})}>عرض</Button> },
          ...((canEdit || Boolean(workflow?.actions.length)) ? [{
            id: 'actions',
            header: 'إجراءات',
            render: (r: Record<string, unknown>) => {
              const actions = availableActions(r)
              return (
                <div className="flex flex-wrap gap-2">
                  {actions.map(a => <WorkflowButton key={a.key} action={a} disabled={busy} onClick={() => void runWorkflow(r, a)} />)}
                  {canEdit && <>
                    <Button variant="ghost" size="sm" icon={<Pencil size={15} />} onClick={() => setEditing({ ...r })}>تعديل</Button>
                    {canDelete && <Button variant="danger" size="sm" icon={<Trash2 size={15} />} disabled={deleting === String(r.id)} onClick={() => {
                      if (!r.id) { setActionError('لا يمكن حذف سجل بدون معرّف.'); return }
                      if (window.confirm('هل تريد حذف هذا السجل نهائيًا؟')) {
                        setActionError(''); setDeleting(String(r.id))
                        void Promise.resolve(onDelete(String(r.id)))
                          .catch((err: unknown) => setActionError(err instanceof Error ? err.message : 'تعذر حذف السجل. حاول مرة أخرى.'))
                          .finally(() => setDeleting(null))
                      }
                    }}>{deleting === String(r.id) ? 'جارٍ الحذف…' : 'حذف'}</Button>}
                  </>}
                </div>
              )
            }
          }] : []),
        ]}
        rowKey={r=>String(r.id ?? '')}
        searchable
        search={q}
        onSearchChange={setQ}
        searchableText={r=>cfg.fields.map(f=>displayReference(f.key,r[f.key],lookups)).join(' ')+` ${String(r.id??'')}`}
        emptyState={<div className="px-6 py-16 text-center text-sm font-medium text-gray-500">لا توجد بيانات مطابقة.</div>}
        enableColumnVisibility
        columnVisibilityStorageKey={`kemex.${module}.columns.v1`}
        pageSizeOptions={[10, 25, 50]}
        mobilePresentation="auto"
        printTitle={cfg.title}
      />
    </section>
    {viewing&&<div className="modal-backdrop" onMouseDown={()=>!busy&&setViewing(null)}><section className="modal-card wide" role="dialog" aria-modal="true" aria-label={`تفاصيل ${cfg.title}`} onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><h2>تفاصيل السجل</h2><p>{cfg.title} · <strong className="record-human-title">{recordHumanTitle(viewing, lookups)}</strong></p></div><button type="button" className="icon-button" disabled={busy} onClick={()=>!busy&&setViewing(null)} aria-label="إغلاق"><X size={18}/></button></div><div className="detail-grid">{cfg.fields.map(field=><div className="detail-item" key={field.key}><span>{field.label}</span><strong><ReferenceValue field={field.key} value={viewing[field.key]} lookups={lookups}/></strong></div>)}</div>{availableActions(viewing).length>0&&<div className="workflow-panel"><div className="workflow-panel-title"><span>الإجراء التالي</span><small>الدور الحالي: {user.name}</small></div><div className="workflow-actions">{availableActions(viewing).map(a=><WorkflowButton key={a.key} action={a} disabled={busy} onClick={()=>runWorkflow(viewing,a)}/>)}</div></div>}<div className="modal-actions"><button type="button" className="secondary-button" disabled={busy} onClick={()=>!busy&&setViewing(null)}>إغلاق</button>{canEdit&&<button type="button" className="primary-button" disabled={busy} onClick={()=>{setEditing({...viewing});setViewing(null)}}><Pencil size={15}/> تعديل السجل</button>}</div></section></div>}
    {editing&&<div className="modal-backdrop" onMouseDown={()=>!busy&&setEditing(null)}><form className="modal-card wide form-modal-premium" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><div className="form-kicker">{editing.id&&records.some(r=>r.id===editing.id)?'تعديل سجل':'إضافة سجل'}</div><h2>{cfg.title}</h2><p>{cfg.formIntro||cfg.description}</p></div><button type="button" className="icon-button" disabled={busy} onClick={()=>!busy&&setEditing(null)} aria-label="إغلاق"><X size={18}/></button></div>{actionError&&<div className="global-error" role="alert">{actionError}</div>}<div className="form-sections">{groupFields(cfg.fields).map(group=><FormSection key={group.title} title={group.title} description={groupHint(group.title)}><>{group.fields.map(f=>workflow&&f.key===(workflow.statusField??'status')?<StatusField key={f.key} label={f.label} value={editing[f.key]}/>:<Field key={f.key} field={f} value={editing[f.key]} lookups={lookups}/>)}</></FormSection>)}</div><div className="modal-actions"><button type="button" className="secondary-button" disabled={busy} onClick={()=>!busy&&setEditing(null)}>إلغاء</button><button className="primary-button" disabled={busy}>{busy?'جارٍ الحفظ...':'حفظ السجل'}</button></div></form></div>}
  </div>
}


function recordHumanTitle(record:Record<string,unknown>, lookups:ReferenceLookups){
  const referenceCandidates=['asset','assetId','proj','project','veh','vehicle','driver','drv','item','part','sparepart','wo','workorder','contract','customer','cust','ref','link']
  for(const key of referenceCandidates){
    const value=record[key]
    if(value===undefined||value===null||value==='')continue
    const resolved=displayReference(key,value,lookups)
    if(resolved && resolved!=='—' && resolved!==String(value)) return resolved
  }
  const candidates=['name','title','desc','description','number','code','id']
  for(const key of candidates){
    const value=String(record[key]??'').trim()
    if(value)return value
  }
  return 'سجل'
}

function Field({field,value,lookups}:{field:ModuleField;value:unknown;lookups:ReferenceLookups}){const v=value==null?'':String(value);const refs=referenceOptions(field.key,lookups);const control=field.type==='textarea'?<textarea name={field.key} defaultValue={v} rows={4} required={field.required} placeholder={field.placeholder}/>:refs.length>0?<select name={field.key} defaultValue={v} required={field.required}><option value="">— اختر —</option>{refs.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>:field.type==='select'?<select name={field.key} defaultValue={v} required={field.required}><option value="">— اختر —</option>{(field.options??[]).map(o=><option key={o} value={o}>{o}</option>)}</select>:<input name={field.key} type={field.type??'text'} defaultValue={v} required={field.required} placeholder={field.placeholder} min={field.type==='number'?0:undefined} step={field.type==='number'?'any':undefined}/>;return <label className={`field ${field.full?'field-full':''}`}><span>{field.label}{field.required&&' *'}</span>{control}{field.help&&<small className="field-help">{field.help}</small>}</label>}

function groupFields(fields:ModuleField[]){const groups=new Map<string,ModuleField[]>();for(const field of fields){const title=field.section||'البيانات';const arr=groups.get(title)||[];arr.push(field);groups.set(title,arr)}return Array.from(groups.entries()).map(([title,fields])=>({title,fields}))}
function groupHint(title:string){const hints:Record<string,string>={'البيانات الأساسية':'المعلومات التعريفية التي يعتمد عليها السجل.','الربط':'حدد الأصل أو المشروع أو المرجع المرتبط بالسجل.','الربط والتشغيل':'اربط السجل بموقع الاستخدام والمشروع والتشغيل.','الربط والتحميل':'حدد المشروع وأساس التحميل والعداد.','تفاصيل الاحتياج':'حدد الاحتياج الفعلي والكميات والفترة المطلوبة.','الاعتماد':'معلومات دورة الاعتماد والحالة الحالية.','التكلفة':'القيم المالية ومكونات التكلفة.','الميزانية':'مصدر المبلغ والبند المالي المرتبط.','التوريد':'تفاصيل المورد والعروض وشروط الشراء.','المادة':'بيانات المادة أو القطعة ومصدرها.','التركيب':'بيانات تركيب الأصل أو الإطار ومكانه وعداد التركيب.','السداد':'بيانات التحصيل أو السداد وطريقته.','التواريخ':'التواريخ التي تحكم الاستحقاق والدورة المالية.','ملاحظات':'تفاصيل إضافية تساعد المراجعة والتنفيذ.'};return hints[title]||'أكمل البيانات المطلوبة قبل الحفظ.'}

function StatusField({label,value}:{label:string;value:unknown}){return <div className="field"><span>{label}</span><div className="workflow-status-readonly"><strong>{valueText(value)}</strong><small>تتغير الحالة من أزرار دورة الاعتماد فقط</small></div></div>}
function WorkflowButton({action,disabled,onClick}:{action:WorkflowAction;disabled:boolean;onClick:()=>void}){const icon=action.key==='approve'?<Check size={13}/>:action.key==='submit'?<Send size={13}/>:action.key==='return'?<RotateCcw size={13}/>:action.key==='reject'?<Ban size={13}/>:action.key==='po'?<ShoppingCart size={13}/>:<Flag size={13}/>;return <button type="button" className={`workflow-button ${action.tone??'secondary'}`} disabled={disabled} onClick={onClick}>{icon}{action.label}</button>}

function WorkflowQueueBanner({total,pending,actionable,label}:{total:number;pending:number;actionable:number;label:string}){return <section className="workflow-queue-banner" aria-label={`ملخص مسار ${label}`}><div className="workflow-queue-stat"><span>إجمالي السجلات</span><strong>{total}</strong></div><div className="workflow-queue-stat"><span>قيد الإجراء</span><strong>{pending}</strong></div><div className="workflow-queue-stat"><span>ينتظر إجراءً منك</span><strong>{actionable}</strong></div><div className="workflow-queue-stat"><span>الهدف</span><strong>نفّذ الخطوة التالية</strong></div></section>}
