export const APP = {
  name: 'KEMEX',
  arabicName: 'منصة إدارة اللوجستيات والعمليات',
  subtitle: 'النقل • العمليات اللوجستية • الأسطول • الأصول • الصيانة • المشاريع • التحكم في التكلفة • التحليلات التشغيلية',
  company: 'شركة المجموعة للنقل والمعدات',
  version: '0.52.0',
}


export type NavigationItem = {
  key: string
  label: string
  icon: string
  route: string
  hint: string
  report?: boolean
  permissionModule?: string
  section?: string
}

export type NavigationGroup = {
  group: string
  icon: string
  items: readonly NavigationItem[]
}

/**
 * Canonical top navigation. Every business domain is a dropdown; the navbar is the
 * only place where module navigation lives. Keeping this separate from MODULES
 * prevents child screens from disappearing when a parent module is represented by
 * a single route in the legacy configuration.
 */
export const NAVIGATION_GROUPS: readonly NavigationGroup[] = [
  {
    group: 'العمليات واللوجستيات', icon: 'Route', items: [
      {key:'operations', label:'التشغيل اليومي', icon:'Gauge', route:'operations', hint:'الساعات والعدادات التشغيلية اليومية والاعتماد'},
      {key:'trips', label:'رحلات النقل', icon:'Truck', route:'trips', hint:'الرحلات والمسافات وقيمة النقل'},
      {key:'trips-dispatch', label:'الإرسال والتوزيع', icon:'ArrowLeftRight', route:'trips/dispatch', hint:'توزيع الرحلات ومتابعة التنفيذ', permissionModule:'trips'},
      {key:'requests', label:'طلبات المعدات', icon:'ClipboardList', route:'requests', hint:'الاحتياجات والمراجعة والاعتماد'},
      {key:'assignments', label:'التخصيصات', icon:'ClipboardCheck', route:'assignments', hint:'تسليم واستلام وتخصيص الأصول'},
      {key:'projects', label:'المشروعات والمواقع', icon:'Building2', route:'projects', hint:'المشروعات والمواقع ومراكز التكلفة'},
    ]
  },
  {
    group: 'الأسطول والأصول', icon: 'Truck', items: [
      {key:'assets', label:'الأصول والأسطول', icon:'Container', route:'assets', hint:'الأصول والمركبات والمعدات'},
      {key:'drivers', label:'السائقون والمشغلون', icon:'UserRound', route:'drivers', hint:'السائقون والمشغلون والتراخيص'},
      {key:'contracts', label:'عقود الإيجار', icon:'FileCheck2', route:'contracts', hint:'العقود والشروط والمدد'},
    ]
  },
  {
    group: 'الصيانة', icon: 'Wrench', items: [
      {key:'maintenance', label:'أوامر العمل', icon:'Wrench', route:'maintenance', hint:'الأعمال الوقائية والتصحيحية'},
      {key:'breakdowns', label:'الأعطال والتكاليف', icon:'AlertTriangle', route:'breakdowns', hint:'تسجيل الأعطال ومتابعة المعالجة'},
      {key:'plans', label:'خطط الصيانة', icon:'CalendarClock', route:'plans', hint:'البرامج والاستحقاقات الوقائية'},
      {key:'oils', label:'الزيوت والفلاتر', icon:'Droplets', route:'oils', hint:'دورات التغيير والاستهلاك'},
      {key:'tires', label:'الإطارات', icon:'CircleDot', route:'tires', hint:'التركيب والحركة والحالة'},
    ]
  },
  {
    group: 'المخازن والتوريد', icon: 'Boxes', items: [
      {key:'inventory', label:'المخازن وقطع الغيار', icon:'Boxes', route:'inventory', hint:'الأصناف والأرصدة والحركة'},
      {key:'purchases', label:'المشتريات', icon:'ShoppingCart', route:'purchases', hint:'طلبات الشراء وأوامر الشراء والاستلام'},
    ]
  },
  {
    group: 'المالية والتكاليف', icon: 'Wallet', items: [
      {key:'fuel', label:'الوقود والاستهلاك', icon:'Fuel', route:'fuel', hint:'حركات الوقود والاستهلاك'},
      {key:'costs', label:'التكاليف والإهلاك', icon:'Coins', route:'costs', hint:'التكلفة المباشرة والإهلاك'},
      {key:'charging', label:'التحميل الداخلي', icon:'ChartColumn', route:'charging', hint:'تحميل تكلفة الاستخدام على المشروعات'},
      {key:'invoices', label:'الفواتير والمستحقات', icon:'ReceiptText', route:'invoices', hint:'الفواتير ودورة الاعتماد والسداد'},
      {key:'customers', label:'العملاء', icon:'Users', route:'customers', hint:'العملاء والخدمات الخارجية'},
    ]
  },
  {
    group: 'مركز التحكم', icon: 'Command', items: [
      {key:'operations-center', label:'مركز التشغيل', icon:'Gauge', route:'operations-center', hint:'نظرة موحدة على الرحلات والاستثناءات والصيانة والتنبيهات'},
      {key:'tracking', label:'تتبع المركبات', icon:'MapPinned', route:'tracking', hint:'الموقع المباشر وحالة أجهزة GPS ومسار المركبات'},
    ]
  },
  {
    group: 'التقارير والتحليلات', icon: 'ChartNoAxesCombined', items: [],
  },
  {
    group: 'الإدارة', icon: 'Settings2', items: [
      {key:'users', label:'المستخدمون والصلاحيات', icon:'Users', route:'users', hint:'الحسابات والأدوار والصلاحيات'},
      {key:'audit', label:'سجل التدقيق', icon:'ClipboardPenLine', route:'audit', hint:'العمليات الحساسة والسجل الرقابي'},
      {key:'settings', label:'الإعدادات', icon:'Settings2', route:'settings', hint:'بيانات المؤسسة والأسعار والتنبيهات'},
      {key:'data-management', label:'إدارة البيانات', icon:'DatabaseBackup', route:'data-management', hint:'استيراد وتصدير Excel والنسخ الاحتياطي والاستعادة'},
    ]
  },
]

