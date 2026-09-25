export type DataColumn = {
  name: string
  type: string
  udt_name?: string
  nullable: boolean
  default?: string | null
  ordinal: number
  primary_key: boolean
}

export type DataTable = {
  table_name: string
  importable: boolean
  data_class: 'business' | 'system' | 'projection' | string
  columns: DataColumn[]
  primary_key: string[]
}

const LABELS: Record<string, string> = {
  approval_events: 'أحداث الاعتماد',
  asset_categories: 'تصنيفات الأصول',
  asset_documents: 'مستندات الأصول',
  asset_types: 'أنواع الأصول',
  assets: 'الأصول',
  assignments: 'تكليفات الأصول',
  attachment_metadata: 'بيانات المرفقات',
  attachments: 'المرفقات',
  audit_log: 'سجل التدقيق',
  backup_registry: 'سجل النسخ الاحتياطية',
  breakdown_events: 'الأعطال',
  charging_rates: 'أسعار التحميل',
  client_error_events: 'أخطاء الواجهة',
  clients: 'العملاء',
  contracts: 'عقود الإيجار',
  cost_centers: 'مراكز التكلفة',
  cost_entries: 'قيود التكاليف',
  downtime_tracking: 'سجل التوقف',
  drivers: 'السائقون والمشغلون',
  fuel_operations: 'عمليات الوقود',
  inventory_items: 'أصناف المخزون',
  invoice_documents: 'مستندات الفواتير',
  maintenance_cost_items: 'تكاليف الصيانة',
  maintenance_parts: 'قطع غيار الصيانة',
  maintenance_technicians: 'فنيّو الصيانة',
  maintenance_transports: 'نقل الصيانة',
  notification_outbox: 'طابور التنبيهات',
  operations: 'التشغيل',
  organization_settings: 'إعدادات المؤسسة',
  profiles: 'ملفات المستخدمين',
  project_memberships: 'أعضاء المشاريع',
  projects: 'المشروعات',
  purchase_orders: 'أوامر الشراء',
  release_registry: 'سجل الإصدارات',
  stock_movements: 'حركة المخزون',
  tfms_module_records: 'السجلات الموحدة للوحدات',
  trip_costs: 'تكاليف الرحلات',
  trip_exceptions: 'استثناءات الرحلات',
  trip_execution_events: 'أحداث تنفيذ الرحلات',
  trip_geofence_events: 'أحداث التحقق الجغرافي',
  trip_geofence_overrides: 'تجاوزات التحقق الجغرافي',
  trip_permits: 'تصاريح الرحلات',
  trip_receipts: 'إيصالات الرحلات',
  trips: 'الرحلات',
  user_notifications: 'تنبيهات المستخدمين',
  warehouses: 'المخازن',
  work_orders: 'أوامر العمل',
}

export const labelForTable = (tableName: string) => LABELS[tableName] ?? tableName.replaceAll('_', ' ')

export function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\u0640\s\-./\\]+/g, '_')
    .replace(/[^\p{L}\p{N}_]/gu, '')
}

export function guessHeaderMapping(sourceHeaders: string[], columns: DataColumn[]) {
  const byNormalized = new Map(columns.map(column => [normalizeHeader(column.name), column.name]))
  const mapping: Record<string, string> = {}
  for (const source of sourceHeaders) {
    const exact = byNormalized.get(normalizeHeader(source))
    mapping[source] = exact ?? ''
  }
  return mapping
}

export function tableExportColumns(table: DataTable): string[] {
  return table.columns.slice().sort((a, b) => a.ordinal - b.ordinal).map(column => column.name)
}

export function isProtectedTable(table: DataTable) {
  return !table.importable || table.data_class !== 'business'
}
