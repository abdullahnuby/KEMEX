# KEMEX v0.29.0 — Maintenance & Inventory

- مخزون حقيقي عبر `inventory_items` و`stock_movements`.
- حركات المخزون ذرية عبر RPC في PostgreSQL.
- الرصيد الافتتاحي للصنف يتم تسجيله كحركة استلام داخل نفس المعاملة.
- منع تعديل `current_qty` و`opening_qty` من واجهة العميل.
- مخازن مستقلة ونقاط إعادة الطلب.
- ربط صرف قطع الغيار بالأصل وأمر العمل والمشروع.
- الصرف ينعكس على `cost_entries` عند وجود أمر عمل وتكلفة.
- إضافة Master Data للفنيين وقطع غيار الصيانة.
- بدون بيانات Mock أو معاملات وهمية.


## Integrity notes
Stock creation and movements use database RPCs with row locking and server-side balance updates. Opening balances are posted as real stock movements; no seed records are created. Work-order and issued-parts costs synchronize into the cost ledger through database triggers.
