export type WorkflowStage = {
  id: string
  label: string
  description: string
}

export type WorkflowDefinition = {
  id: 'vehicle' | 'maintenance' | 'transportation'
  label: string
  stages: readonly WorkflowStage[]
}

export const VEHICLE_WORKFLOW: WorkflowDefinition = {
  id: 'vehicle',
  label: 'دورة حياة الأصل',
  stages: [
    { id: 'registration', label: 'التسجيل', description: 'تعريف الأصل وبياناته الأساسية ومستنداته.' },
    { id: 'assignment', label: 'التخصيص', description: 'ربط الأصل بالمشروع أو الجهة المستخدمة.' },
    { id: 'operation', label: 'التشغيل', description: 'التشغيل اليومي والعداد والاستخدام.' },
    { id: 'inspection', label: 'الفحص', description: 'متابعة الحالة الفنية والالتزام بالفحص.' },
    { id: 'maintenance', label: 'الصيانة', description: 'الأعمال الوقائية والتصحيحية وحالة التوقف.' },
    { id: 'cost', label: 'التكلفة', description: 'الوقود والصيانة والإهلاك والتكلفة التشغيلية.' },
    { id: 'history', label: 'السجل', description: 'التاريخ التشغيلي والمستندات والتدقيق.' },
  ],
}

export const MAINTENANCE_WORKFLOW: WorkflowDefinition = {
  id: 'maintenance',
  label: 'دورة معالجة العطل',
  stages: [
    { id: 'reported', label: 'بلاغ العطل', description: 'تسجيل العطل وتحديد شدته وأثره.' },
    { id: 'diagnosis', label: 'الفحص والتشخيص', description: 'فحص الأصل وتحديد سبب العطل.' },
    { id: 'transport', label: 'النقل للورشة', description: 'تجهيز وتحريك الأصل عند الحاجة.' },
    { id: 'repair', label: 'الإصلاح', description: 'أمر العمل وقطع الغيار والعمالة.' },
    { id: 'return', label: 'إعادة الأصل', description: 'إعادة الأصل للموقع والتحقق من حالته.' },
    { id: 'completion', label: 'الإغلاق', description: 'إقفال العطل واعتماد التكلفة والسجل.' },
  ],
}

export const TRANSPORTATION_WORKFLOW: WorkflowDefinition = {
  id: 'transportation',
  label: 'دورة رحلة النقل',
  stages: [
    { id: 'request', label: 'الطلب', description: 'استلام احتياج النقل ومراجعته.' },
    { id: 'assignment', label: 'التخصيص', description: 'تحديد المركبة والسائق والربط بالمشروع.' },
    { id: 'driver', label: 'السائق', description: 'تأكيد السائق والمسؤولية التشغيلية.' },
    { id: 'vehicle', label: 'المركبة', description: 'التأكد من المركبة وجاهزيتها للرحلة.' },
    { id: 'trip', label: 'الرحلة', description: 'الانطلاق والتنفيذ والتسليم والاستلام.' },
    { id: 'completion', label: 'الإتمام', description: 'إغلاق الرحلة وتوثيق المستندات.' },
    { id: 'cost', label: 'التكلفة', description: 'التكاليف والفوترة والتحصيل.' },
    { id: 'history', label: 'السجل', description: 'الحركة والمرفقات والتدقيق المرتبط بالرحلة.' },
  ],
}

export function vehicleStageForStatus(status: string): string {
  switch (status) {
    case 'خارج الخدمة': return 'history'
    case 'تحت الصيانة': return 'maintenance'
    case 'متوقف مؤقتًا': return 'inspection'
    case 'مخصص لمشروع': return 'assignment'
    case 'يعمل': return 'operation'
    default: return 'assignment'
  }
}

export function maintenanceStageForStatus(status: string): string {
  switch (status) {
    case 'reported': return 'reported'
    case 'inspecting': return 'diagnosis'
    case 'awaiting_transport': return 'transport'
    case 'in_transit_to_workshop': return 'transport'
    case 'under_repair': return 'repair'
    case 'awaiting_return': return 'return'
    case 'in_transit_to_site': return 'return'
    case 'delivered': return 'completion'
    case 'closed': return 'completion'
    default: return 'reported'
  }
}

export function transportationStageForStatus(status: string): string {
  switch (status) {
    case 'draft': return 'request'
    case 'assigned': return 'assignment'
    case 'dispatched': return 'vehicle'
    case 'in_transit': return 'trip'
    case 'delivered': return 'trip'
    case 'received': return 'completion'
    case 'invoiced': return 'cost'
    case 'paid': return 'history'
    case 'cancelled': return 'history'
    default: return 'request'
  }
}
