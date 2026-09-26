import { NAVIGATION_GROUPS, REPORT_NAV_ITEMS } from './app'

export type Crumb = { label: string; route?: string }

/**
 * Arabic titles replicated from the route table (src/app/routes.tsx) so the shell can
 * label any known top-level route without importing page modules.
 */
const MODULE_TITLES: Record<string, string> = {
  dashboard: 'لوحة المعلومات', alerts: 'التنبيهات', assets: 'الأصول والأسطول', maintenance: 'أوامر العمل', fuel: 'الوقود', projects: 'المشروعات',
  requests: 'طلبات المعدات', assignments: 'التخصيصات', operations: 'التشغيل اليومي', trips: 'رحلات النقل', drivers: 'السائقون والمشغلون', contracts: 'عقود الإيجار', customers: 'العملاء',
  plans: 'خطط الصيانة', oils: 'الزيوت والفلاتر', tires: 'الإطارات', inventory: 'المخازن وقطع الغيار', movements: 'حركة المخزون', purchases: 'المشتريات',
  breakdowns: 'الأعطال والتكاليف', 'breakdowns/new': 'تسجيل عطل جديد', 'true-cost': 'تحليل التكلفة الحقيقية', 'reports/true-cost': 'تحليل التكلفة الحقيقية',
  costs: 'التكاليف والإهلاك', charging: 'التحميل الداخلي', invoices: 'الفواتير والمستحقات', reports: 'التقارير', users: 'المستخدمون والصلاحيات', audit: 'سجل التدقيق', settings: 'الإعدادات',
}

function titleFor(key: string): string {
  if (MODULE_TITLES[key]) return MODULE_TITLES[key]
  for (const group of NAVIGATION_GROUPS) {
    const item = group.items.find(x => x.key === key || x.route === key)
    if (item) return item.label
  }
  return key
}

/**
 * Declarative breadcrumb trail for the known route patterns. Unknown generic module
 * routes fall back to the module title map; unmatched ids render a generic detail label.
 */
export function buildBreadcrumbs(route: string): Crumb[] {
  const home: Crumb = { label: 'الرئيسية', route: 'dashboard' }
  const clean = route.replace(/^\//, '')
  if (!clean || clean === 'dashboard') return [home]

  const parts = clean.split('/')
  const crumbs: Crumb[] = [home]

  // Detail / nested patterns first — most specific wins.
  if (parts[0] === 'asset' && parts[1]) return [...crumbs, { label: 'الأسطول والأصول', route: 'assets' }, { label: 'تفاصيل الأصل' }]
  if (parts[0] === 'assets' && parts[1] === 'edit' && parts[2]) return [...crumbs, { label: 'الأسطول والأصول', route: 'assets' }, { label: 'تعديل بيانات الأصل' }]
  if (parts[0] === 'breakdowns' && parts[1] === 'new') return [...crumbs, { label: 'الأعطال والتكاليف', route: 'breakdowns' }, { label: 'تسجيل عطل جديد' }]
  if (parts[0] === 'breakdowns' && parts[1]) return [...crumbs, { label: 'الأعطال والتكاليف', route: 'breakdowns' }, { label: 'تفاصيل العطل' }]
  if (parts[0] === 'trips' && parts[1] === 'dispatch') return [...crumbs, { label: 'رحلات النقل', route: 'trips' }, { label: 'لوحة الإرسال والتوزيع' }]
  if (parts[0] === 'trips' && parts[1]) return [...crumbs, { label: 'رحلات النقل', route: 'trips' }, { label: 'تفاصيل الرحلة' }]
  if (parts[0] === 'project' && parts[1]) return [...crumbs, { label: 'المشروعات والمواقع', route: 'projects' }, { label: 'تفاصيل المشروع' }]
  if (parts[0] === 'assignments' && parts[1] === 'new') return [...crumbs, { label: 'التخصيصات', route: 'assignments' }, { label: 'تخصيص جديد' }]
  if (parts[0] === 'reports' && parts[1]) {
    const report = REPORT_NAV_ITEMS.find(item => item.route === clean || item.key === parts[1])
    return [...crumbs, { label: 'التقارير والتحليلات', route: 'reports' }, { label: report?.label ?? titleFor(clean) }]
  }

  const label = titleFor(clean)
  return [...crumbs, { label }]
}
