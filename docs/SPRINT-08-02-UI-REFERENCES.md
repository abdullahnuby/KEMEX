# Sprint 08-02 — Frontend visual system + reference integrity

## الهدف
رفع جودة الواجهة على مستوى النظام ومعالجة ظهور IDs/codes في الحقول التي يفترض أن تعرض أسماء بشرية.

## تم التنفيذ
- اعتماد IBM Plex Sans Arabic كخط العرض الأساسي مع Cairo fallback.
- تحسين Navbar والـdropdowns والـbuttons والـtables والـforms والـmodals والـmetric cards.
- تحسين مركز التقارير بصريًا مع الحفاظ على بنيته ووظائفه.
- توسيع Reference Resolver ليعالج صيغ مفاتيح legacy إضافية.
- إضافة fallback resolver: إذا كان المرجع غير معنون بوضوح (`ref`, `link`, `target`...) يتم البحث في الأصول والمشروعات والسائقين وأوامر العمل والـmodule records وعرض الاسم مع الكود الثانوي.
- تحويل مرجع `ref` في سجل التدقيق و`link` في الفواتير إلى عرض بشري.
- تمرير lookups الكاملة من App إلى الشاشتين.

## مؤجل
- اختبارات المتصفح الشاملة.
- typecheck/build الكامل.
- QA فعلي مع Supabase/RLS.
