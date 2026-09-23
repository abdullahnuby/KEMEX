import type { ReactNode } from 'react'

export type BadgeTone = 'emerald' | 'amber' | 'red' | 'blue' | 'gray'

const ARABIC_STATUS_MAP: Record<string, BadgeTone> = {
  متاح: 'emerald', يعمل: 'emerald', سليم: 'emerald', مكتمل: 'emerald', معتمد: 'emerald', ساري: 'emerald', سارية: 'emerald', نشط: 'emerald', 'تم التسليم': 'emerald',
  'تحت الصيانة': 'amber', 'بانتظار الفحص': 'amber', 'بانتظار النقل': 'amber', 'قيد الإصلاح': 'amber', 'بانتظار العودة': 'amber', 'بانتظار الاعتماد': 'amber', 'بانتظار قطع غيار': 'amber', 'قيد المراجعة': 'amber', 'متوقف مؤقتًا': 'amber', معلقة: 'amber', موقوف: 'amber', جسيم: 'amber', 'قيد الفحص': 'amber',
  'خارج الخدمة': 'red', 'بانتظار الإصلاح': 'red', منتهي: 'red', منتهية: 'red', ملغى: 'red', ملغاة: 'red', حرج: 'red', عاجلة: 'red', حرجة: 'red',
  'مخصص لمشروع': 'blue', 'قيد التنفيذ': 'blue', 'تم الإبلاغ': 'blue', 'في الطريق للورشة': 'blue', 'في الطريق للموقع': 'blue', مقدمة: 'blue', مسجلة: 'blue', بسيط: 'blue',
  مسودة: 'gray', مغلق: 'gray',
}

export interface StatusBadgeProps { children: ReactNode; tone?: BadgeTone; className?: string; dot?: boolean }

export function StatusBadge({ children, tone, className = '', dot = false }: StatusBadgeProps) {
  const textValue = String(children ?? '').trim()
  const resolvedTone: BadgeTone = tone ?? ARABIC_STATUS_MAP[textValue] ?? (textValue.startsWith('متبقي ') ? 'amber' : 'gray')
  return (
    <span className={`ui-status-badge ui-status-badge--${resolvedTone} ${className}`.trim()}>
      {dot && <span className="ui-status-badge__dot" aria-hidden="true" />}
      <span>{children}</span>
    </span>
  )
}
