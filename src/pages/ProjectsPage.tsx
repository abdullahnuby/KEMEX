import { Building2, MapPin, Pencil, Plus, Users, X } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import type { Asset, Project } from '../types/tfms'
import { StatusBadge } from '../components/StatusBadge'
import { sameReference } from '../utils/referenceLabels'

export function ProjectsPage({projects,assets,onSave}:{projects:Project[];assets:Asset[];onSave?:(p:Project)=>Promise<void>|void}) {
  const [editing,setEditing]=useState<Project|null>(null)
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault(); if(!editing||!onSave)return
    const fd=new FormData(e.currentTarget)
    const next:Project={
      ...editing, code:String(fd.get('code')||''), name:String(fd.get('name')||''), client:String(fd.get('client')||''),
      mgr:String(fd.get('mgr')||''), site:String(fd.get('site')||''), cc:String(fd.get('cc')||''), status:String(fd.get('status')||'نشط'), start:String(fd.get('start')||''), end:String(fd.get('end')||''), contract:String(fd.get('contract')||''), location:String(fd.get('location')||''), phone:String(fd.get('phone')||''), budget:Number(fd.get('budget')||0), progress:Number(fd.get('progress')||0), notes:String(fd.get('notes')||''),
    }
    await onSave(next); setEditing(null)
  }
  return <div>
    <div className="page-head"><div><h1>المشروعات والمواقع</h1><p>ربط الأصول والمعدات بالمشروعات ومراكز التكلفة.</p></div>{onSave&&<button className="primary-button" onClick={()=>setEditing({id:`P-${Date.now()}`,code:'',name:'',client:'',mgr:'',site:'',cc:'',status:'نشط',start:'',end:'',contract:'',location:'',phone:'',budget:0,progress:0,notes:''})}><Plus size={16}/> مشروع جديد</button>}</div>
    <div className="project-card-grid">
      {projects.map(p=>{const linked=assets.filter(a=>sameReference(a.proj,p)).length;return <article className="project-card" key={p.id}>
        <div className="project-card-top"><div className="project-icon"><Building2 size={19}/></div><StatusBadge>{p.status}</StatusBadge></div>
        <div className="project-title-row"><h2>{p.name}</h2>{onSave&&<button className="icon-button" title="تعديل" onClick={()=>setEditing(p)}><Pencil size={14}/></button>}</div>
        <div className="project-code"><span>{p.code}</span><span aria-hidden="true">·</span><span>{p.cc}</span></div>
        <div className="project-meta"><span><MapPin size={14}/>{p.site||'—'}</span><span><Users size={14}/>{p.mgr||'—'}</span></div>
        <div className="project-footer"><strong>{linked} أصل مرتبط</strong><span>{p.client||'—'}</span></div>
      </article>})}
    </div>
    {editing&&<div className="modal-backdrop" onMouseDown={()=>setEditing(null)}><form className="modal-card wide form-modal-premium" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}>
      <div className="modal-head"><div><h2>{editing.name?'تعديل مشروع':'إضافة مشروع'}</h2><p>البيانات الأساسية للمشروع</p></div><button type="button" className="icon-button" onClick={()=>setEditing(null)}><X size={18}/></button></div>
      <div className="form-sections form-sections-core"><FormBlock title="هوية المشروع"><Field n="code" l="كود المشروع" v={editing.code}/><Field n="name" l="اسم المشروع" v={editing.name}/><Field n="client" l="العميل" v={editing.client}/><Field n="cc" l="مركز التكلفة" v={editing.cc}/></FormBlock><FormBlock title="الإدارة والموقع"><Field n="mgr" l="مدير المشروع" v={editing.mgr}/><Field n="site" l="الموقع / المنطقة" v={editing.site}/><Field n="location" l="وصف الموقع" v={editing.location??''}/><Field n="phone" l="هاتف الموقع / المشروع" v={editing.phone??''}/></FormBlock><FormBlock title="الفترة والتعاقد"><Field n="start" l="تاريخ البداية" type="date" v={editing.start??''}/><Field n="end" l="تاريخ النهاية المخططة" type="date" v={editing.end??''}/><Field n="contract" l="رقم العقد / المرجع" v={editing.contract??''}/><label className="field"><span>الحالة</span><select name="status" defaultValue={editing.status}><option>نشط</option><option>مغلق</option><option>موقوف</option></select></label></FormBlock><FormBlock title="الميزانية والمتابعة"><Field n="budget" l="الميزانية التقديرية" type="number" v={String(editing.budget??0)}/><Field n="progress" l="نسبة الإنجاز %" type="number" v={String(editing.progress??0)}/></FormBlock><label className="field field-full"><span>ملاحظات المشروع</span><textarea name="notes" defaultValue={editing.notes??''} rows={4} placeholder="نطاق المشروع، الملاحظات الإدارية، متطلبات الموقع أو نقاط المتابعة..."/></label></div>
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setEditing(null)}>إلغاء</button><button className="primary-button">حفظ</button></div>
    </form></div>}
  </div>
}
function Field({n,l,v,type='text'}:{n:string;l:string;v:string;type?:string}){return <label className="field"><span>{l}</span><input name={n} type={type} defaultValue={v} min={type==='number'?0:undefined} max={type==='number'&&n==='progress'?100:undefined} step={type==='number'?'any':undefined}/></label>}
function FormBlock({title,children}:{title:string;children:ReactNode}){return <section className="form-section"><div className="form-section-head"><strong>{title}</strong><span>بيانات أساسية للمتابعة</span></div><div className="form-grid">{children}</div></section>}
