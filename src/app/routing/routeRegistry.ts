export type RouteKind = 'page' | 'detail' | 'create' | 'redirect' | 'generic' | 'fallback'

export type RouteDefinition = {
  path: string
  module: string
  title: string
  description: string
  kind: RouteKind
}

/**
 * Canonical metadata registry for application routes.
 * Rendering is composed by AppRoutes; ownership, titles and route intent remain
 * centralized here so navigation, guards and breadcrumbs use one route vocabulary.
 */
export const ROUTE_REGISTRY: readonly RouteDefinition[] = [
  { path: '/', module: 'dashboard', title: 'لوحة المعلومات', description: 'الصفحة الرئيسية لنظرة الإدارة على التشغيل والأسطول.', kind: 'redirect' },
  { path: 'dashboard', module: 'dashboard', title: 'لوحة المعلومات', description: 'الصفحة الرئيسية لنظرة الإدارة على التشغيل والأسطول.', kind: 'page' },
  { path: 'alerts', module: 'alerts', title: 'التنبيهات', description: 'التنبيهات التشغيلية والمستندات والاستحقاقات.', kind: 'page' },
  { path: 'operations', module: 'operations', title: 'التشغيل اليومي', description: 'الساعات والعدادات التشغيلية اليومية والاعتماد.', kind: 'page' },
  { path: 'assets', module: 'assets', title: 'الأصول والأسطول', description: 'الأصول والمركبات والمعدات.', kind: 'page' },
  { path: 'assets/edit/:id', module: 'assets', title: 'تعديل الأصل', description: 'تعديل بيانات أصل موجود.', kind: 'detail' },
  { path: 'asset/:id', module: 'assets', title: 'تفاصيل الأصل', description: 'تفاصيل الأصل والتشغيل والوقود والصيانة.', kind: 'detail' },
  { path: 'contracts', module: 'contracts', title: 'عقود الإيجار', description: 'العقود والأصول والفترات والشروط والتجديد.', kind: 'page' },
  { path: 'drivers', module: 'drivers', title: 'السائقون والمشغلون', description: 'السائقون والمشغلون والتراخيص.', kind: 'page' },
  { path: 'maintenance', module: 'maintenance', title: 'أوامر العمل', description: 'الأعمال الوقائية والتصحيحية.', kind: 'page' },
  { path: 'breakdowns', module: 'breakdowns', title: 'الأعطال والتكاليف', description: 'تسجيل الأعطال ومتابعة المعالجة.', kind: 'page' },
  { path: 'breakdowns/new', module: 'breakdowns', title: 'تسجيل عطل جديد', description: 'إنشاء سجل عطل جديد.', kind: 'create' },
  { path: 'breakdowns/:id', module: 'breakdowns', title: 'تفاصيل العطل', description: 'متابعة العطل وأمر العمل والتكلفة.', kind: 'detail' },
  { path: 'plans', module: 'plans', title: 'خطط الصيانة', description: 'البرامج والاستحقاقات الوقائية.', kind: 'page' },
  { path: 'oils', module: 'oils', title: 'الزيوت والفلاتر', description: 'دورات التغيير والاستهلاك.', kind: 'page' },
  { path: 'tires', module: 'tires', title: 'الإطارات', description: 'التركيب والحركة والحالة.', kind: 'page' },
  { path: 'true-cost', module: 'true-cost', title: 'تقرير التكلفة الحقيقية', description: 'تحليل التكلفة الحقيقية وساعات التوقف للأصول.', kind: 'page' },
  { path: 'reports/true-cost', module: 'true-cost', title: 'تقرير التكلفة الحقيقية', description: 'مسار قديم يعيد التوجيه للمسار المعتمد.', kind: 'redirect' },
  { path: 'inventory', module: 'inventory', title: 'المخازن وقطع الغيار', description: 'الأصناف والأرصدة والحركة.', kind: 'page' },
  { path: 'movements', module: 'inventory', title: 'حركة المخزون', description: 'مسار قديم يعيد التوجيه إلى مساحة المخازن.', kind: 'redirect' },
  { path: 'purchases', module: 'purchases', title: 'المشتريات', description: 'طلبات الشراء وأوامر الشراء والاستلام.', kind: 'page' },
  { path: 'fuel', module: 'fuel', title: 'الوقود', description: 'حركات الوقود والاستهلاك.', kind: 'page' },
  { path: 'projects', module: 'projects', title: 'المشروعات والمواقع', description: 'المشروعات والمواقع ومراكز التكلفة.', kind: 'page' },
  { path: 'project/:id', module: 'projects', title: 'تفاصيل المشروع', description: 'تفاصيل المشروع والأصول والتشغيل والتكلفة.', kind: 'detail' },
  { path: 'costs', module: 'costs', title: 'التكاليف والإهلاك', description: 'التكلفة المباشرة والإهلاك.', kind: 'page' },
  { path: 'charging', module: 'charging', title: 'التحميل الداخلي', description: 'تحميل تكلفة الاستخدام على المشروعات.', kind: 'page' },
  { path: 'invoices', module: 'invoices', title: 'الفواتير والمستحقات', description: 'الفواتير ودورة الاعتماد والسداد.', kind: 'page' },
  { path: 'customers', module: 'customers', title: 'العملاء', description: 'العملاء والخدمات الخارجية.', kind: 'page' },
  { path: 'reports', module: 'reports', title: 'التقارير', description: 'تقارير الإدارة والتشغيل والمالية.', kind: 'page' },
  { path: 'reports/:key', module: 'reports', title: 'التقرير', description: 'تقرير متخصص ضمن مركز التقارير.', kind: 'detail' },
  { path: 'users', module: 'users', title: 'المستخدمون والصلاحيات', description: 'الحسابات والأدوار والصلاحيات.', kind: 'page' },
  { path: 'audit', module: 'audit', title: 'سجل التدقيق', description: 'العمليات الحساسة والسجل الرقابي.', kind: 'page' },
  { path: 'settings', module: 'settings', title: 'الإعدادات', description: 'بيانات المؤسسة والأسعار والتنبيهات.', kind: 'page' },
  { path: 'data-management', module: 'data-management', title: 'إدارة البيانات', description: 'استيراد وتصدير Excel والنسخ الاحتياطي واستعادة البيانات.', kind: 'page' },
  { path: 'tracking', module: 'tracking', title: 'تتبع المركبات', description: 'الموقع المباشر وحالة أجهزة GPS ومسار المركبات.', kind: 'page' },
  { path: 'trips', module: 'trips', title: 'رحلات النقل', description: 'الرحلات والمسافات وقيمة النقل.', kind: 'page' },
  { path: 'trips/dispatch', module: 'trips', title: 'لوحة الإرسال والتوزيع', description: 'توزيع الرحلات ومتابعة التنفيذ.', kind: 'page' },
  { path: 'trips/:id', module: 'trips', title: 'تفاصيل الرحلة', description: 'تفاصيل الرحلة والسائق والأصل.', kind: 'detail' },
  { path: 'assignments/new/:requestId', module: 'assignments', title: 'إنشاء تخصيص', description: 'إنشاء تخصيص أصل لطلب معتمد.', kind: 'create' },
  { path: ':moduleKey', module: ':moduleKey', title: 'وحدة تشغيلية', description: 'وحدة من وحدات إدارة النقل والأسطول.', kind: 'generic' },
  { path: '*', module: '*', title: 'غير موجود', description: 'المسار المطلوب غير موجود.', kind: 'fallback' },
] as const

