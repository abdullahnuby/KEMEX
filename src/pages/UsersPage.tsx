import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Check, Copy, KeyRound, Pencil, ShieldCheck, UserPlus, UserRound } from 'lucide-react'
import { ROLE_LABELS, canManageUsers } from '../config/app'
import type { Driver, Role, User } from '../types/tfms'
import type { Repository } from '../core/repository/types'
import { Button, DataTable, PageHeader, StatusBadge } from '../components/ui'
import { FormModal } from '../shared/ui/FormModal'

import { APP_LOCALE } from '../shared/formatters/locale'
const ROLE_OPTIONS = Object.entries(ROLE_LABELS) as Array<[Role, string]>

type CreateState = { email:string; name:string; role:Role; password:string; driverId:string }
const emptyCreate:CreateState={email:'',name:'',role:'fleet',password:'',driverId:''}

export function UsersPage({user,repository,drivers}:{user:User;repository:Repository;drivers:Driver[]}){
  const [users,setUsers]=useState<User[]>([])
  const [editing,setEditing]=useState<User|null>(null)
  const [createOpen,setCreateOpen]=useState(false)
  const [create,setCreate]=useState<CreateState>(emptyCreate)
  const [created,setCreated]=useState<{email:string;password:string}|null>(null)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [copied,setCopied]=useState(false)
  const canView=canManageUsers(user.role) || user.role === 'mgmt'
  const canCreate=canManageUsers(user.role)

  const load=async()=>{
    if(!canView)return
    try{setUsers(await repository.listUsers());setError('')}
    catch(e){setUsers([]);setError(e instanceof Error?`تعذر تحميل المستخدمين من قاعدة البيانات: ${e.message}`:'تعذر تحميل المستخدمين من قاعدة البيانات.')}
  }
  useEffect(()=>{void load()},[repository,canView])

  const activeCount=useMemo(()=>users.filter(x=>x.active!==false).length,[users])
  const forcedCount=useMemo(()=>users.filter(x=>x.mustChangePassword).length,[users])

  if(!canView) return <div className="placeholder-panel panel"><div className="placeholder-icon"><ShieldCheck size={24}/></div><h2>الوصول إلى المستخدمين مقيد</h2><p>إدارة حسابات المستخدمين متاحة لمدير النظام، مع عرض المستخدمين للإدارة العليا.</p></div>

  async function save(){
    if(!editing||!user||!canManageUsers(user.role))return
    setBusy(true);setError('');setNotice('')
    try{
      const saved=await repository.updateUserProfile(editing.id,{full_name:editing.name.trim(),role:editing.role,active:editing.active!==false,driver_id:editing.role==='driver'?(editing.driverId ?? null):null})
      setUsers(rows=>rows.map(x=>x.id===saved.id?saved:x));setEditing(null);setNotice('تم تحديث بيانات المستخدم وصلاحياته بنجاح.')
    }catch(e){setError(e instanceof Error?e.message:'تعذر حفظ التعديلات. حاول مرة أخرى.')}finally{setBusy(false)}
  }

  async function createUser(){
    setBusy(true);setError('');setNotice('');setCreated(null)
    try{
      const email=create.email.trim().toLowerCase(), name=create.name.trim(), password=create.password
      if(!/^\S+@\S+\.\S+$/.test(email)) throw new Error('اكتب بريدًا إلكترونيًا صحيحًا.')
      if(name.length<2) throw new Error('الاسم الكامل مطلوب.')
      if(password.length<8) throw new Error('كلمة المرور المؤقتة يجب ألا تقل عن 8 أحرف.')
      const result=await repository.createUserAccount({email,full_name:name,role:create.role,initial_password:password,driver_id:create.role==='driver'?create.driverId:null})
      setUsers(rows=>[{
        id:result.id,username:result.email,name:result.name,role:result.role,active:result.active,mustChangePassword:result.mustChangePassword,driverId:result.driver_id ?? null,
      },...rows.filter(x=>x.id!==result.id)])
      setCreated({email,password});setCreate(emptyCreate);setCreateOpen(false);setNotice('تم إنشاء الحساب. سلّم المستخدم كلمة المرور المؤقتة؛ سيُطلب منه تغييرها عند أول دخول.')
    }catch(e){setError(e instanceof Error?e.message:'تعذر إنشاء حساب المستخدم.')}finally{setBusy(false)}
  }

  async function copyCredentials(){
    if(!created)return
    try{await navigator.clipboard.writeText(`البريد: ${created.email}\nكلمة المرور المؤقتة: ${created.password}`);setCopied(true);setTimeout(()=>setCopied(false),1500)}catch{setCopied(false)}
  }

  return <div className="space-y-6" dir="rtl">
    <PageHeader title="المستخدمون والصلاحيات" description="إنشاء حسابات النظام، تحديد الدور، وإيقاف الحسابات. الحساب الجديد يبدأ بكلمة مرور مؤقتة ويُجبر على تغييرها عند أول دخول." action={canCreate?<Button icon={<UserPlus size={17}/>} onClick={()=>{setCreate(emptyCreate);setCreated(null);setError('');setCreateOpen(true)}}>إنشاء مستخدم</Button>:undefined}/>
    {error&&<div className="global-error" role="alert">{error}</div>}
    {notice&&<div className="form-success" role="status">{notice}</div>}
    {created&&<section className="panel rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-2 font-bold text-emerald-900"><Check size={18}/>بيانات الحساب المؤقتة</div><p className="mt-1 text-sm text-emerald-800">هذه الكلمة المؤقتة تُعرض هنا بعد الإنشاء لتسليمها للمستخدم. لا يحتاج المستخدم هذه الكلمة مرة أخرى بعد تغييرها.</p><div className="mt-3 grid gap-2 text-sm md:grid-cols-2"><div><span className="text-emerald-700">البريد:</span> <strong>{created.email}</strong></div><div><span className="text-emerald-700">كلمة المرور:</span> <strong dir="ltr">{created.password}</strong></div></div></div><Button variant="secondary" icon={copied?<Check size={16}/>:<Copy size={16}/>} onClick={()=>void copyCredentials()}>{copied?'تم النسخ':'نسخ بيانات الدخول'}</Button></div></section>}
    <div className="grid gap-3 sm:grid-cols-3"><Stat label="إجمالي الحسابات" value={users.length}/><Stat label="الحسابات النشطة" value={activeCount}/><Stat label="تغيير كلمة المرور عند الدخول" value={forcedCount}/></div>
    <DataTable rows={users} columns={[
      {id:'user',header:'المستخدم',render:x=><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-primary-50 text-primary-700"><UserRound size={16}/></span><div><div className="text-sm font-semibold text-slate-900">{x.name}</div><div className="text-sm font-medium text-gray-500">{x.username}</div></div></div>,sortValue:x=>x.name},
      {id:'role',header:'الدور',render:x=><StatusBadge tone="blue">{ROLE_LABELS[x.role]}</StatusBadge>,sortValue:x=>ROLE_LABELS[x.role]},
      {id:'firstLogin',header:'أول دخول',render:x=>x.mustChangePassword?<StatusBadge tone="amber">سيُطلب تغيير كلمة المرور</StatusBadge>:<StatusBadge tone="gray">تم ضبط كلمة المرور</StatusBadge>},
      {id:'active',header:'الحالة',render:x=><StatusBadge tone={x.active===false?'gray':'emerald'}>{x.active===false?'موقوف':'نشط'}</StatusBadge>,sortValue:x=>x.active===false?0:1},
      {id:'action',header:'إجراء',mobileVisible:false,render:x=>canManageUsers(user.role)?<Button variant="ghost" size="sm" icon={<Pencil size={15}/>} onClick={()=>setEditing({...x})}>تعديل</Button>:null},
    ]} rowKey={x=>x.id} searchableText={x=>`${x.name} ${x.username} ${ROLE_LABELS[x.role]}`} emptyState={<div className="px-6 py-16 text-center text-sm font-medium text-gray-500">لا يوجد مستخدمون.</div>}/>

    {createOpen&&<FormModal title="إنشاء مستخدم جديد" onClose={()=>!busy&&setCreateOpen(false)}>
      <FormBlock title="بيانات الحساب" hint="هذا الحساب سيُنشأ في Supabase Authentication وملف المستخدم في KEMEX.">
        <label className="field"><span>الاسم الكامل *</span><input autoFocus value={create.name} onChange={e=>setCreate(x=>({...x,name:e.target.value}))}/></label>
        <label className="field"><span>البريد الإلكتروني *</span><input type="email" dir="ltr" value={create.email} onChange={e=>setCreate(x=>({...x,email:e.target.value}))}/></label>
        <label className="field"><span>الدور *</span><select value={create.role} onChange={e=>setCreate(x=>({...x,role:e.target.value as Role,driverId:e.target.value==='driver'?x.driverId:''}))}>{ROLE_OPTIONS.map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>{create.role==='driver'&&<label className="field"><span>ملف السائق *</span><select value={create.driverId} onChange={e=>setCreate(x=>({...x,driverId:e.target.value}))}><option value="">اختر السائق</option>{drivers.map(d=><option key={d.id} value={d.id}>{d.name} — {d.code}</option>)}</select></label>}
        <label className="field"><span>كلمة المرور المؤقتة *</span><div className="input-with-icon"><KeyRound size={16}/><input type="password" dir="ltr" minLength={8} value={create.password} onChange={e=>setCreate(x=>({...x,password:e.target.value}))}/></div></label>
      </FormBlock>
      <div className="modal-note"><ShieldCheck size={16}/><span>بعد أول تسجيل دخول سيتم منع الوصول لباقي النظام حتى يغيّر المستخدم كلمة المرور المؤقتة.</span></div>
      <div className="modal-actions"><button className="secondary-button" onClick={()=>setCreateOpen(false)} disabled={busy}>إلغاء</button><button className="primary-button" onClick={()=>void createUser()} disabled={busy||!create.email.trim()||!create.name.trim()||create.password.length<8||(create.role==='driver'&&!create.driverId)}><UserPlus size={15}/>{busy?'جارٍ إنشاء الحساب...':'إنشاء الحساب'}</button></div>
    </FormModal>}

    {editing&&<FormModal title="تعديل صلاحية المستخدم" subtitle={editing.username} onClose={()=>setEditing(null)}>
      <FormBlock title="بيانات المستخدم" hint="تعديل بيانات الملف فقط؛ كلمة المرور تُدار من المصادقة."><label className="field"><span>اسم المستخدم</span><input value={editing.username} readOnly dir="ltr"/></label><label className="field"><span>الاسم الظاهر</span><input value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})}/></label><label className="field"><span>الدور</span><select value={editing.role} onChange={e=>setEditing({...editing,role:e.target.value as Role,driverId:e.target.value==='driver'?(editing.driverId??''):''})}>{ROLE_OPTIONS.map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>{editing.role==='driver'&&<label className="field"><span>ملف السائق *</span><select value={editing.driverId??''} onChange={e=>setEditing({...editing,driverId:e.target.value})}><option value="">اختر السائق</option>{drivers.map(d=><option key={d.id} value={d.id}>{d.name} — {d.code}</option>)}</select></label>}<label className="field"><span>حالة الحساب</span><select value={editing.active===false?'false':'true'} onChange={e=>setEditing({...editing,active:e.target.value==='true'})}><option value="true">نشط</option><option value="false">موقوف</option></select></label></FormBlock>
      <div className="modal-actions"><button className="secondary-button" onClick={()=>setEditing(null)}>إلغاء</button><button className="primary-button" disabled={busy||!editing.name.trim()||(editing.role==='driver'&&!editing.driverId)} onClick={()=>void save()}><ShieldCheck size={15}/>{busy?'جارٍ الحفظ...':'حفظ الصلاحية'}</button></div>
    </FormModal>}
  </div>
}

function Stat({label,value}:{label:string;value:number}){return <section className="panel rounded-2xl p-4"><div className="text-sm text-slate-500">{label}</div><div className="mt-1 text-2xl font-bold text-slate-900">{new Intl.NumberFormat(APP_LOCALE).format(value)}</div></section>}
function FormBlock({title,hint,children}:{title:string;hint:string;children:ReactNode}){return <section className="form-section"><div className="form-section-head"><strong>{title}</strong><span>{hint}</span></div><div className="form-grid">{children}</div></section>}
