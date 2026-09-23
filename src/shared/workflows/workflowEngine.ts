export type WorkflowDomain = 'maintenance' | 'transportation' | 'purchase' | 'supplierInvoice' | 'customerInvoice'

export type WorkflowRule = {
  from: string
  to: readonly string[]
}

const RULES: Record<WorkflowDomain, readonly WorkflowRule[]> = {
  maintenance: [
    { from: 'بانتظار الاعتماد', to: ['مفتوح', 'ملغى'] },
    { from: 'مفتوح', to: ['قيد التنفيذ', 'ملغى'] },
    { from: 'قيد التنفيذ', to: ['بانتظار قطع غيار', 'مكتمل'] },
    { from: 'بانتظار قطع غيار', to: ['قيد التنفيذ', 'مكتمل'] },
    { from: 'مكتمل', to: [] },
    { from: 'ملغى', to: [] },
  ],
  transportation: [
    { from: 'draft', to: ['assigned', 'cancelled'] },
    { from: 'assigned', to: ['dispatched', 'cancelled'] },
    { from: 'dispatched', to: ['in_transit', 'cancelled'] },
    { from: 'in_transit', to: ['delivered', 'cancelled'] },
    { from: 'delivered', to: ['received'] },
    { from: 'received', to: ['invoiced'] },
    { from: 'invoiced', to: ['paid'] },
    { from: 'paid', to: [] },
    { from: 'cancelled', to: [] },
  ],
  purchase: [
    { from: 'قيد الاعتماد', to: ['معتمد', 'مرفوض'] },
    { from: 'معتمد', to: ['أمر شراء'] },
    { from: 'أمر شراء', to: ['مستلم جزئي', 'مستلم بالكامل'] },
    { from: 'مستلم جزئي', to: ['مستلم بالكامل'] },
    { from: 'مستلم بالكامل', to: [] },
    { from: 'مرفوض', to: [] },
  ],
  supplierInvoice: [
    { from: 'مسجلة', to: ['بانتظار مراجعة', 'مرفوضة'] },
    { from: 'بانتظار مراجعة', to: ['معتمدة', 'مرفوضة'] },
    { from: 'معتمدة', to: ['مرحلة'] },
    { from: 'مرحلة', to: ['مدفوعة'] },
    { from: 'مدفوعة', to: [] },
    { from: 'مرفوضة', to: [] },
  ],
  customerInvoice: [
    { from: 'مسجلة', to: ['بانتظار مراجعة', 'مرفوضة'] },
    { from: 'بانتظار مراجعة', to: ['معتمدة', 'مرفوضة'] },
    { from: 'معتمدة', to: ['محصلة'] },
    { from: 'محصلة', to: [] },
    { from: 'مرفوضة', to: [] },
  ],
}

export function allowedTransitions(domain: WorkflowDomain, from: string): readonly string[] {
  return RULES[domain].find(rule => rule.from === from)?.to ?? []
}

export function canTransition(domain: WorkflowDomain, from: string | null | undefined, to: string | null | undefined): boolean {
  if (!to) return false
  if (!from || from === to) return true
  return allowedTransitions(domain, from).includes(to)
}

export function assertTransition(domain: WorkflowDomain, from: string | null | undefined, to: string | null | undefined): void {
  if (!to || !from || from === to) return
  if (!canTransition(domain, from, to)) {
    throw new Error(`انتقال غير مسموح في دورة العمل: ${from} ← ${to}`)
  }
}

export function workflowDomainForModule(module: string, invoiceKind?: string): WorkflowDomain | null {
  if (module === 'purchases') return 'purchase'
  if (module === 'invoices') return invoiceKind === 'عميل' ? 'customerInvoice' : 'supplierInvoice'
  return null
}