const exactRoutes = new Map(ROUTE_REGISTRY.map(route => [route.path, route]))

export function getRouteDefinition(path: string): RouteDefinition | undefined {
  return exactRoutes.get(path)
}

export function findMatchingRouteDefinition(path: string): RouteDefinition | undefined {
  const normalized = path.replace(/^\/+|\/+$/g, '')
  for (const route of ROUTE_REGISTRY) {
    if (route.path === normalized) return route
    const segments = route.path.split('/')
    const target = normalized.split('/')
    if (segments.length !== target.length) continue
    if (segments.every((segment, index) => segment.startsWith(':') || segment === target[index])) return route
  }
  return ROUTE_REGISTRY.find(route => route.path === '*')
}

export function getRouteModule(path: string): string | undefined {
  return getRouteDefinition(path)?.module
}

export const ROUTE_TITLES: Readonly<Record<string, string>> = Object.fromEntries(
  ROUTE_REGISTRY
    .filter(route => !route.path.includes(':') && route.path !== '*' && route.path !== ':moduleKey')
    .map(route => [route.path, route.title]),
)

export const ROUTE_DESCRIPTIONS: Readonly<Record<string, string>> = Object.fromEntries(
  ROUTE_REGISTRY
    .filter(route => !route.path.includes(':') && route.path !== '*' && route.path !== ':moduleKey')
    .map(route => [route.path, route.description]),
)