export type ReportNavigationItem = NavigationItem & { section: string }

export const REPORT_NAV_ITEMS: readonly ReportNavigationItem[] = [
  { key: 'all', label: 'التقرير الشامل لجميع الأصول', hint: 'التشغيل والتكلفة والاستخدام', section: 'الأصول والتكلفة', route: 'reports/all', icon: 'Gauge', report: true },
  { key: 'owned', label: 'الأصول المملوكة والإهلاك', hint: 'القيمة الرأسمالية والقيمة الدفترية', section: 'الأصول والتكلفة', route: 'reports/owned', icon: 'FileBarChart', report: true },
  { key: 'rented', label: 'الأصول المستأجرة والعقود', hint: 'المدد والتكلفة والاستخدام', section: 'الأصول والتكلفة', route: 'reports/rented', icon: 'ReceiptText', report: true },
  { key: 'veh', label: 'السيارات والمركبات', hint: 'الاستهلاك والمسافة والتكلفة', section: 'الأصول والتكلفة', route: 'reports/veh', icon: 'Truck', report: true },
  { key: 'eq', label: 'المعدات والمولدات', hint: 'ساعات التشغيل وتكلفة الساعة', section: 'الأصول والتكلفة', route: 'reports/eq', icon: 'Wrench', report: true },
  { key: 'contracts', label: 'عقود الإيجار', hint: 'الالتزامات والمدد والموردون', section: 'الأصول والتكلفة', route: 'reports/contracts', icon: 'ReceiptText', report: true },
  { key: 'fuel', label: 'الوقود والاستهلاك', hint: 'الكميات والتكلفة الفعلية', section: 'التشغيل والنقل', route: 'reports/fuel', icon: 'Fuel', report: true },
  { key: 'drivers', label: 'أداء السائقين والمشغلين', hint: 'الرحلات والتشغيل والاستخدام', section: 'التشغيل والنقل', route: 'reports/drivers', icon: 'Users', report: true },
  { key: 'trip-profitability', label: 'ربحية عمليات النقل', hint: 'قيمة النقل والتكلفة والهامش', section: 'التشغيل والنقل', route: 'reports/trip-profitability', icon: 'ChartNoAxesCombined', report: true },
  { key: 'unbilled', label: 'النقل غير المفوتر', hint: 'العمليات الجاهزة للفوترة', section: 'التشغيل والنقل', route: 'reports/unbilled', icon: 'ReceiptText', report: true },
  { key: 'due', label: 'الاستحقاقات', hint: 'الصيانة والزيوت والفلاتر', section: 'المتابعة والمخزون', route: 'reports/due', icon: 'CalendarClock', report: true },
  { key: 'invn', label: 'المخزون وقطع الغيار', hint: 'الرصيد والحد الأدنى والقيمة', section: 'المتابعة والمخزون', route: 'reports/invn', icon: 'PackageCheck', report: true },
  { key: 'appr', label: 'الموافقات المعلقة', hint: 'السجلات التي تحتاج إجراء', section: 'المتابعة والمخزون', route: 'reports/appr', icon: 'ClipboardCheck', report: true },
  { key: 'true-cost', label: 'تحليل التكلفة الحقيقية', hint: 'ساعات التوقف والتكلفة الكاملة', section: 'تحليلات متقدمة', route: 'true-cost', icon: 'ChartNoAxesCombined', report: true },
]

