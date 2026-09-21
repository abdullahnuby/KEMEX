-- 008 — Security & integrity hardening
-- ---------------------------------------------------------------------------
-- يعالج الفجوات اللي طلعت في مراجعة v0.23.1:
--   1) can_module كانت تتجاهل operation_name (القراءة = الكتابة) وmgmt مش موجود في معظم القوائم
--   2) مصفوفتان متعارضتان (SQL و MODULE_ROLES في الواجهة) -> مصفوفة واحدة في القاعدة
--   3) سياسات الكتابة على الجداول المفهرسة أوسع من المفروض (mgmt يكتب، eng يعدّل الأصول...)
--   4) الاعتمادات (status) كانت تُفرض في الواجهة فقط -> حارس انتقالات داخل القاعدة
--   5) audit_log و approval_events كانوا بيتكتبوا من العميل (قابلة للتزوير/الفشل الجزئي)
--   6) ترقيم المستندات (REQ-/AS-/TRP-/PR-) كان length+1 في المتصفح -> تعارض عند مستخدمين متزامنين
--   7) profiles: مفيش GRANT update لذلك تعديل الدور من صفحة المستخدمين ممكن يفشل، ولا حماية لآخر أدمن
-- شغّله بعد 001..007.
-- ---------------------------------------------------------------------------

-- ===== 1) مصفوفة الصلاحيات (قراءة/كتابة) =====================================
create table if not exists private.module_permissions (
  module_name text not null,
  role        text not null check (role in ('admin','mgmt','fleet','pm','eng','maint','acct')),
  can_read    boolean not null default false,
  can_write   boolean not null default false,
  primary key (module_name, role)
);
truncate private.module_permissions;

-- القراءة: مرايا ROLE_MODULES (الواجهة) + mgmt يقرأ كل شيء.
-- الكتابة: مرايا MODULE_ROLES + الأدوار المذكورة صراحة في workflows (مثلاً pm يعتمد الرحلات).
with m(module_name, readers, writers) as (values
  ('requests',    'admin,mgmt,fleet,pm,eng,maint',        'admin,fleet,pm,eng'),
  ('assignments', 'admin,mgmt,fleet,pm',                  'admin,fleet'),
  ('operations',  'admin,mgmt,fleet,pm,eng,acct',         'admin,fleet,pm,eng'),
  ('trips',       'admin,mgmt,fleet,pm',                  'admin,fleet,pm'),
  ('drivers',     'admin,mgmt,fleet,pm,eng,maint',        'admin,fleet'),
  ('contracts',   'admin,mgmt,fleet,acct',                'admin,fleet'),
  ('plans',       'admin,mgmt,fleet,maint',               'admin,maint'),
  ('oils',        'admin,mgmt,fleet,maint',               'admin,maint'),
  ('tires',       'admin,mgmt,fleet,maint',               'admin,maint'),
  -- oilChanges / tireOps / tanks: الواجهة بتقرأهم وتكتبهم من tfms_module_records لكن v0.23.1 ما عرّفتهمش
  -- في can_module، فكانوا admin-only: الصيانة ما تقدرش تسجّل تغيير زيت أو عملية إطار، والتكاليف ناقصة للباقي.
  ('oilChanges',  'admin,mgmt,fleet,pm,maint,acct',       'admin,maint'),
  ('tireOps',     'admin,mgmt,fleet,pm,maint,acct',       'admin,maint'),
  ('tanks',       'admin,mgmt,fleet,maint',               'admin,fleet'),
  ('inventory',   'admin,mgmt,fleet,maint',               'admin,maint'),
  ('movements',   'admin,mgmt,fleet,maint',               'admin,maint'),
  ('purchases',   'admin,mgmt,fleet,maint',               'admin,fleet,maint'),
  ('costs',       'admin,mgmt,fleet,pm,acct',             'admin'),
  ('charging',    'admin,mgmt,fleet,pm,acct',             'admin,fleet,acct'),
  ('invoices',    'admin,mgmt,fleet,acct',                'admin,acct'),
  ('customers',   'admin,mgmt,acct',                      'admin,acct'),
  ('audit',       'admin,mgmt,fleet,maint,acct',          'admin')
)
insert into private.module_permissions(module_name, role, can_read, can_write)
select m.module_name, r.role,
       r.role = any(string_to_array(m.readers, ',')),
       r.role = any(string_to_array(m.writers, ','))
