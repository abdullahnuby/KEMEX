# KEMEX v0.42.0 — Engineering Prompt
## Single Navbar / Dropdown-First Navigation / Zero Duplicate Headers

أنت Lead Frontend Architect وUX Engineer.

أعد بناء KEMEX بحيث يكون هناك نموذج تنقل واحد واضح:

`Header + Top Navbar → Page Header → Page Content`

ولا تسمح بأي طبقة ثانية من الـworkspace navigation داخل الصفحة.

## القواعد غير القابلة للتفاوض

### 1. Top Navbar واحد فقط

يجب أن يكون هناك Top Navbar واحد على سطح المكتب.

ممنوع:

- Sidebar
- Secondary navbar
- Workspace tabs bar
- Duplicate context navigation
- Duplicate page title داخل header العالمي

### 2. كل Business Domain في الـNavbar

الأزرار الرئيسية:

- الرئيسية
- الأسطول
- الصيانة
- التشغيل
- النقل
- المخازن
- المالية
- التقارير
- الإدارة

إذا كان الـdomain يحتوي أكثر من وحدة:

- click على اسم الـdomain يفتح dropdown / mega menu
- لا تنشئ tabs إضافية أسفل الـNavbar
- لا تنقل المستخدم إلى شاشة وسيطة لا معنى لها

### 3. الـNavbar brand لا يكرر عنوان الصفحة

الـbrand يعرض KEMEX وهوية المنتج فقط.

لا تعرض مثلًا «التشغيل اليومي» داخل الـbrand ثم تعرضه مرة ثانية داخل PageHeader.

### 4. Workspace wrapper

احذف من markup:

- workspace-context
- workspace-shell
- workspace-tabs

Route الحالي هو الـstate الذي يحدد الصفحة.

### 5. صلاحيات الـworkspace

الوحدات الظاهرة في الـdropdown يجب أن تحترم `canViewModule`.

لا تعرض route للمستخدم غير المصرح له.

### 6. Dropdown design

الـdropdown ليس menu صغيرًا تقليديًا.

استخدم mega-menu خفيفًا:

- width مريح
- sections
- icons صغيرة
- عنوان واضح
- hint قصير
- active state
- subtle shadow
- border
- RTL alignment
- keyboard usable
- click outside closes

### 7. التقارير كـdomain

«التقارير» يجب أن يفتح dropdown من الـNavbar.

لا تعرض Catalog التقارير داخل جسم صفحة التقارير.

قسم التقارير إلى:

**الأصول والتكلفة**
- التقرير الشامل لجميع الأصول
- الأصول المملوكة والإهلاك
- الأصول المستأجرة والعقود
- السيارات والمركبات
- المعدات والمولدات
- عقود الإيجار

**التشغيل والنقل**
- الوقود والاستهلاك
- أداء السائقين والمشغلين
- ربحية عمليات النقل
- النقل غير المفوتر

**المتابعة والمخزون**
- الاستحقاقات
- المخزون وقطع الغيار
- الموافقات المعلقة

**تحليلات متقدمة**
- تحليل التكلفة الحقيقية

### 8. Routes التقارير

استخدم:

`reports/all`
`reports/owned`
`reports/rented`
`reports/veh`
`reports/eq`
`reports/contracts`
`reports/fuel`
`reports/drivers`
`reports/trip-profitability`
`reports/unbilled`
`reports/due`
`reports/invn`
`reports/appr`

وابقِ:

`true-cost`

كتحليل متخصص.

يجب أن يعتبر App كل `reports/*` جزءًا من module `reports` من ناحية permission.

### 9. ReportsPage

لا تعرض:

- Grid بكل التقارير
- Report Picker ضخم
- زر Run Report كخطوة إلزامية
- selector إضافي لتغيير التقرير إذا كان اختياره متاحًا من Navbar

جسم الصفحة:

`PageHeader`

ثم:

`Current Report Summary`

ثم:

`Filters`

ثم:

`KPIs + Analysis Chart`

ثم:

`Detailed Results`

### 10. لا تكرر المعلومة

إذا ظهرت كلمة «التقارير» في الـNavbar فلا تعيد إنشاء عنوان «التقارير» كـworkspace header.

إذا ظهر اسم التقرير الحالي داخل الصفحة فلا تعيد ظهوره في ثلاثة أماكن.

كل مستوى له وظيفة واحدة:

- Navbar = أين أنا وكيف أتنقل؟
- Page Header = ماذا أفعل هنا؟
- Content = البيانات والإجراء

### 11. Responsive

على mobile:

- top navbar compact
- dropdown groups داخل mobile menu
- التقارير بنفس grouping
- لا sidebar دائم

### 12. Business logic

لا تغيّر:

- database
- Supabase
- repositories
- RLS
- calculations
- CRUD contracts
- role semantics

### 13. Verification

افحص:

- لا يوجد `workspace-tabs` في markup
- لا يوجد `workspace-context` في markup
- لا يوجد `report-picker` في markup
- `reports/*` يصل إلى ReportsPage
- active group = التقارير لكل `reports/*`
- true-cost يظهر تحت التقارير
- permissions لا تتجاوز canViewModule
- production build بعد `npm ci` على Node 24

## النتيجة المطلوبة

المستخدم يرى منتجًا بسيطًا بصريًا ومتماسكًا:

`KEMEX Header + One Top Navbar`

ثم:

`Page Header`

ثم:

`Actual Work`

ولا يوجد أي شريط تنقل ثانٍ داخل الصفحة.
