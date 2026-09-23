# Sprint 08-03 — UI consistency and reference audit

## Scope
- توحيد الخط والـUI tokens والجداول والنماذج والنوافذ المنبثقة.
- تحسين الـNavbar والأيقونات والإجراءات.
- منع ظهور معرفات الأصول والمشروعات الخام في العرض عند توفر السجل المرجعي.
- معالجة الشاشات والتقارير التي ما زالت تعتمد على IDs legacy.

## Changes
- استخدم IBM Plex Sans Arabic كخط أساسي مع Cairo كبديل.
- أضيفت طبقة polish نهائية للجداول والحقول والأزرار والـdialogs والتقارير.
- Assignment/Create يعرض اسم المشروع.
- Invoices يستخدم اختيارًا مرجعيًا للأصل/المشروع/العقد/العميل بدل إدخال ID يدويًا.
- Reports لا يكرر عمود الكود للأصل؛ الاسم مع الكود الثانوي داخل الخلية، ويحل مراجع asset القديمة بالكود أو المعرف.
- Alerts تعرض اسم الأصل أولًا.
- Costs/Charging/Plans تقبل بيانات asset القديمة التي تخزن code بدل id.
- تمت مزامنة الإصدار مع 0.16.0.

## Verification status
- Source integrity check: to run after final packaging.
- Full typecheck/build/browser/Supabase QA: deferred to QA stage.