from m cross join (values ('admin'),('mgmt'),('fleet'),('pm'),('eng'),('maint'),('acct')) as r(role);

create or replace function private.can_module(module_name text, operation_name text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select case
    when private.current_role() is null then false
    when private.current_role() = 'admin' then true
    else coalesce((
      select case when operation_name = 'read' then p.can_read else p.can_write end
      from private.module_permissions p
      where p.module_name = can_module.module_name
        and p.role = private.current_role()
    ), false)
  end
$$;
revoke execute on function private.can_module(text, text) from public;
grant  execute on function private.can_module(text, text) to authenticated;

-- ===== 2) تضييق سياسات الجداول المفهرسة =======================================
-- projects: mgmt للقراءة فقط
drop policy if exists projects_write  on public.projects;
drop policy if exists projects_update on public.projects;
create policy projects_write  on public.projects for insert to authenticated
  with check (private.has_role(array['admin','fleet','pm','acct']));
create policy projects_update on public.projects for update to authenticated
  using      (private.has_role(array['admin','fleet','pm','acct']))
  with check (private.has_role(array['admin','fleet','pm','acct']));

-- drivers / contracts: نفس مصفوفة MODULE_ROLES (admin,fleet)
drop policy if exists drivers_write  on public.drivers;
drop policy if exists drivers_update on public.drivers;
create policy drivers_write  on public.drivers for insert to authenticated
  with check (private.has_role(array['admin','fleet']));
create policy drivers_update on public.drivers for update to authenticated
  using (private.has_role(array['admin','fleet'])) with check (private.has_role(array['admin','fleet']));

drop policy if exists contracts_write  on public.contracts;
drop policy if exists contracts_update on public.contracts;
create policy contracts_write  on public.contracts for insert to authenticated
  with check (private.has_role(array['admin','fleet']));
create policy contracts_update on public.contracts for update to authenticated
  using (private.has_role(array['admin','fleet'])) with check (private.has_role(array['admin','fleet']));

-- assets: pm يحتاج التحديث لأن اعتماد التشغيل يحدّث عداد الأصل. eng/maint خارج الكتابة.
drop policy if exists assets_write  on public.assets;
drop policy if exists assets_update on public.assets;
create policy assets_write  on public.assets for insert to authenticated
  with check (private.has_role(array['admin','fleet','pm']));
create policy assets_update on public.assets for update to authenticated
  using (private.has_role(array['admin','fleet','pm'])) with check (private.has_role(array['admin','fleet','pm']));

-- work_orders: eng خارج الصيانة
drop policy if exists work_orders_write  on public.work_orders;
drop policy if exists work_orders_update on public.work_orders;
create policy work_orders_write  on public.work_orders for insert to authenticated
  with check (private.has_role(array['admin','fleet','maint']));
create policy work_orders_update on public.work_orders for update to authenticated
  using (private.has_role(array['admin','fleet','maint'])) with check (private.has_role(array['admin','fleet','maint']));

-- fuel: المحاسب يقرأ فقط
drop policy if exists fuel_write  on public.fuel_operations;
drop policy if exists fuel_update on public.fuel_operations;
create policy fuel_write  on public.fuel_operations for insert to authenticated
  with check (private.has_role(array['admin','fleet']));
create policy fuel_update on public.fuel_operations for update to authenticated
  using (private.has_role(array['admin','fleet'])) with check (private.has_role(array['admin','fleet']));

-- ===== 3) profiles: صلاحية التعديل + حماية آخر أدمن ===========================
-- تعديل الأعمدة الثلاثة فقط (email لا يتغير من الواجهة). RLS تحصر التعديل في الأدمن.
grant update (full_name, role, active) on public.profiles to authenticated;

