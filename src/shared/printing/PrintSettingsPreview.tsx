import type { PrintSettings } from './PrintSettingsContext'

type Props = { settings: PrintSettings }

export function PrintSettingsPreview({ settings }: Props) {
  const company = settings.companyName || 'اسم الشركة'
  const group = settings.groupName || 'المجموعة / القطاع'
  const title = 'نموذج معاينة التقرير'
  const rows = [
    ['001', 'المعدة الرئيسية', 'نشطة', '25,000'],
    ['002', 'شاحنة نقل', 'في التشغيل', '18,500'],
    ['003', 'مركبة خدمة', 'تحت الصيانة', '7,250'],
  ]

  const logo = settings.showLogo && settings.logoSrc ? <img src={settings.logoSrc} alt="" className="kemex-print-preview-logo" /> : null
  const fontClass = `kemex-print-font--${settings.fontFamily}`
  const layoutClass = `kemex-print-layout--${settings.layoutStyle}`
  const style = {
    ['--kemex-print-primary' as string]: settings.primaryColor,
    ['--kemex-print-logo-width' as string]: `${settings.logoWidthMm}mm`,
    ['--kemex-print-signature-height' as string]: `${settings.signatureHeightMm}mm`,
  }

  return (
    <div className="kemex-print-preview-shell" dir="rtl">
      <div className={`kemex-print-preview-page kemex-print-preview-${settings.paperSize.toLowerCase()} ${fontClass} ${layoutClass}`} style={style}>
        <header className="kemex-print-preview-header">
          <div className="kemex-print-preview-brand">
            {logo}
            {(settings.showCompanyName || settings.showGroupName || settings.showCompanyDetails) && (
              <div className="kemex-print-preview-brand-text">
                {settings.showCompanyName && <div className="kemex-print-preview-company">{company}</div>}
                {settings.showGroupName && <div className="kemex-print-preview-group">{group}</div>}
                {settings.showCompanyDetails && settings.companyAddress && <div className="kemex-print-preview-detail">{settings.companyAddress}</div>}
                {settings.showCompanyDetails && settings.companyContact && <div className="kemex-print-preview-detail">{settings.companyContact}</div>}
              </div>
            )}
          </div>
          <div className="kemex-print-preview-title">
            {settings.showDocumentLabel && <small>مستند</small>}
            <h3>{title}</h3>
            <strong>KMX-0001</strong>
          </div>
        </header>

        {settings.showDocumentMeta && (
          <div className="kemex-print-preview-meta-bar"><span>التاريخ: 25/09/2026</span><span>الحالة: معتمد</span><span>المرجع: DEMO-001</span></div>
        )}

        <div className="kemex-print-preview-summary">
          <span>عدد السجلات</span><strong>3</strong>
          <span>التصنيف</span><strong>تقرير تشغيلي</strong>
        </div>

        <table>
          <thead><tr><th>الرقم</th><th>الوصف</th><th>الحالة</th><th>القيمة</th></tr></thead>
          <tbody>{rows.map(row => <tr key={row[0]}>{row.map((cell, index) => <td key={index}>{cell}</td>)}</tr>)}</tbody>
        </table>

        {settings.signatureMode !== 'none' && (
          <section className="kemex-print-preview-signatures">
            {(settings.signatureLabels.length ? settings.signatureLabels : ['إعداد', 'مراجعة', 'اعتماد']).map(label => (
              <div key={label}><strong>{label}</strong><span>الاسم / التوقيع</span><i /></div>
            ))}
          </section>
        )}

        {settings.showFooter && (
          <footer className="kemex-print-preview-footer">
            {settings.showAppName ? <span className="kemex-print-preview-app">{settings.appName}</span> : <span />}
            <span>{settings.footerText || 'نص التذييل يظهر هنا عند إدخاله من الإعدادات'}</span>
            {settings.showPageNumbers ? <span>صفحة 1 من 1</span> : <span />}
          </footer>
        )}
      </div>
    </div>
  )
}
