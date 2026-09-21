-- TFMS v0.9.9: explicit Data API grants for workflow tables.
-- RLS policies from migration 003 remain the authorization boundary.

 grant select, insert on public.approval_events to authenticated;
 grant select, insert, delete on public.attachments to authenticated;
 grant select, update on public.user_notifications to authenticated;

