/**
 * خريطة الحالات الموحدة (Canonical status map).
 * المصدر الوحيد لتحويل نص الحالة العربية إلى نغمات الشارات —
 * تستخدمه مكوّنات الواجهة الموحدة في src/shared/ui فقط.
 */
export type BadgeTone = 'emerald' | 'amber' | 'red' | 'blue' | 'gray'

export const STATUS_TONE_MAP: Record<string, BadgeTone> = {
  // إيجابي
  متاح: 'emerald', يعمل: 'emerald', سليم: 'emerald', مكتمل: 'emerald', معتمد: 'emerald', ساري: 'emerald', سارية: 'emerald', نشط: 'emerald', 'تم التسليم': 'emerald',
  // تحذيري / قيد التنفيذ
  'تحت الصيانة': 'amber', 'بانتظار الفحص': 'amber', 'بانتظار النقل': 'amber', 'قيد الإصلاح': 'amber', 'بانتظار العودة': 'amber', 'بانتظار الاعتماد': 'amber', 'بانتظار قطع غيار': 'amber', 'قيد المراجعة': 'amber', 'متوقف مؤقتًا': 'amber', معلقة: 'amber', موقوف: 'amber', جسيم: 'amber', 'قيد الفحص': 'amber',
  // خطر / سلبي
  'خارج الخدمة': 'red', 'بانتظار الإصلاح': 'red', منتهي: 'red', منتهية: 'red', ملغى: 'red', ملغاة: 'red', حرج: 'red', عاجلة: 'red', حرجة: 'red',
  // معلوماتي
  'مخصص لمشروع': 'blue', 'قيد التنفيذ': 'blue', 'تم الإبلاغ': 'blue', 'في الطريق للورشة': 'blue', 'في الطريق للموقع': 'blue', مقدمة: 'blue', مسجلة: 'blue', بسيط: 'blue',
  // محايد
  مسودة: 'gray', مغلق: 'gray',
}

/** يحدد نغمة الشارة من نص الحالة، مع دعم نصوص العد التنازلي مثل «متبقي 5 أيام». */
export function resolveStatusTone(status: unknown): BadgeTone {
  const textValue = String(status ?? '').trim()
  return STATUS_TONE_MAP[textValue] ?? (textValue.startsWith('متبقي ') ? 'amber' : 'gray')
}