export const ROLE_LABELS: Record<string, string> = {
  admin: 'مدير النظام', mgmt: 'الإدارة العليا', fleet: 'مدير الأسطول والأصول', pm: 'مدير مشروع',
  eng: 'مهندس موقع', maint: 'مدير الصيانة', acct: 'محاسب', driver: 'سائق',
}

/**
 * Main navigation is intentionally organized by business domain. Detail routes remain available
 * as child screens but do not appear as duplicate top-level entries.
 */

export type RoleKey = 'admin' | 'mgmt' | 'fleet' | 'pm' | 'eng' | 'maint' | 'acct' | 'driver'
export const ROLE_MODULES: Record<RoleKey, readonly string[] | '*'> = {
  admin: '*',
  mgmt: '*',
  fleet: ['dashboard','alerts','assets','maintenance','operations','trips','inventory','costs','reports','projects','contracts','requests','assignments','drivers','fuel','charging','invoices','customers','breakdowns','plans','oils','tires','audit','true-cost','tracking','operations-center'],
  pm: ['dashboard','alerts','assets','operations','trips','costs','reports','projects','requests','assignments','drivers','breakdowns','charging','customers','invoices','true-cost','tracking','operations-center'],
  eng: ['dashboard','alerts','assets','operations','reports','projects','requests','drivers','breakdowns'],
  maint: ['dashboard','alerts','assets','maintenance','inventory','reports','requests','purchases','drivers','breakdowns','plans','oils','tires','audit','operations'],
  acct: ['dashboard','alerts','assets','trips','costs','reports','projects','contracts','charging','invoices','customers','fuel','breakdowns','true-cost'],
  driver: ['driver','driver-home','driver-trips','driver-history','driver-profile'],
}
export function canViewModule(role:string, module:string){
  const list=ROLE_MODULES[role as RoleKey]
  return list==='*'||(Array.isArray(list)&&list.includes(module))
}
export function canWriteModule(module:string, role:string){
  const list=ROLE_MODULES[role as RoleKey]
  if(list==='*') return true
  const writeOnly = new Set(['dashboard','alerts','reports'])
  if(writeOnly.has(module)) return canViewModule(role,module)
  const allowed:Record<string,RoleKey[]>={
    assets:['admin','fleet'], drivers:['admin','fleet'], contracts:['admin','fleet','acct'], maintenance:['admin','maint','fleet'],
    breakdowns:['admin','maint','fleet','eng'], plans:['admin','maint'], oils:['admin','maint'], tires:['admin','maint'], fuel:['admin','fleet','acct'],
    operations:['admin','fleet','pm','eng','maint'], requests:['admin','fleet','pm','eng','maint'], assignments:['admin','fleet','pm'], projects:['admin','mgmt','pm'],
    inventory:['admin','fleet','maint'], purchases:['admin','fleet','maint','acct'], costs:['admin','acct','fleet','pm'], charging:['admin','acct','fleet','pm'],
    invoices:['admin','acct'], customers:['admin','acct','fleet'], trips:['admin','fleet','pm','acct'], audit:['admin'], users:['admin'], settings:['admin'],
    'true-cost':['admin','mgmt','fleet','pm','acct']
  }
  return (allowed[module]??[]).includes(role as RoleKey)
}


