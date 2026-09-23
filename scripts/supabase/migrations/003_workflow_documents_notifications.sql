-- TFMS v0.4: approval workflow, attachments metadata, and user notifications.
create table if not exists public.approval_events (
  id text primary key,
  module_name text not null,
  record_id text not null,
  from_status text,
  to_status text not null,
  comment text,
  acted_by uuid references auth.users(id) on delete set null,
  acted_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists approval_events_record_idx on public.approval_events(module_name,record_id,acted_at desc);

create table if not exists public.attachments (
  id text primary key,
  module_name text not null,
  record_id text not null,
  file_name text not null,
  storage_path text not null unique,
  mime_type text,
  byte_size bigint check (byte_size is null or byte_size >= 0),
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists attachments_record_idx on public.attachments(module_name,record_id,created_at desc);

create table if not exists public.user_notifications (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null default '',
  severity text not null default 'info' check (severity in ('info','warning','critical','success')),
  module_name text,
  record_id text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists user_notifications_inbox_idx on public.user_notifications(user_id,created_at desc) where read_at is null;

alter table public.approval_events enable row level security;
alter table public.attachments enable row level security;
alter table public.user_notifications enable row level security;

drop policy if exists approval_read on public.approval_events;
create policy approval_read on public.approval_events for select to authenticated
using (private.can_module(module_name,'read'));
drop policy if exists approval_insert on public.approval_events;
create policy approval_insert on public.approval_events for insert to authenticated
with check (private.can_module(module_name,'write') and acted_by = (select auth.uid()));

drop policy if exists attachments_read on public.attachments;
create policy attachments_read on public.attachments for select to authenticated
using (private.can_module(module_name,'read'));
drop policy if exists attachments_insert on public.attachments;
create policy attachments_insert on public.attachments for insert to authenticated
with check (private.can_module(module_name,'write') and uploaded_by = (select auth.uid()));
drop policy if exists attachments_delete on public.attachments;
create policy attachments_delete on public.attachments for delete to authenticated
using (private.can_module(module_name,'write') and uploaded_by = (select auth.uid()));

drop policy if exists notifications_select_own on public.user_notifications;
create policy notifications_select_own on public.user_notifications for select to authenticated
using (user_id = (select auth.uid()));
drop policy if exists notifications_update_own on public.user_notifications;
create policy notifications_update_own on public.user_notifications for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- Notification creation is intentionally server/admin-only; use a trusted server function/service role.
