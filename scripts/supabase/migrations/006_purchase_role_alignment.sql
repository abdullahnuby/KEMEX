-- Sprint 06-03: align purchase workflow authorization with the legacy reference.
-- Purchase requests are maintained/approved by admin, fleet and maintenance roles.
create or replace function private.can_module(module_name text, operation_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  r text := private.current_role();
  allowed text[];
begin
  if r is null then return false; end if;
  allowed := case module_name
    when 'requests' then array['admin','fleet','pm','eng']
    when 'assignments' then array['admin','fleet','pm']
    when 'operations' then array['admin','fleet','pm','eng']
    when 'trips' then array['admin','fleet','pm','eng']
    when 'drivers' then array['admin','fleet','maint','pm','eng']
    when 'contracts' then array['admin','fleet','acct','mgmt']
    when 'plans' then array['admin','fleet','maint','eng']
    when 'oils' then array['admin','fleet','maint']
    when 'tires' then array['admin','fleet','maint']
    when 'inventory' then array['admin','fleet','maint']
    when 'movements' then array['admin','fleet','maint']
    when 'purchases' then array['admin','fleet','maint']
    when 'costs' then array['admin','acct','mgmt','fleet']
    when 'charging' then array['admin','acct','mgmt','fleet']
    when 'invoices' then array['admin','acct','mgmt']
    when 'customers' then array['admin','acct','mgmt']
    when 'audit' then array['admin','mgmt','fleet','maint','acct']
    else array['admin']
  end;
  return r = any(allowed);
end;
$$;

grant execute on function private.can_module(text,text) to authenticated;