/** Canonical UI capability matrix. The database migration 024 mirrors these sensitive actions. */
export const ACTION_PERMISSIONS: Record<string, readonly RoleKey[]> = {
  'users:manage': ['admin'],
  'audit:read': ['admin','mgmt','fleet','maint','acct'],
  'maintenance:transition': ['admin','maint','fleet'],
  'trips:transition': ['admin','fleet','pm','acct'],
  'purchases:approve': ['admin','fleet','maint'],
  'purchases:receive': ['admin','fleet','maint','acct'],
  'invoices:approve': ['admin','acct'],
  'invoices:pay': ['admin','acct'],
  'attachments:write': ['admin','fleet','pm','eng','maint','acct'],
  'observability:write': ['admin','mgmt','fleet','pm','eng','maint','acct','driver'],
  'trips:driver_execute': ['admin','driver'],
  'trips:driver_receipt': ['admin','driver'],
  'trips:driver_exception': ['admin','driver'],
  'trips:monitor': ['admin','mgmt','fleet','pm'],
  'gps:manage_devices': ['admin','fleet'],
  'trips:exception_view': ['admin','mgmt','fleet','pm'],
  'trips:exception_manage': ['admin','fleet','pm'],
  'trips:exception_report': ['admin','driver','fleet','pm'],
  'trips:override_geofence': ['admin','fleet','pm'],
}

export function canAction(module: string, action: string, role: string): boolean {
  if (role === 'admin') return true
  const allowed = ACTION_PERMISSIONS[`${module}:${action}`]
  return Boolean(allowed?.includes(role as RoleKey))
}

export function canDeleteModule(module: string, role: string): boolean {
  if (role === 'admin') return true
  const allowed: Record<string, RoleKey[]> = {
    assets: ['fleet'], drivers: ['fleet'], contracts: [], maintenance: [], breakdowns: [],
    plans: [], oils: [], tires: [], fuel: ['fleet'], operations: ['fleet'], requests: [],
    assignments: ['fleet'], projects: [], inventory: ['fleet'], purchases: [], costs: [],
    charging: [], invoices: [], customers: [], trips: ['fleet'], audit: [], settings: [],
    'true-cost': [],
  }
  return (allowed[module] ?? []).includes(role as RoleKey)
}

export function canApproveModule(module: string, role: string): boolean {
  if (canAction(module, 'approve', role)) return true
  if (module === 'maintenance' || module === 'trips') return canAction(module, 'transition', role)
  const allowed: Record<string, RoleKey[]> = {
    requests: ['admin','fleet','pm'], assignments: ['admin','fleet','pm'],
    breakdowns: ['admin','maint','fleet'],
  }
  return (allowed[module] ?? []).includes(role as RoleKey)
}

export function canExportModule(_module: string, role: string): boolean {
  return ['admin', 'mgmt', 'fleet', 'pm', 'maint', 'acct'].includes(role)
}

export function canManageUsers(role: string): boolean {
  return canAction('users', 'manage', role)
}

export function canReadAudit(role: string): boolean {
  return canAction('audit', 'read', role)
}
