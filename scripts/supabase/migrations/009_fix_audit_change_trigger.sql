-- 009 — Fix audit trigger for tables without a payload column
-- Prevents audit_change() from dereferencing NEW.payload / OLD.payload
-- on core tables such as assets, projects, drivers, etc.

create or replace function private.audit_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
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
  if auth.uid() is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'UPDATE'
     and (rec - 'updated_at') = (prev - 'updated_at') then
    return new;
  end if;

  if tg_table_name = 'tfms_module_records' then
    ent := rec->>'module_name';
  end if;

  det := coalesce(
    pay->>'number',
    pay->>'name',
    pay->>'desc',
    pay->>'code',
    rec->>'number',
    rec->>'name',
    rec->>'code',
    rec->>'description',
    rec->>'lessor',
    rec->>'full_name',
    rec->>'company_name',
    ''
  );

  if tg_op = 'UPDATE' and tg_table_name = 'tfms_module_records'
     and (rec->'payload'->>'status') is distinct from (prev->'payload'->>'status') then
    det := det || ' — ' ||
      coalesce(prev->'payload'->>'status','—') ||
      ' ← ' ||
      coalesce(rec->'payload'->>'status','—');
  end if;

  if tg_op = 'UPDATE' and tg_table_name = 'profiles'
     and (rec->>'role') is distinct from (prev->>'role') then
    det := det || ' — الدور: ' ||
      coalesce(prev->>'role','—') ||
      ' ← ' ||
      coalesce(rec->>'role','—');
  end if;

  act := case tg_op
    when 'INSERT' then 'إضافة'
    when 'UPDATE' then 'تعديل'
    else 'حذف'
  end;

  select coalesce(p.email, '')
    into uname
  from public.profiles p
  where p.id = auth.uid();

  insert into public.audit_log(
    id, occurred_at, user_id, username, action, entity, reference,
    details, source, metadata
  )
  values (
    'AUD-' || replace(gen_random_uuid()::text,'-',''),
    now(), auth.uid(), uname, act, ent, refid, left(det, 500),
    'db',
    jsonb_build_object('table', tg_table_name, 'op', tg_op)
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$function$;
