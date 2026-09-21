# KEMEX v0.23.0 — Sprint 08 Branding + UI Hardening

## نطاق الدفعة
- تغيير الهوية الظاهرة للتطبيق من TFMS إلى KEMEX.
- تحديث اسم التطبيق في Navbar وتسجيل الدخول وعنوان المتصفح ووصف الصفحة.
- تحديث اسم حزمة الويب واسم GitHub Actions إلى KEMEX.
- تحويل أسماء ملفات التصدير الجديدة إلى KEMEX بدل TFMS.
- الإبقاء على مفاتيح التخزين وجداول Supabase وأسماء الملفات المرجعية التقنية `tfms_*` و`legacy/TFMS_Fixed.html` دون تغيير، لتجنب كسر بيانات Demo ومسار الترحيل الحالي.
- استمرار قواعد Sprint 08 الخاصة بالـ UI والـ Reference Resolver.

## التحقق
- `node scripts/verify-source.mjs` مطلوب أن يعرض `KEMEX source integrity: OK`.
- اختبار build الكامل ما زال مؤجلًا ضمن خطة QA.
