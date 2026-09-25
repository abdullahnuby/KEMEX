# KEMEX GPS Tracking — Final Integrated Package

هذه الحزمة تعالج مشكلة ظهور /tracking كوحدة عامة بدل صفحة GPS حقيقية.

## التثبيت
من PowerShell داخل مجلد KEMEX:

```powershell
node install-gps-tracking-final.mjs
```

بعدها شغّل:

```powershell
npm.cmd run test:gps
npm.cmd run test:driver
npm.cmd run test:enterprise-sprint
npm.cmd run test:db
npm.cmd run test:security
npm.cmd run verify:migrations
npm.cmd run test:source
npm.cmd run verify:source
npm.cmd run test:map
npm.cmd run typecheck
npm.cmd run build
```

## الربط الذي يتم تثبيته
- Navbar: `المراقبة > تتبع المركبات`
- Route صريح: `/tracking`
- GpsTrackingPage قبل route `:moduleKey` العام
- خريطة GPS
- شاحنات/أصول + أجهزة GPS
- سجل آخر موقع ومسار 24 ساعة
- تسجيل وتفعيل/تعطيل أجهزة GPS
- `gps:manage_devices`
- Windows-safe migration verifier

لا يتم إنشاء Supabase client جديد.
