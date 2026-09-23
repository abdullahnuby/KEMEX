-- 013 — Remove inherited seed-like business defaults. User config is authoritative.
update public.organization_settings
set company_name='',
    group_name='',
    diesel=0,
    petrol=0
where id=true;

notify pgrst,'reload schema';