create or replace function private.protect_admins()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  demoting boolean := false;
begin
  if tg_op = 'DELETE' then
    demoting := old.role = 'admin' and old.active;
  else
    -- منع المستخدم من تغيير دوره/حالته بنفسه (تعديل من SQL Editor بدون جلسة مسموح للتهيئة الأولى)
    if auth.uid() is not null and old.id = auth.uid()
       and (new.role is distinct from old.role or new.active is distinct from old.active) then
      raise exception 'لا يمكنك تغيير دورك أو حالة حسابك بنفسك' using errcode = '42501';
    end if;
    demoting := old.role = 'admin' and old.active and (new.role <> 'admin' or new.active is not true);
  end if;

  -- منع فقدان آخر مدير نظام
  if demoting and not exists (
       select 1 from public.profiles p where p.role = 'admin' and p.active and p.id <> old.id) then
    raise exception 'لا يمكن إزالة أو إيقاف آخر مدير نظام' using errcode = '23514';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
drop trigger if exists trg_profiles_protect_admins on public.profiles;
create trigger trg_profiles_protect_admins before update or delete on public.profiles
  for each row execute function private.protect_admins();

-- ===== 4) دورة الاعتماد داخل القاعدة =========================================
create table if not exists private.workflow_initial (
  module_name text primary key,
  statuses    text[] not null
);
create table if not exists private.workflow_transitions (
  module_name text not null,
  from_status text not null,
  to_status   text not null,
  roles       text[] not null,
  primary key (module_name, from_status, to_status)
);
truncate private.workflow_initial, private.workflow_transitions;

insert into private.workflow_initial values
  ('requests',    array['مسودة']),
  ('assignments', array['ساري']),
  ('operations',  array['مقدمة','مسودة']),
  ('trips',       array['بانتظار الاعتماد']),
  ('purchases',   array['قيد الاعتماد']);

insert into private.workflow_transitions(module_name, from_status, to_status, roles) values
  ('requests','مسودة','بانتظار اعتماد مدير المشروع',            array['fleet','pm','eng']),
  ('requests','معاد للتعديل','بانتظار اعتماد مدير المشروع',     array['fleet','pm','eng']),
  ('requests','بانتظار اعتماد مدير المشروع','معتمد من مدير المشروع', array['fleet','pm']),
  ('requests','بانتظار اعتماد مدير المشروع','معاد للتعديل',     array['fleet','pm']),
  ('requests','بانتظار اعتماد مدير المشروع','مرفوض',            array['fleet','pm']),
  ('requests','معتمد من مدير المشروع','قيد التنفيذ',             array['fleet']),     -- تخصيص أصل
  ('requests','قيد التنفيذ','مكتمل',                             array['fleet','pm']),
  ('assignments','ساري','منتهي',                                 array['fleet']),
  ('operations','مسودة','مقدمة',                                 array['fleet','pm','eng']),
  ('operations','معادة','مقدمة',                                 array['fleet','pm','eng']),
  ('operations','مقدمة','معتمد',                                 array['fleet','pm']),
  ('operations','مقدمة','معادة',                                 array['fleet','pm']),
  ('trips','بانتظار الاعتماد','مكتملة',                          array['fleet','pm']),
  ('purchases','قيد الاعتماد','معتمد',                           array['fleet','maint']),
  ('purchases','قيد الاعتماد','مرفوض',                           array['fleet','maint']),
  ('purchases','معتمد','أمر شراء',                               array['fleet','maint']);

-- ترقيم المستندات من الخادم
create table if not exists private.doc_counters (
  module_name text primary key,
  prefix      text   not null,
  last_value  bigint not null
);
insert into private.doc_counters(module_name, prefix, last_value) values
  ('requests','REQ-',500), ('assignments','AS-',300), ('trips','TRP-',100), ('purchases','PR-',100)
on conflict (module_name) do nothing;

-- ابدأ العدّاد من أعلى رقم موجود فعلًا
update private.doc_counters c
set last_value = greatest(c.last_value, coalesce((
  select max(regexp_replace(r.payload->>'number', '\D', '', 'g')::bigint)
  from public.tfms_module_records r
  where r.module_name = c.module_name
    and r.payload->>'number' ~ ('^' || c.prefix || '\d+$')
), 0));

