# KEMEX v0.42.0 — Navigation Architecture & UX Correction

## المشكلة التي عالجها الإصدار

الواجهة كانت تعرض نفس مفهوم الصفحة/الوحدة أكثر من مرة:

1. اسم الـworkspace داخل الـNavbar.
2. `workspace-context` داخل الصفحة.
3. `workspace-tabs` داخل الصفحة.
4. عنوان الصفحة الفعلي داخل الشاشة.

هذا جعل المستخدم يمر بصريًا عبر 2–3 طبقات تنقل وعناوين لنفس المفهوم.

## القرار المعماري

### Global navigation

يوجد **Top Navbar واحد فقط**.

الـNavbar يعرض business domains الرئيسية:

- الرئيسية
- الأسطول
- الصيانة
- التشغيل
- النقل
- المخازن
- المالية
- التقارير
- الإدارة

أي domain له أكثر من وحدة يفتح **dropdown / mega menu** مباشرة من اسمه.

### Workspace navigation

تم حذف الـworkspace navigation من جسم الصفحة بالكامل.

لم تعد هناك:

- workspace context bar
- workspace tab bar
- duplicate workspace header

Route هو مصدر الحقيقة الوحيد للوحدة المفتوحة، والـNavbar هو مكان التنقل بين وحدات الـdomain.

## التقارير

التقارير الآن domain حقيقي داخل الـNavbar.

عند الضغط على «التقارير» يظهر Mega Dropdown مقسم إلى:

- الأصول والتكلفة
- التشغيل والنقل
- المتابعة والمخزون
- تحليلات متقدمة

اختيار تقرير يذهب إلى route مستقل مثل:

`#/reports/all`
`#/reports/fuel`
`#/reports/drivers`
`#/reports/trip-profitability`

أما تحليل التكلفة الحقيقية فيظل route مستقلًا:

`#/true-cost`

مع ظهوره داخل قائمة التقارير.

## جسم صفحة التقارير

لم تعد الصفحة تعرض شبكة اختيار لكل التقارير.

تحتوي فقط على:

- Page Header واحد
- تعريف التقرير الحالي
- Filters
- KPIs
- Chart / Analysis
- Detailed result

يمكن تغيير التقرير من الـNavbar بدل إعادة إنتاج report catalog داخل الصفحة.

## الاستمرارية

لم يتم تغيير:

- Supabase
- RLS
- database schema
- business calculations
- route semantics الأصلية باستثناء إضافة child report routes للعرض والتنقل
- permissions
- CRUD workflows

## ملاحظات QA

التحقق الكامل من `npm run typecheck` و`npm run build` يظل مرتبطًا بوجود dependencies كاملة وNode 24+؛ بيئة التحضير الحالية لا تحتوي الحزم التنفيذية كاملة.
