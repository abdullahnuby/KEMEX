import type { ReactNode } from 'react'

const COLORS: Record<string, string> = {
  متاح: 'green',
  يعمل: 'teal',
  'مخصص لمشروع': 'blue',
  'تحت الصيانة': 'purple',
  'بانتظار الفحص': 'orange',
  'بانتظار الإصلاح': 'red',
  'متوقف مؤقتًا': 'orange',
  مكتمل: 'teal',
  'قيد التنفيذ': 'blue',
  'بانتظار الاعتماد': 'orange',
  معتمد: 'green',
  مقدمة: 'blue',
  مسودة: 'gray',
  ساري: 'green',
  منتهي: 'gray',
  'قيد المراجعة': 'orange',
}

export function StatusBadge({ children }: { children: ReactNode }) {
  const key = String(children)
  return <span className={`badge ${COLORS[key] ?? 'gray'}`}>{children}</span>
}