do $$
begin
  create unique index if not exists module_records_number_uq
    on public.tfms_module_records (module_name, (payload->>'number'))
    where module_name in ('requests','assignments','trips','purchases')
      and coalesce(payload->>'number','') <> '';
exception when unique_violation then
  raise notice 'يوجد أرقام مستندات مكررة في البيانات الحالية؛ لم يُنشأ الفهرس الفريد. راجعها ثم أعد تشغيل هذا الأمر.';
end $$;

create or replace function private.guard_module_workflow()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  r          text := private.current_role();
  old_status text;
  new_status text := new.payload->>'status';
  existing   public.tfms_module_records%rowtype;
  cnt        record;
  trusted    boolean := auth.uid() is null;  -- SQL Editor / service role / seed: لا يوجد مستخدم نهائي
begin
  -- ذكر حالة INSERT عندما يكون السجل موجودًا (upsert): نترك المسار لمشغّل UPDATE
  if tg_op = 'INSERT' then
    select * into existing from public.tfms_module_records
     where module_name = new.module_name and record_id = new.record_id;
    if found then return new; end if;
  end if;

  if tg_op = 'UPDATE' then
    old_status := old.payload->>'status';
    -- الرقم يُحدَّد من الخادم مرة واحدة ولا يتغير
    if old.payload ? 'number' and coalesce(old.payload->>'number','') <> '' then
      new.payload := jsonb_set(new.payload, '{number}', old.payload->'number');
    end if;
  end if;

  if not trusted and r is distinct from 'admin'
     and exists (select 1 from private.workflow_initial w where w.module_name = new.module_name) then
    if tg_op = 'INSERT' then
      if not exists (select 1 from private.workflow_initial w
                     where w.module_name = new.module_name and new_status = any(w.statuses)) then
        raise exception 'الحالة الابتدائية "%" غير مسموحة في وحدة %', coalesce(new_status,'—'), new.module_name
          using errcode = '42501';
      end if;
    elsif new_status is distinct from old_status then
      if not exists (select 1 from private.workflow_transitions t
                     where t.module_name = new.module_name
                       and t.from_status = old_status and t.to_status = new_status
                       and r = any(t.roles)) then
        raise exception 'الانتقال "% ← %" غير مسموح للدور % في وحدة %',
          coalesce(old_status,'—'), coalesce(new_status,'—'), coalesce(r,'?'), new.module_name
          using errcode = '42501';
      end if;
    end if;
  end if;

  -- ترقيم الخادم للسجلات الجديدة
  if tg_op = 'INSERT' then
    if trusted and coalesce(new.payload->>'number','') <> '' then
      -- seed / استيراد: نُبقي الرقم كما هو ونرفع العدّاد فوقه
      update private.doc_counters c
         set last_value = greatest(c.last_value,
               coalesce(nullif(regexp_replace(new.payload->>'number', '\D', '', 'g'), '')::bigint, 0))
       where c.module_name = new.module_name
         and new.payload->>'number' like c.prefix || '%';
    else
      loop
        update private.doc_counters set last_value = last_value + 1
         where module_name = new.module_name
         returning prefix, last_value into cnt;
        if not found then cnt := null; exit; end if;
        exit when not exists (
          select 1 from public.tfms_module_records r
           where r.module_name = new.module_name
             and r.payload->>'number' = cnt.prefix || cnt.last_value::text);
      end loop;
      if cnt is not null then
        new.payload := jsonb_set(new.payload, '{number}', to_jsonb(cnt.prefix || cnt.last_value::text));
      end if;
    end if;
  end if;

  return new;
end;
$$;
drop trigger if exists trg_module_records_guard on public.tfms_module_records;
create trigger trg_module_records_guard before insert or update on public.tfms_module_records
  for each row execute function private.guard_module_workflow();

-- سجل الاعتماد يُكتب من الخادم فقط (العميل لم يعد يقدر يزوّر from/to/acted_by)
create or replace function private.log_module_status()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  old_status text;
  new_status text := new.payload->>'status';
