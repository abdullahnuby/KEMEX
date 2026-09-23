-- Sprint 08 — richer master-data forms
-- Persists the additional fields introduced in the enhanced front-end forms.
alter table public.projects add column if not exists start_date date;
alter table public.projects add column if not exists end_date date;
alter table public.projects add column if not exists contract_no text;
alter table public.projects add column if not exists location_details text;
alter table public.projects add column if not exists contact_phone text;
alter table public.projects add column if not exists budget numeric(14,2);
alter table public.projects add column if not exists progress numeric(5,2) not null default 0;
alter table public.projects add column if not exists notes text;

