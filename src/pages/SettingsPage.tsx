import { canManageUsers } from '../config/app'
import { useEffect, useState, type ReactNode } from 'react'
import { DatabaseBackup, Eye, ImageUp, Printer, RotateCcw, Save, Settings2 } from 'lucide-react'
import type { Repository } from '../core/repository/types'
import type { User } from '../types/tfms'
import { CURRENCY_OPTIONS, normalizeCurrencyCode } from '../features/settings'
import { Button, Card, PageHeader } from '../components/ui'
import { DataManagementPage } from './DataManagementPage'
import { DEFAULT_PRINT_SETTINGS, normalizePrintSettings, PrintSettingsPreview, type PrintSettings } from '../shared/printing'

type Settings = {
  company_name: string
  group_name: string
  currency_code: string
  vat: number
  diesel: number
  petrol: number
  alert_days: number
  alert_km: number
  alert_hours: number
  trip_geofence_radius_m: number
  print_settings: PrintSettings
}

const empty: Settings = {
  company_name: '',
  group_name: '',
  currency_code: 'EGP',
  vat: 0,
  diesel: 0,
  petrol: 0,
  alert_days: 30,
  alert_km: 1500,
  alert_hours: 80,
  trip_geofence_radius_m: 1000,
  print_settings: DEFAULT_PRINT_SETTINGS,
}

