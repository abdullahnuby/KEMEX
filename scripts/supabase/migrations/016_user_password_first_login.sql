alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

create index if not exists profiles_must_change_password_idx
  on public.profiles (must_change_password)
  where must_change_password = true;

create or replace function public.complete_password_change()
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول لتغيير كلمة المرور.' using errcode = '42501';
  end if;

  update public.profiles
     set must_change_password = false,
         updated_at = now()
   where id = auth.uid();
end;
$$;

revoke execute on function public.complete_password_change() from public;
revoke execute on function public.complete_password_change() from anon;
grant execute on function public.complete_password_change() to authenticated;
