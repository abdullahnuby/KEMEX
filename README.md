# KEMEX Web

منصة ويب عربية RTL باسم KEMEX لإدارة النقل والأسطول والمعدات والصيانة والوقود والتكاليف.

## الحالة

**v0.23.1 — Sprint 08 branding + UI hardening**

تم نقل هيكل النظام من النسخة HTML إلى React + TypeScript، مع طبقة Repository تدعم Demo Local Storage أو Supabase/PostgreSQL.

### الوحدات الحالية

- لوحة المعلومات
- التنبيهات والاستحقاقات
- الأصول والأسطول
- المشروعات
- الصيانة وأوامر العمل
- الوقود
- طلبات المعدات والتخصيصات والتشغيل والرحلات
- السائقون والمشغلون
- العقود وخطط الصيانة والزيوت والإطارات
- المخزون والحركة والمشتريات
- التكاليف والتحميل الداخلي والفواتير والعملاء
- التقارير والتصدير CSV
- المستخدمون والصلاحيات
- سجل التدقيق
- الإعدادات العامة

## تشغيل المشروع

```bash
npm install
npm run dev
```

ثم افتح:

```text
http://localhost:5173
```

## Supabase

انسخ `.env.example` إلى `.env.local` وأضف:

```text
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

نفّذ ملفات SQL بالترتيب:

```text
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_hardening_and_indexes.sql
supabase/seed.sql
supabase/seed_module_records.sql
```

الجداول في `public` محمية بـRLS، والـmigration تحتوي على GRANTs صريحة لدور `authenticated` حتى لا يعتمد النظام على التعرض التلقائي للـData API.

## Build

```bash
npm run typecheck
npm run build
```

يوجد GitHub Actions في `.github/workflows/ci.yml` لبناء المشروع باستخدام Node 24.

## ملاحظات

- `legacy/TFMS_Fixed.html` محفوظ كمرجع للمنطق والتصميم الأصلي.
- بيانات Demo لا تمثل بيانات تشغيل حقيقية.
- إدارة كلمة المرور والمستخدمين الفعلية تعتمد على Supabase Auth؛ صفحة المستخدمين تدير ملف المستخدم والدور والحالة.

## v0.5.0 — Status transition history
- Generic records now write a row to `approval_events` whenever their status changes in Supabase, including initial status assignment and previous/next values.
- Demo/local mode writes a corresponding status-change entry to the local audit log.
- Existing CRUD flow remains unchanged; this is a transition history foundation, not a complete role-based approval inbox or notification delivery implementation.
- Apply migrations in order through `003_workflow_documents_notifications.sql` before relying on workflow history in Supabase.


## v0.6.0 — قوائم حالات السجلات
- إضافة مرشحات سريعة لقوائم السجلات: الكل، قيد الإجراء، معتمد/مكتمل، ومرفوض مع أعداد كل مجموعة.
- تمييز الحالات بالألوان وتوضيح عدد النتائج المعروضة من إجمالي السجلات.
- التصنيف يعتمد على نص الحالة المخزن، ولا ينشئ إجراء اعتماد أو يغير الحالة تلقائياً.


## الإصدار 0.8.0
- إضافة تصدير CSV إلى وحدات السجلات العامة. التصدير يشمل النتائج الحالية بعد تطبيق البحث وتصفية الحالة، مع ترميز UTF-8 BOM لتحسين التوافق مع Excel.


## v0.9.0 — مواءمة الهوية البصرية
- إعادة ضبط ألوان الخلفية والنصوص والحدود واللون الأساسي لتقترب من مرجع HTML الأصلي.
- توحيد عرض الشريط الجانبي والمسافات العلوية ومحيط محتوى الصفحات مع المرجع.
- تخفيف الظلال وتوحيد حواف البطاقات والجداول.
- لم تتغير منطقية البيانات أو مسارات الوظائف في هذه المرحلة.
- فحص TypeScript تعذر إتمامه لأن حزم React وVite وLucide غير موجودة/غير مكتملة داخل `node_modules` في بيئة الفحص.


## v0.9.6 — توسيع تصدير السجلات
- أصبح تصدير CSV يتضمن جميع الحقول المعرفة للموديول، بدل الاقتصار على الأعمدة المختصرة الظاهرة في الجدول.
- يظل التصدير ملتزمًا بنتائج البحث وتصفية الحالة الحالية.
- تأخير تحرير رابط التنزيل قليلًا لتحسين التوافق مع المتصفحات.


## متابعة التنفيذ

راجع [قائمة متابعة التنفيذ](./docs/IMPLEMENTATION_CHECKLIST.md) لمعرفة حالة التابات والوظائف والفجوات المعروفة وخطة الاختبار.

## v0.16.0 — Sprint 08-03
- ترقية الواجهة العربية RTL بخط وتسلسل بصري أكثر احترافية، مع بطاقات وحقول وجداول ونوافذ منبثقة محسّنة.
- تثبيت Navbar علوي احترافي بقوائم منسدلة وأيقونات سياقية للمجموعات.
- إعادة بناء مركز التقارير كمساحة عمل متدرجة: اختيار التقرير ← المرشحات ← مؤشرات النتيجة ← الجدول.
- توحيد عرض أسماء الأصول والمشروعات في التقارير ولوحة المعلومات، مع إبقاء الكود كمرجع ثانوي.
- توسيع Reference Resolver ليغطي مفاتيح الأصول والمشروعات والمعدات والمركبات بصيغ أكثر.
- تحسين قوائم اختيار الأصول والمشروعات لتقديم الاسم قبل الكود.
- اختبارات المتصفح وProduction build واختبارات Supabase/RLS ما زالت مرحلة QA اللاحقة.