/** Organization, print and data-management settings. */
export function SettingsPage({ user, repository, onSaved }: { user: User; repository: Repository; onSaved?: (settings: Settings) => void }) {
  const [s, setS] = useState<Settings>(empty)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'general' | 'print' | 'data'>('general')

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError('')
    repository.getSettings()
      .then(v => {
        if (!active) return
        setS({
          ...empty,
          ...v,
          currency_code: normalizeCurrencyCode(String(v.currency_code ?? 'EGP')),
          print_settings: normalizePrintSettings(v.print_settings),
        })
      })
      .catch(e => {
        if (active) setLoadError(e instanceof Error ? e.message : 'تعذر تحميل الإعدادات. حاول تحديث الصفحة.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [repository])

  const can = canManageUsers(user.role)

  async function save() {
    if (!can || busy) return
    setMsg('')
    const numeric: [keyof Settings, string][] = [
      ['vat', 'ضريبة القيمة المضافة'],
      ['diesel', 'سعر الديزل'],
      ['petrol', 'سعر البنزين'],
      ['alert_days', 'مدة التنبيه بالأيام'],
      ['alert_km', 'مسافة التنبيه'],
      ['alert_hours', 'ساعات التنبيه'],
      ['trip_geofence_radius_m', 'نطاق التحقق الجغرافي للتحميل والتسليم (متر)'],
    ]
    for (const [key, label] of numeric) {
      const n = s[key]
      if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || (key === 'trip_geofence_radius_m' && n < 1)) {
        setMsg(`تحقق من قيمة ${label}؛ يجب أن تكون رقمًا غير سالب.`)
        return
      }
    }

    const printSettings = normalizePrintSettings(s.print_settings)
    setBusy(true)
    try {
      await repository.saveSettings({ ...s, currency_code: normalizeCurrencyCode(s.currency_code), print_settings: printSettings })
      onSaved?.({ ...s, print_settings: printSettings })
      setS(prev => ({ ...prev, print_settings: printSettings }))
      setMsg('تم حفظ الإعدادات بنجاح.')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'تعذر حفظ الإعدادات. حاول مرة أخرى.')
    } finally {
      setBusy(false)
    }
  }

  const update = (k: Exclude<keyof Settings, 'print_settings'>, v: string) => setS(prev => ({
    ...prev,
    [k]: ['vat', 'diesel', 'petrol', 'alert_days', 'alert_km', 'alert_hours', 'trip_geofence_radius_m'].includes(k)
      ? Number(v)
      : k === 'currency_code'
        ? normalizeCurrencyCode(v)
        : v,
  }))

  const updatePrint = <K extends keyof PrintSettings>(key: K, value: PrintSettings[K]) => {
    setS(prev => ({ ...prev, print_settings: { ...prev.print_settings, [key]: value } }))
  }

  const updateSignature = (index: number, value: string) => {
    const labels = [...s.print_settings.signatureLabels]
    labels[index] = value
    updatePrint('signatureLabels', labels)
  }

  return (
    <div className="space-y-6">
      <div className="settings-tabbar">
        <button className={tab === 'general' ? 'settings-tab active' : 'settings-tab'} type="button" onClick={() => setTab('general')}>
          <Settings2 size={15} /> الإعدادات العامة
        </button>
        <button className={tab === 'print' ? 'settings-tab active' : 'settings-tab'} type="button" onClick={() => setTab('print')}>
          <Printer size={15} /> إعدادات الطباعة
        </button>
        <button className={tab === 'data' ? 'settings-tab active' : 'settings-tab'} type="button" onClick={() => setTab('data')}>
          <DatabaseBackup size={15} /> إدارة البيانات
        </button>
      </div>

      {tab === 'data' ? (
        <DataManagementPage user={user} />
      ) : tab === 'print' ? (
        <PrintSettingsPanel settings={s.print_settings} can={can} onUpdate={updatePrint} onUpdateSignature={updateSignature} />
      ) : (
        <>
          <PageHeader title="الإعدادات العامة" description="بيانات المؤسسة والعملة والأسعار وقواعد التنبيه الافتراضية للنظام." />
          {loading && <div className="global-error" role="status">جارٍ تحميل الإعدادات...</div>}
          {loadError && <div className="global-error" role="alert">{loadError}</div>}
          <Card>
            <div className="section-title">
              <div className="section-title-icon"><Settings2 size={16} /></div>
              <div>
                <strong>إعدادات التشغيل</strong>
                <small>{can ? 'يمكنك تعديل القيم ثم حفظها.' : 'للقراءة فقط — يلزم مدير النظام للتعديل.'}</small>
              </div>
            </div>
            <div className="form-sections">
              <FormBlock title="هوية المؤسسة" hint="البيانات التي تظهر في التقارير والمستندات">
                <Field label="اسم الشركة" value={s.company_name} onChange={v => update('company_name', v)} disabled={!can} />
                <Field label="المجموعة" value={s.group_name} onChange={v => update('group_name', v)} disabled={!can} />
              </FormBlock>
              <FormBlock title="العملة والبيانات المالية" hint="العملة الافتراضية لكل القيم المالية المعروضة في النظام">
                <label className="field">
                  <span>العملة الافتراضية</span>
                  <select disabled={!can} value={s.currency_code} onChange={e => update('currency_code', e.target.value)}>
                    {CURRENCY_OPTIONS.map(option => <option key={option.code} value={option.code}>{option.label}</option>)}
                  </select>
                </label>
                <Field label="ضريبة القيمة المضافة %" type="number" value={String(s.vat)} onChange={v => update('vat', v)} disabled={!can} />
                <Field label="سعر الديزل" type="number" value={String(s.diesel)} onChange={v => update('diesel', v)} disabled={!can} />
                <Field label="سعر البنزين" type="number" value={String(s.petrol)} onChange={v => update('petrol', v)} disabled={!can} />
              </FormBlock>
              <FormBlock title="قواعد التنبيه" hint="تستخدم لإظهار الاستحقاقات قبل موعدها">
                <Field label="التنبيه قبل الانتهاء (يوم)" type="number" value={String(s.alert_days)} onChange={v => update('alert_days', v)} disabled={!can} />
                <Field label="تنبيه العداد (كم)" type="number" value={String(s.alert_km)} onChange={v => update('alert_km', v)} disabled={!can} />
                <Field label="تنبيه ساعات التشغيل" type="number" value={String(s.alert_hours)} onChange={v => update('alert_hours', v)} disabled={!can} />
                <Field label="نطاق التحقق الجغرافي (متر)" type="number" value={String(s.trip_geofence_radius_m)} onChange={v => update('trip_geofence_radius_m', v)} disabled={!can} />
              </FormBlock>
            </div>
            <SaveBar msg={msg} can={can} busy={busy} loading={loading} loadError={loadError} onSave={save} />
          </Card>
        </>
      )}

      {tab === 'print' && (
        <div className="modal-actions">
          {msg && <span className="form-success">{msg}</span>}
          {can && <Button icon={<Save size={15} />} disabled={busy || loading || !!loadError} loading={busy} onClick={save}>{busy ? 'جارٍ الحفظ...' : 'حفظ إعدادات الطباعة'}</Button>}
        </div>
      )}
    </div>
  )
}

function PrintSettingsPanel({ settings, can, onUpdate, onUpdateSignature }: {
  settings: PrintSettings
  can: boolean
  onUpdate: <K extends keyof PrintSettings>(key: K, value: PrintSettings[K]) => void
  onUpdateSignature: (index: number, value: string) => void
}) {
  async function handleLogoChange(file?: File) {
    if (!file || !can) return
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type) && !/\.svg$/i.test(file.name)) {
      window.alert('صيغة الشعار المدعومة: PNG أو JPG أو WEBP أو SVG.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      window.alert('حجم الشعار كبير. استخدم ملفًا لا يتجاوز 2 ميجابايت.')
      return
    }

    const dataUrl = await fileToOptimizedDataUrl(file)
    onUpdate('logoSrc', dataUrl)
    onUpdate('showLogo', true)
  }

  function restoreDefaults() {
    if (!can) return
    onUpdate('applyGlobalTemplate', true)
    Object.entries(DEFAULT_PRINT_SETTINGS).forEach(([key, value]) => {
      if (key !== 'companyName' && key !== 'groupName') {
        onUpdate(key as keyof PrintSettings, value as never)
      }
    })
  }

  return (
    <>
      <PageHeader title="إعدادات الطباعة" description="قالب مؤسسي مركزي يضبط شكل جميع التقارير والمستندات المطبوعة من مكان واحد، مع معاينة مباشرة. ويمكن تعطيله أو تجاوزه في أي مستند يحتاج تنسيقًا خاصًا." />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,.9fr)] items-start">
        <Card>
          <div className="section-title"><div className="section-title-icon"><Printer size={16} /></div><div><strong>هوية التقرير والقالب العام</strong><small>{can ? 'الإعدادات هنا هي الافتراضية المركزية لكل المستندات التي تستخدم قالب KEMEX الموحد.' : 'للقراءة فقط — يلزم مدير النظام للتعديل.'}</small></div></div>
          <div className="form-sections">
            <FormBlock title="تطبيق القالب المركزي" hint="يمكن تعطيله دون حذف إعداداتك؛ الصفحات التي تدعم قالبًا خاصًا يمكنها تجاوزه.">
              <CheckField label="تطبيق إعدادات الطباعة المركزية على المستندات" checked={settings.applyGlobalTemplate} onChange={v => onUpdate('applyGlobalTemplate', v)} disabled={!can} />
              <SelectField label="نمط التقرير" value={settings.layoutStyle} options={[['corporate', 'رسمي مؤسسي'], ['minimal', 'بسيط رسمي'], ['clean', 'نظيف بدون خط علوي']]} onChange={v => onUpdate('layoutStyle', v as PrintSettings['layoutStyle'])} disabled={!can} />
              <SelectField label="الخط" value={settings.fontFamily} options={[['alexandria', 'Alexandria'], ['tajawal', 'Tajawal'], ['system', 'خط النظام']]} onChange={v => onUpdate('fontFamily', v as PrintSettings['fontFamily'])} disabled={!can} />
              <Field label="اللون الأساسي" value={settings.primaryColor} onChange={v => onUpdate('primaryColor', v)} disabled={!can} />
              <CheckField label="إظهار خط الفصل أسفل الترويسة" checked={settings.showHeaderRule} onChange={v => onUpdate('showHeaderRule', v)} disabled={!can} />
              <CheckField label="إظهار كلمة «مستند» فوق العنوان" checked={settings.showDocumentLabel} onChange={v => onUpdate('showDocumentLabel', v)} disabled={!can} />
              <CheckField label="إظهار التاريخ والحالة والمرجع" checked={settings.showDocumentMeta} onChange={v => onUpdate('showDocumentMeta', v)} disabled={!can} />
            </FormBlock>

            <FormBlock title="شعار الشركة ومعلوماتها" hint="الشعار هنا هو شعار الشركة، وليس شعار التطبيق. يظهر أعلى اليسار في القالب الرسمي.">
              <div className="field field-span-full">
                <span>شعار الشركة</span>
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
                  {settings.logoSrc ? <img src={settings.logoSrc} alt="معاينة شعار الشركة" className="h-14 max-w-[180px] object-contain rounded bg-white p-1" /> : <div className="text-sm text-slate-500">لم يتم رفع شعار الشركة</div>}
                  <label className="secondary-button cursor-pointer inline-flex items-center gap-2">
                    <ImageUp size={15} /> رفع الشعار
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" disabled={!can} onChange={e => { void handleLogoChange(e.target.files?.[0]); e.currentTarget.value = '' }} />
                  </label>
                  {settings.logoSrc && <Button variant="ghost" size="sm" icon={<RotateCcw size={14} />} disabled={!can} onClick={() => onUpdate('logoSrc', '')}>إزالة الشعار</Button>}
                </div>
              </div>
              <CheckField label="إظهار الشعار" checked={settings.showLogo} onChange={v => onUpdate('showLogo', v)} disabled={!can} />
              <Field label="عرض الشعار (مم)" type="number" value={String(settings.logoWidthMm)} onChange={v => onUpdate('logoWidthMm', Number(v))} disabled={!can} />
              <CheckField label="إظهار اسم الشركة" checked={settings.showCompanyName} onChange={v => onUpdate('showCompanyName', v)} disabled={!can} />
              <CheckField label="إظهار اسم المجموعة" checked={settings.showGroupName} onChange={v => onUpdate('showGroupName', v)} disabled={!can} />
              <CheckField label="إظهار العنوان وبيانات الاتصال" checked={settings.showCompanyDetails} onChange={v => onUpdate('showCompanyDetails', v)} disabled={!can} />
              <Field label="العنوان" value={settings.companyAddress} onChange={v => onUpdate('companyAddress', v)} disabled={!can} />
              <Field label="الهاتف / البريد / بيانات الاتصال" value={settings.companyContact} onChange={v => onUpdate('companyContact', v)} disabled={!can} />
            </FormBlock>

            <FormBlock title="التذييل" hint="اسم التطبيق اختياري ويظهر بخط صغير جدًا أسفل اليسار، بدون شعار.">
              <CheckField label="إظهار التذييل" checked={settings.showFooter} onChange={v => onUpdate('showFooter', v)} disabled={!can} />
              <CheckField label="إظهار اسم التطبيق أسفل اليسار" checked={settings.showAppName} onChange={v => onUpdate('showAppName', v)} disabled={!can} />
              <CheckField label="إظهار أرقام الصفحات" checked={settings.showPageNumbers} onChange={v => onUpdate('showPageNumbers', v)} disabled={!can} />
              <Field label="اسم التطبيق" value={settings.appName} onChange={v => onUpdate('appName', v)} disabled={!can} />
              <Field label="نص التذييل" value={settings.footerText} onChange={v => onUpdate('footerText', v)} disabled={!can} />
              <label className="field"><span>لون العنصر الأساسي</span><input type="color" value={settings.primaryColor} disabled={!can} onChange={e => onUpdate('primaryColor', e.target.value)} /></label>
            </FormBlock>

            <FormBlock title="الورق والهوامش" hint="القيم الافتراضية موحدة، ويمكن للمستند استثناء الاتجاه عند الحاجة.">
              <SelectField label="حجم الورق" value={settings.paperSize} options={[['A4', 'A4'], ['Letter', 'Letter']]} onChange={v => onUpdate('paperSize', v as PrintSettings['paperSize'])} disabled={!can} />
              <SelectField label="اتجاه الورق" value={settings.orientation} options={[['auto', 'تلقائي حسب الصفحة'], ['portrait', 'رأسي'], ['landscape', 'أفقي']]} onChange={v => onUpdate('orientation', v as PrintSettings['orientation'])} disabled={!can} />
              <Field label="الهامش العلوي (مم)" type="number" value={String(settings.marginTopMm)} onChange={v => onUpdate('marginTopMm', Number(v))} disabled={!can} />
              <Field label="الهامش الأيمن (مم)" type="number" value={String(settings.marginRightMm)} onChange={v => onUpdate('marginRightMm', Number(v))} disabled={!can} />
              <Field label="الهامش السفلي (مم)" type="number" value={String(settings.marginBottomMm)} onChange={v => onUpdate('marginBottomMm', Number(v))} disabled={!can} />
              <Field label="الهامش الأيسر (مم)" type="number" value={String(settings.marginLeftMm)} onChange={v => onUpdate('marginLeftMm', Number(v))} disabled={!can} />
              <SelectField label="كثافة الجدول" value={settings.tableDensity} options={[['compact', 'مضغوط'], ['standard', 'قياسي'], ['comfortable', 'مريح']]} onChange={v => onUpdate('tableDensity', v as PrintSettings['tableDensity'])} disabled={!can} />
            </FormBlock>

            <FormBlock title="التوقيعات" hint="الإعداد الافتراضي يثبت التوقيعات في أسفل كل صفحة؛ لذلك لا تنفصل التوقيعات عن الصفحة حتى عند وجود جدول طويل.">
              <SelectField label="طريقة عرض التوقيعات" value={settings.signatureMode} options={[['every-page', 'في كل صفحة — موصى به للمستندات الرسمية'], ['last-page', 'في آخر صفحة فقط'], ['none', 'بدون توقيعات']]} onChange={v => onUpdate('signatureMode', v as PrintSettings['signatureMode'])} disabled={!can} />
              <Field label="ارتفاع منطقة التوقيع (مم)" type="number" value={String(settings.signatureHeightMm)} onChange={v => onUpdate('signatureHeightMm', Number(v))} disabled={!can} />
              {settings.signatureLabels.map((label, index) => <Field key={index} label={`خانة التوقيع ${index + 1}`} value={label} onChange={v => onUpdateSignature(index, v)} disabled={!can} />)}
            </FormBlock>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-sm text-slate-600"><strong>القاعدة المركزية:</strong> الشعار واسم الشركة أعلى اليسار، عنوان المستند في الجهة المقابلة، واسم التطبيق — عند تفعيله — صغير جدًا أسفل اليسار. الإعدادات قابلة للتعديل أو الإلغاء ولا تجعل جميع المستندات متطابقة بالقوة.</div>
            {can && <Button variant="ghost" size="sm" icon={<RotateCcw size={14} />} onClick={restoreDefaults}>استعادة الإعدادات الافتراضية</Button>}
          </div>
        </Card>

        <Card className="xl:sticky xl:top-4">
          <div className="section-title"><div className="section-title-icon"><Eye size={16} /></div><div><strong>معاينة مباشرة</strong><small>المعاينة تقريبية للشكل النهائي على ورق {settings.paperSize}، بينما حجم البيانات الفعلية يحدد عدد الصفحات.</small></div></div>
          <PrintSettingsPreview settings={settings} />
          <p className="mt-3 text-xs text-slate-500">المعاينة توضح الهوية والتذييل والتوقيعات والجدول، وتُستخدم نفس الإعدادات مركزيًا عند الطباعة.</p>
        </Card>
      </div>
    </>
  )
}

