-- 011 — Currency policy + complete client commercial fields
-- Default currency is Egyptian Pound (EGP). Administrators may change it from Settings.

alter table public.organization_settings
  alter column currency_code set default 'EGP';
update public.organization_settings
set currency_code = 'EGP'
where id = true and coalesce(trim(currency_code),'') = 'SAR';

alter table public.clients
  add column if not exists tax_number text,
  add column if not exists payment_terms text,
  add column if not exists credit_limit numeric(14,2) not null default 0 check (credit_limit >= 0),
  add column if not exists sales_rep text;

notify pgrst, 'reload schema';
