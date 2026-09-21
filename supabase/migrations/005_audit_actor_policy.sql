-- Ensure authenticated clients can only create audit events attributed to themselves.
-- Existing audit rows are not modified.
drop policy if exists audit_insert on public.audit_log;
create policy audit_insert on public.audit_log
  for insert to authenticated
  with check (user_id = auth.uid());