async function fileToOptimizedDataUrl(file: File): Promise<string> {
  if (file.type === 'image/svg+xml' || /\.svg$/i.test(file.name)) {
    return await readFileAsDataUrl(file)
  }
  const objectUrl = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.decoding = 'async'
    image.src = objectUrl
    await image.decode()
    const maxWidth = 1000
    const maxHeight = 320
    const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight)
    const width = Math.max(1, Math.round(image.naturalWidth * scale))
    const height = Math.max(1, Math.round(image.naturalHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return await readFileAsDataUrl(file)
    ctx.clearRect(0, 0, width, height)
    ctx.drawImage(image, 0, 0, width, height)
    return canvas.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('تعذر قراءة ملف الشعار.'))
    reader.readAsDataURL(file)
  })
}

function SaveBar({ msg, can, busy, loading, loadError, onSave }: { msg: string; can: boolean; busy: boolean; loading: boolean; loadError: string; onSave: () => void }) {
  return <div className="modal-actions">{msg && <span className="form-success">{msg}</span>}{can && <Button icon={<Save size={15} />} disabled={busy || loading || !!loadError} loading={busy} onClick={onSave}>{busy ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}</Button>}</div>
}

function FormBlock({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return <section className="form-section"><div className="form-section-head"><strong>{title}</strong><span>{hint}</span></div><div className="form-grid">{children}</div></section>
}

function Field({ label, value, onChange, type = 'text', disabled }: { label: string; value: string; onChange: (v: string) => void; type?: string; disabled: boolean }) {
  return <label className="field"><span>{label}</span><input disabled={disabled} type={type} min={type === 'number' ? 0 : undefined} step={type === 'number' ? 'any' : undefined} value={value} onChange={e => onChange(e.target.value)} /></label>
}

function CheckField({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (value: boolean) => void; disabled: boolean }) {
  return <label className="field field-check"><span>{label}</span><input type="checkbox" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} /></label>
}

function SelectField({ label, value, options, onChange, disabled }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void; disabled: boolean }) {
  return <label className="field"><span>{label}</span><select value={value} disabled={disabled} onChange={e => onChange(e.target.value)}>{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>
}

export type { Settings }
