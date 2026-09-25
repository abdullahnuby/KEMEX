# KEMEX Dashboard — Deep Review / Sprint 01

تطوير صفحة لوحة المعلومات فقط، مع عزل CSS الخاص بها عن بقية الصفحات.

- هيدر خاص بالداشبورد ومحاذاة RTL صريحة.
- تحكم الفترة منفصل ومتجاوب.
- KPI: 3 أعمدة Desktop، عمودان Tablet، عمود واحد Mobile.
- اتجاه التكلفة يتغير مع الفترة المختارة.
- قائمة متابعة تعرض أسماء الأصول الفعلية وتوجه المستخدم للوحدة المرتبطة.
- الرسومات تتقلص داخل الحاوية.
- CSS جديد: `src/styles/dashboard-page.css`.

التحقق: TypeScript parser للملف `DashboardPage.tsx` بدون parse diagnostics، وتوازن أقواس CSS = متطابق. الـ production build يجب تشغيله في بيئة المشروع ذات dependencies المكتملة.
