# TFMS Web v0.16.0

## Sprint 08-03 — UI consistency + reference hardening

تمثل هذه النسخة دفعة تحسين Frontend ومراجعة للمراجع البشرية داخل الواجهة.

### Frontend
- اعتماد IBM Plex Sans Arabic كخط أساسي.
- توحيد typography والحقول والجداول والأزرار والنوافذ المنبثقة.
- تحسين Navbar والقوائم المنسدلة والأيقونات والإجراءات.
- تحسين بطاقات التقارير وعرض نتائجها.
- تحسين الحالات البصرية للتفاعل والتركيز والـhover.

### References
- عرض اسم الأصل/المشروع/المرجع أولًا والكود كمعلومة ثانوية.
- Assignment Create يعرض اسم المشروع.
- Invoices تستخدم اختيارًا مرجعيًا بدل إدخال ID خام للارتباط.
- Reports تحل asset references المخزنة كـid أو code.
- Alerts تعرض الاسم أولًا.
- Costs/Charging/Plans تتعامل مع asset id/code في بيانات legacy.

### Verification
- `node scripts/verify-source.mjs`: passed.
- Full browser QA, typecheck/build, and Supabase/RLS QA remain intentionally deferred.
