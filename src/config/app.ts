export const APP = {
  name: 'KEMEX',
  arabicName: 'إدارة النقل والأسطول والمعدات',
  subtitle: 'النقل • الأسطول • المعدات • الصيانة • الوقود • التكاليف',
  company: 'شركة المجموعة للنقل والمعدات',
  version: '0.23.0',
}

export const ROLE_LABELS: Record<string, string> = {
  admin: 'مدير النظام',
  mgmt: 'الإدارة العليا',
  fleet: 'مدير النقل والمعدات',
  pm: 'مدير مشروع',
  eng: 'مهندس موقع',
  maint: 'مدير الصيانة',
  acct: 'محاسب',
}

export const MODULES = [
  { key: 'dashboard', label: 'لوحة المعلومات', icon: 'LayoutDashboard', group: 'الرئيسية' },
  { key: 'alerts', label: 'التنبيهات', icon: 'Bell', group: 'الرئيسية' },
  { key: 'requests', label: 'طلبات المعدات', icon: 'ClipboardList', group: 'التشغيل' },
  { key: 'assignments', label: 'التخصيصات', icon: 'FileCheck2', group: 'التشغيل' },
  { key: 'operations', label: 'التشغيل اليومي', icon: 'Gauge', group: 'التشغيل' },
  { key: 'trips', label: 'الرحلات', icon: 'Truck', group: 'التشغيل' },
  { key: 'projects', label: 'المشروعات', icon: 'Building2', group: 'البيانات الأساسية' },
  { key: 'assets', label: 'الأصول والأسطول', icon: 'Container', group: 'البيانات الأساسية' },
  { key: 'drivers', label: 'السائقون والمشغلون', icon: 'UserRound', group: 'البيانات الأساسية' },
  { key: 'contracts', label: 'عقود الإيجار', icon: 'FileCheck2', group: 'البيانات الأساسية' },
  { key: 'customers', label: 'العملاء', icon: 'BriefcaseBusiness', group: 'البيانات الأساسية' },
  { key: 'plans', label: 'خطط الصيانة', icon: 'CalendarClock', group: 'الصيانة والمواد' },
  { key: 'maintenance', label: 'أوامر العمل', icon: 'Wrench', group: 'الصيانة والمواد' },
  { key: 'oils', label: 'الزيوت والفلاتر', icon: 'Droplets', group: 'الصيانة والمواد' },
  { key: 'tires', label: 'الإطارات', icon: 'CircleDot', group: 'الصيانة والمواد' },
  { key: 'fuel', label: 'الوقود', icon: 'Fuel', group: 'الصيانة والمواد' },
  { key: 'inventory', label: 'المخازن وقطع الغيار', icon: 'Boxes', group: 'الصيانة والمواد' },
  { key: 'movements', label: 'حركة المخزون', icon: 'ArrowLeftRight', group: 'الصيانة والمواد' },
  { key: 'purchases', label: 'المشتريات', icon: 'ShoppingCart', group: 'الصيانة والمواد' },
  { key: 'costs', label: 'التكاليف والإهلاك', icon: 'Coins', group: 'المالية' },
  { key: 'charging', label: 'التحميل الداخلي', icon: 'ChartColumn', group: 'المالية' },
  { key: 'invoices', label: 'الفواتير والمستحقات', icon: 'ReceiptText', group: 'المالية' },
  { key: 'reports', label: 'التقارير', icon: 'ChartNoAxesCombined', group: 'التقارير والإدارة' },
  { key: 'users', label: 'المستخدمون والصلاحيات', icon: 'Users', group: 'التقارير والإدارة' },
  { key: 'audit', label: 'سجل التدقيق', icon: 'ClipboardPenLine', group: 'التقارير والإدارة' },
  { key: 'settings', label: 'الإعدادات', icon: 'Settings2', group: 'التقارير والإدارة' },
] as const

export const DEMO_PASSWORD = '1234'

export type RoleKey = 'admin' | 'mgmt' | 'fleet' | 'pm' | 'eng' | 'maint' | 'acct'
export const ROLE_MODULES: Record<RoleKey, readonly string[] | '*'> = {
  admin: '*',
  mgmt: '*',
  fleet: ['dashboard','alerts','projects','assets','contracts','requests','assignments','operations','trips','drivers','fuel','costs','charging','invoices','reports','audit'],
  pm: ['dashboard','alerts','assets','requests','assignments','operations','trips','drivers','reports','costs','charging'],
  eng: ['dashboard','alerts','assets','requests','operations','drivers','reports'],
  maint: ['dashboard','alerts','assets','plans','maintenance','oils','tires','inventory','movements','purchases','requests','reports','audit','drivers'],
  acct: ['dashboard','alerts','projects','assets','contracts','costs','charging','invoices','customers','fuel','reports','audit'],
}
export function canViewModule(role:string, module:string){const list=ROLE_MODULES[role as RoleKey];return list==='*'||(Array.isArray(list)&&list.includes(module))}