begin
  if auth.uid() is null or new_status is null then return new; end if;
  if tg_op = 'UPDATE' then old_status := old.payload->>'status'; end if;
  if tg_op = 'INSERT' or new_status is distinct from old_status then
    insert into public.approval_events(id, module_name, record_id, from_status, to_status, acted_by, metadata)
    values ('APR-' || replace(gen_random_uuid()::text,'-',''), new.module_name, new.record_id,
            old_status, new_status, auth.uid(),
            jsonb_build_object('source','db-trigger','role', private.current_role()));
  end if;
  return new;
end;
$$;
drop trigger if exists trg_module_records_status_log on public.tfms_module_records;
create trigger trg_module_records_status_log after insert or update on public.tfms_module_records
  for each row execute function private.log_module_status();

drop policy if exists approval_insert on public.approval_events;
revoke insert on public.approval_events from authenticated;

-- audit_log كمان يُكتب من الخادم فقط (المشغّلات security definer)
drop policy if exists audit_insert on public.audit_log;
revoke insert on public.audit_log from authenticated;

-- ===== 5) سجل التدقيق من الخادم ==============================================
create or replace function private.audit_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  rec    jsonb := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  prev   jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else null end;
  pay    jsonb := coalesce(rec->'payload', '{}'::jsonb);
  ent    text  := tg_table_name;
  refid  text  := coalesce(rec->>'record_id', rec->>'id', '');
  det    text;
  act    text;
  uname  text;
begin
  -- تغييرات بلا مستخدم (SQL Editor / seed / service role) لا تُسجَّل هنا
  if auth.uid() is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  -- تحديث بلا تغيير فعلي (غير updated_at)
  if tg_op = 'UPDATE' and (rec - 'updated_at') = (prev - 'updated_at') then
    return new;
  end if;

  if tg_table_name = 'tfms_module_records' then ent := rec->>'module_name'; end if;
  det := coalesce(pay->>'number', pay->>'name', pay->>'desc', pay->>'code',
                  rec->>'number', rec->>'name', rec->>'code', rec->>'description', rec->>'lessor',
                  rec->>'full_name', rec->>'company_name', '');
  if tg_op = 'UPDATE' and tg_table_name = 'tfms_module_records'
     and (rec->'payload'->>'status') is distinct from (prev->'payload'->>'status') then
    det := det || ' — ' || coalesce(prev->'payload'->>'status','—') || ' ← ' || coalesce(rec->'payload'->>'status','—');
  end if;
  if tg_op = 'UPDATE' and tg_table_name = 'profiles'
     and (rec->>'role') is distinct from (prev->>'role') then
    det := det || ' — الدور: ' || coalesce(prev->>'role','—') || ' ← ' || coalesce(rec->>'role','—');
  end if;

  act := case tg_op when 'INSERT' then 'إضافة' when 'UPDATE' then 'تعديل' else 'حذف' end;
  select coalesce(p.email, '') into uname from public.profiles p where p.id = auth.uid();

  insert into public.audit_log(id, occurred_at, user_id, username, action, entity, reference, details, source, metadata)
  values ('AUD-' || replace(gen_random_uuid()::text,'-',''), now(), auth.uid(), uname,
          act, ent, refid, left(det, 500), 'db',
          jsonb_build_object('table', tg_table_name, 'op', tg_op));

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['projects','drivers','contracts','assets','assignments','operations',
                           'work_orders','fuel_operations','tfms_module_records','organization_settings','profiles'] loop
    execute format('drop trigger if exists trg_%I_audit on public.%I', t, t);
    execute format('create trigger trg_%I_audit after insert or update or delete on public.%I for each row execute function private.audit_change()', t, t);
  end loop;
end $$;

-- ===== 6) الفهارس الناقصة =====================================================
create index if not exists module_records_status_idx
  on public.tfms_module_records (module_name, (payload->>'status'));
create index if not exists module_records_asset_idx
  on public.tfms_module_records (module_name, (payload->>'assetId'));
create index if not exists module_records_date_idx
  on public.tfms_module_records (module_name, (payload->>'date'));
