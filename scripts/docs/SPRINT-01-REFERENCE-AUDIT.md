# Sprint 01 — Reference & Navigation Audit

## Goal
Establish a verified route/page inventory from `legacy/TFMS_Fixed.html` and compare it with the React navigation and route switch before implementing further modules.

## Reference navigation inventory

| Group | Route | Reference label | React navigation |
|---|---|---|---|
| الرئيسية | dashboard | لوحة المعلومات | Present |
| الرئيسية | alerts | التنبيهات | Present |
| التشغيل | requests | طلبات المعدات | Present |
| التشغيل | assignments | التخصيصات | Present |
| التشغيل | operations | التشغيل اليومي | Present |
| التشغيل | trips | الرحلات | Present |
| البيانات الأساسية | projects | المشروعات | Present |
| البيانات الأساسية | assets | الأصول والأسطول | Present |
| البيانات الأساسية | drivers | السائقون والمشغلون | Present |
| البيانات الأساسية | customers | العملاء | Present |
| الصيانة والمواد | plans | خطط الصيانة | Present |
| الصيانة والمواد | maintenance | أوامر العمل | Present |
| الصيانة والمواد | oils | الزيوت والفلاتر | Present |
| الصيانة والمواد | tires | الإطارات | Present |
| الصيانة والمواد | fuel | الوقود | Present |
| الصيانة والمواد | inventory | المخازن وقطع الغيار | Present |
| الصيانة والمواد | movements | حركة المخزون | Present |
| الصيانة والمواد | purchases | المشتريات | Present |
| المالية | costs | التكاليف والإهلاك | Present |
| المالية | charging | التحميل الداخلي | Present |
| المالية | invoices | الفواتير والمستحقات | Present |
| التقارير والإدارة | reports | التقارير | Present |
| التقارير والإدارة | users | المستخدمون | Present |
| التقارير والإدارة | audit | سجل التدقيق | Present |
| التقارير والإدارة | settings | الإعدادات | Present |

## Additional reference routes

| Route | Reference title | React route status |
|---|---|---|
| contracts | عقود الإيجار | Route/config exists but is absent from `MODULES` navigation; unreachable through the normal sidebar unless manually entered |
| asset/:id | بطاقة الأصل | Reference supports asset detail route; React `App.tsx` currently routes `asset` to the generic placeholder path rather than a dedicated asset detail view |

## Sprint findings

1. **Confirmed navigation gap:** `contracts` exists in module configuration and is handled by repository logic, but the React `MODULES` sidebar list omits it. Add it in the matching reference group and verify role permissions.
2. **Confirmed route gap:** the reference has an `asset/:id` detail view. React has no dedicated case for `asset`; it falls through to `ModulePlaceholderPage`. Implement the detail route and link to it from asset rows/cards.
3. The reference exposes 25 primary navigation entries across six groups. React `MODULES` currently includes those primary keys, but this alone does not verify their workflows.
4. Several listed modules use the shared `ModuleRecordsPage`; their existence is not evidence of specialized business rules, linked records, approvals, or calculations.
5. Current `npm run typecheck` could not provide a valid project type-check: React, lucide-react, Supabase, Vite, and associated type packages are absent from `node_modules`. The resulting module-resolution diagnostics cascade into JSX/type errors; treat this as an environment/dependency blocker, not a clean test result.

## Status
- [x] Extracted reference sidebar groups and primary routes.
- [x] Compared primary navigation routes against React `MODULES`.
- [x] Identified missing Contracts sidebar entry.
- [x] Identified missing dedicated Asset Detail route.
- [ ] Implement and test the Contracts navigation entry and permissions.
- [ ] Implement and test Asset Detail route and navigation from assets.
- [ ] Install project dependencies reproducibly and run typecheck/build.
- [ ] Continue the page-by-page control and workflow audit.

## Sprint outcome
Audit and gap identification completed from source inspection. This sprint is **not** a functional completion sprint: the two confirmed route gaps remain open, and a full build could not be verified due to missing dependencies.
