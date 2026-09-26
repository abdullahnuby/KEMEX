import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Building2, CheckCircle2, Crown, Globe2, Plus, RefreshCw, Search, ShieldCheck, Users, X } from 'lucide-react'
import { Button, Card, PageHeader, StatCard, useToast } from '../components/ui'
import { FormModal } from '../shared/ui/FormModal'
import { createPlatformTenant, listPlatformTenants, type PlatformPlan, type PlatformTenant } from '../services/platformService'
import '../styles/platform-companies-page.css'

const PLAN_LABELS: Record<PlatformPlan, string> = {
  trial: 'تجريبي',
  standard: 'قياسي',
  enterprise: 'مؤسسي',
}

const PLAN_CLASSES: Record<PlatformPlan, string> = {
  trial: 'platform-plan--trial',
  standard: 'platform-plan--standard',
  enterprise: 'platform-plan--enterprise',
}

const initialForm = {
  company_name: '',
  slug: '',
  plan: 'trial' as PlatformPlan,
  admin_name: '',
  admin_email: '',
  initial_password: '',
  confirm_password: '',
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value))
  } catch {
    return value
  }
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 42)
  return slug
}

export function PlatformCompaniesPage() {
  const toast = useToast()
  const [companies, setCompanies] = useState<PlatformTenant[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState<'all' | PlatformPlan>('all')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(initialForm)

  async function load(initial = false) {
    setError('')
    if (initial) setLoading(true)
    else setRefreshing(true)
    try {
      setCompanies(await listPlatformTenants())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر تحميل الشركات.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { void load(true) }, [])

  const counts = useMemo(() => ({
    total: companies.length,
    trial: companies.filter(company => company.plan === 'trial').length,
    standard: companies.filter(company => company.plan === 'standard').length,
    enterprise: companies.filter(company => company.plan === 'enterprise').length,
    active: companies.filter(company => company.active).length,
  }), [companies])

  const filteredCompanies = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('ar-EG')
    return companies.filter(company => {
      const matchesPlan = planFilter === 'all' || company.plan === planFilter
      const matchesQuery = !q || [company.name, company.slug, company.firstAdmin?.name ?? '', company.firstAdmin?.email ?? ''].some(value => value.toLocaleLowerCase('ar-EG').includes(q))
      return matchesPlan && matchesQuery
    })
  }, [companies, planFilter, search])

  function updateForm(key: keyof typeof initialForm, value: string) {
    setForm(current => ({ ...current, [key]: value }))
  }

  function openCreate() {
    setForm(initialForm)
    setOpen(true)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = form.company_name.trim()
    const slug = form.slug.trim().toLowerCase()
    const adminName = form.admin_name.trim()
    const email = form.admin_email.trim().toLowerCase()
    if (name.length < 2) { toast.show({ message: 'اسم الشركة مطلوب.', tone: 'error' }); return }
    if (!/^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/.test(slug)) { toast.show({ message: 'معرّف الشركة يجب أن يكون بالإنجليزية الصغيرة والأرقام والشرطة فقط.', tone: 'error' }); return }
    if (adminName.length < 2) { toast.show({ message: 'اسم أول مدير مطلوب.', tone: 'error' }); return }
    if (!/^\S+@\S+\.\S+$/.test(email)) { toast.show({ message: 'بريد أول مدير غير صالح.', tone: 'error' }); return }
    if (form.initial_password.length < 8) { toast.show({ message: 'كلمة المرور المؤقتة يجب ألا تقل عن 8 أحرف.', tone: 'error' }); return }
    if (form.initial_password !== form.confirm_password) { toast.show({ message: 'تأكيد كلمة المرور غير مطابق.', tone: 'error' }); return }

    setSaving(true)
    try {
      const created = await createPlatformTenant({
        company_name: name,
        slug,
        plan: form.plan,
        admin_name: adminName,
        admin_email: email,
        initial_password: form.initial_password,
      })
      setCompanies(current => [created, ...current])
      setOpen(false)
      setForm(initialForm)
      toast.show({ message: `تم إنشاء ${created.name} وإنشاء أول مدير لها بنجاح.`, tone: 'success' })
    } catch (reason) {
      toast.show({ message: reason instanceof Error ? reason.message : 'تعذر إنشاء الشركة.', tone: 'error', durationMs: 6000 })
    } finally {
      setSaving(false)
    }
  }

  return <div className="platform-companies-page enterprise-page">
    <PageHeader
      title="منصة إدارة الشركات"
      description="إدارة الشركات المشتركة في KEMEX من مستوى المنصة، وإنشاء شركة جديدة مع أول مدير للنظام دون خلط صلاحياتها مع إدارة أي شركة أخرى."
      meta={<span className="platform-owner-badge"><ShieldCheck size={15} /> مالك المنصة</span>}
      action={<div className="platform-header-actions"><Button variant="secondary" onClick={() => void load(false)} loading={refreshing} icon={<RefreshCw size={16} />}>تحديث</Button><Button onClick={openCreate} icon={<Plus size={17} />}>شركة جديدة</Button></div>}
    />

    {error && <div className="platform-error" role="alert"><ShieldCheck size={17} /><span>{error}</span><button type="button" onClick={() => void load(false)} aria-label="إعادة المحاولة"><RefreshCw size={15} /></button></div>}

    <div className="platform-stats-grid">
      <StatCard label="إجمالي الشركات" value={counts.total} icon={<Building2 size={21} />} accent="blue" />
      <StatCard label="تجريبي" value={counts.trial} icon={<Globe2 size={21} />} accent="amber" />
      <StatCard label="قياسي" value={counts.standard} icon={<CheckCircle2 size={21} />} accent="teal" />
      <StatCard label="مؤسسي" value={counts.enterprise} icon={<Crown size={21} />} accent="red" />
      <StatCard label="شركات نشطة" value={counts.active} icon={<Users size={21} />} accent="blue" />
    </div>

    <Card title="الشركات المشتركة" description="جميع المستأجرين المسجلين على المنصة مع الخطة وأول مدير وحالة الحساب." className="platform-companies-card">
      <div className="platform-toolbar">
        <label className="platform-search"><Search size={17} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="ابحث باسم الشركة أو المعرّف أو بريد المدير..." /></label>
        <div className="platform-filters" role="group" aria-label="فلترة خطة الشركة">
          {(['all', 'trial', 'standard', 'enterprise'] as const).map(value => <button type="button" key={value} className={planFilter === value ? 'active' : ''} onClick={() => setPlanFilter(value)}>{value === 'all' ? 'كل الخطط' : PLAN_LABELS[value]}</button>)}
        </div>
      </div>

      {loading ? <div className="platform-empty"><RefreshCw className="spin" size={22} /><strong>جارٍ تحميل شركات المنصة...</strong></div>
        : filteredCompanies.length === 0 ? <div className="platform-empty"><Building2 size={28} /><strong>لا توجد شركات مطابقة</strong><span>جرّب تغيير البحث أو الفلاتر، أو أنشئ أول شركة من زر «شركة جديدة».</span></div>
        : <>
          <div className="platform-company-table-wrap">
            <table className="platform-company-table">
              <thead><tr><th>الشركة</th><th>الخطة</th><th>الحالة</th><th>المستخدمون</th><th>أول مدير</th><th>تاريخ الإنشاء</th></tr></thead>
              <tbody>{filteredCompanies.map(company => <tr key={company.id}>
                <td><div className="platform-company-name"><span className="platform-company-icon"><Building2 size={18} /></span><div><strong>{company.name}</strong><small>{company.slug}</small></div></div></td>
                <td><span className={`platform-plan ${PLAN_CLASSES[company.plan]}`}>{PLAN_LABELS[company.plan]}</span></td>
                <td><span className={`platform-status ${company.active ? 'platform-status--active' : 'platform-status--inactive'}`}><i />{company.active ? 'نشطة' : 'موقوفة'}</span></td>
                <td><strong>{company.userCount}</strong><small className="platform-cell-note"> {company.adminCount} مدير</small></td>
                <td>{company.firstAdmin ? <div className="platform-admin-cell"><strong>{company.firstAdmin.name}</strong><small>{company.firstAdmin.email}</small></div> : <span className="platform-muted">غير متاح</span>}</td>
                <td><span className="platform-date">{formatDate(company.createdAt)}</span></td>
              </tr>)}</tbody>
            </table>
          </div>

          <div className="platform-company-cards">
            {filteredCompanies.map(company => <article className="platform-company-card-mobile" key={company.id}>
              <div className="platform-mobile-card-head"><div className="platform-company-name"><span className="platform-company-icon"><Building2 size={18} /></span><div><strong>{company.name}</strong><small>{company.slug}</small></div></div><span className={`platform-plan ${PLAN_CLASSES[company.plan]}`}>{PLAN_LABELS[company.plan]}</span></div>
              <div className="platform-mobile-details"><div><span>الحالة</span><strong className={company.active ? 'is-active' : 'is-inactive'}>{company.active ? 'نشطة' : 'موقوفة'}</strong></div><div><span>المستخدمون</span><strong>{company.userCount}</strong></div><div><span>المدير الأول</span><strong>{company.firstAdmin?.name || '—'}</strong></div><div><span>الإنشاء</span><strong>{formatDate(company.createdAt)}</strong></div></div>
              {company.firstAdmin?.email && <div className="platform-admin-email"><Users size={15} />{company.firstAdmin.email}</div>}
            </article>)}
          </div>
        </>}
    </Card>

    {open && <FormModal title="إنشاء شركة جديدة" subtitle="سيتم إنشاء الشركة، وإعدادات KEMEX الأساسية لها، ثم إنشاء أول مدير بصلاحية مدير النظام مع إجبار تغيير كلمة المرور عند أول دخول." onClose={() => { if (!saving) setOpen(false) }} busy={saving} protectUnsaved dirty={!saving && Object.values(form).some(Boolean)} actions={<><Button variant="secondary" onClick={() => setOpen(false)} disabled={saving} icon={<X size={16} />}>إلغاء</Button><Button type="submit" form="platform-company-form" loading={saving} icon={<Plus size={16} />}>إنشاء الشركة والمدير</Button></>}>
      <form id="platform-company-form" className="platform-create-form" onSubmit={submit}>
        <div className="platform-form-section"><div><span>بيانات الشركة</span><strong>هوية المستأجر وخطة الاشتراك</strong></div></div>
        <div className="platform-form-grid">
          <label><span>اسم الشركة <em>*</em></span><input value={form.company_name} onChange={event => updateForm('company_name', event.target.value)} placeholder="مثال: شركة النوبة للنقل" autoFocus /></label>
          <label><span>معرّف الشركة <em>*</em></span><input dir="ltr" value={form.slug} onChange={event => updateForm('slug', event.target.value.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase())} placeholder="nubya-logistics" /><small>يستخدم كمعرّف فريد للشركة، وليس اسمًا معروضًا للمستخدمين.</small></label>
          <label><span>خطة الاشتراك <em>*</em></span><select value={form.plan} onChange={event => updateForm('plan', event.target.value as PlatformPlan)}><option value="trial">تجريبي</option><option value="standard">قياسي</option><option value="enterprise">مؤسسي</option></select></label>
        </div>
        <div className="platform-form-section"><div><span>أول مدير</span><strong>الحساب الذي سيبدأ منه تشغيل الشركة</strong></div></div>
        <div className="platform-form-grid">
          <label><span>اسم المدير <em>*</em></span><input value={form.admin_name} onChange={event => updateForm('admin_name', event.target.value)} placeholder="الاسم الكامل" /></label>
          <label><span>البريد الإلكتروني <em>*</em></span><input type="email" dir="ltr" value={form.admin_email} onChange={event => updateForm('admin_email', event.target.value)} placeholder="admin@company.com" /></label>
          <label><span>كلمة المرور المؤقتة <em>*</em></span><input type="password" dir="ltr" value={form.initial_password} onChange={event => updateForm('initial_password', event.target.value)} placeholder="8 أحرف على الأقل" /></label>
          <label><span>تأكيد كلمة المرور <em>*</em></span><input type="password" dir="ltr" value={form.confirm_password} onChange={event => updateForm('confirm_password', event.target.value)} placeholder="أعد إدخال كلمة المرور" /></label>
        </div>
        <div className="platform-security-note"><ShieldCheck size={17} /><div><strong>التأسيس يتم من الخادم</strong><span>لا تُمنح صلاحية إدارة المنصة لأول مدير؛ هو مدير للشركة الجديدة فقط. عمليات إنشاء الشركات محمية عبر وظيفة Supabase مخصصة لمالك المنصة.</span></div></div>
      </form>
    </FormModal>}
  </div>
}
