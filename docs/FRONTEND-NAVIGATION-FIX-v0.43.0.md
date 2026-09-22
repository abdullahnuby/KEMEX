# KEMEX v0.43.0 — Navigation Restoration & Information Architecture Fix

## Root cause
The previous navigation refactor incorrectly derived child navigation from `MODULES`. That configuration contains only one top-level item per business domain, so most dropdowns collapsed into one direct page and their child screens disappeared from the visible navigation.

## Corrected architecture
- `NAVIGATION_GROUPS` is now the canonical navigation source.
- Every business domain is represented as a true dropdown on the single top navbar.
- Child routes are explicitly listed and mapped to the existing App routing.
- Role checks use the real module permission key, including aliases such as `trips/dispatch -> trips`.
- Reports remain in the same top navbar as a categorized dropdown.
- No workspace header or secondary workspace navbar is introduced.
- Reports page no longer contains an additional report-picker surface; the current report is identified compactly and selection happens from the navbar.

## Domains restored
- الأسطول: الأصول، السائقون والمشغلون، عقود الإيجار
- الصيانة: أوامر العمل، الأعطال، الخطط، الزيوت والفلاتر، الإطارات
- التشغيل: التشغيل اليومي، طلبات المعدات، التخصيصات، الوقود، المشروعات
- النقل: رحلات النقل، لوحة الإرسال والتوزيع
- المخازن: المخازن وقطع الغيار، المشتريات
- المالية: التكاليف والإهلاك، التحميل الداخلي، الفواتير، العملاء
- التقارير: كل التقارير الحالية مع التحليل المتقدم
- الإدارة: المستخدمون والصلاحيات، سجل التدقيق، الإعدادات

## Verification
- TypeScript `tsc --noEmit`: PASS
- Navigation route coverage check: PASS
- Report picker markup removed from `ReportsPage`: PASS
- Existing App routing retained: PASS
