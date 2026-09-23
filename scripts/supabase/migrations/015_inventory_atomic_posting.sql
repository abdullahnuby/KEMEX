-- KEMEX v0.29.0 — atomic inventory posting and stock summary

create or replace function private.create_inventory_item(
  p_id text,p_code text,p_name text,p_category text,p_brand text,p_unit text,p_barcode text,p_warehouse_id text,p_location text,
  p_minimum_qty numeric,p_maximum_qty numeric,p_reorder_point numeric,p_lead_time_days integer,p_last_purchase_cost numeric,
  p_opening_qty numeric,p_opening_unit_cost numeric,p_notes text
) returns public.inventory_items
language plpgsql security definer set search_path=pg_catalog,public,private as $function$
declare item public.inventory_items; movement_id text; movement_no text; opening_cost numeric := greatest(coalesce(p_opening_unit_cost,0),0);
begin
  if not private.can_module('inventory','write') then raise exception 'لا تملك صلاحية إنشاء صنف مخزني' using errcode='42501'; end if;
  if coalesce(trim(p_code),'')='' then raise exception 'كود الصنف مطلوب' using errcode='22023'; end if;
  if coalesce(trim(p_name),'')='' then raise exception 'اسم الصنف مطلوب' using errcode='22023'; end if;
  if p_opening_qty < 0 or p_last_purchase_cost < 0 then raise exception 'الكميات والتكاليف لا يمكن أن تكون سالبة' using errcode='22023'; end if;
  insert into public.inventory_items(id,code,name,category,brand,unit,barcode,warehouse_id,location,minimum_qty,maximum_qty,reorder_point,lead_time_days,average_cost,last_purchase_cost,current_qty,opening_qty,notes)
  values(p_id,trim(p_code),trim(p_name),p_category,nullif(trim(p_brand),''),trim(p_unit),nullif(trim(p_barcode),''),p_warehouse_id,nullif(trim(p_location),''),greatest(coalesce(p_minimum_qty,0),0),greatest(coalesce(p_maximum_qty,0),0),greatest(coalesce(p_reorder_point,0),0),greatest(coalesce(p_lead_time_days,0),0),0,greatest(coalesce(p_last_purchase_cost,0),0),0,greatest(coalesce(p_opening_qty,0),0),nullif(trim(p_notes),'')) returning * into item;
  if coalesce(p_opening_qty,0)>0 then
    movement_id:='MV-'||replace(gen_random_uuid()::text,'-',''); movement_no:='STK-'||lpad(nextval('private.stock_movement_no_seq')::text,7,'0');
    insert into public.stock_movements(id,movement_no,item_id,movement_type,quantity,movement_date,unit_cost,warehouse_id,reference_type,reference_id,notes,created_by)
    values(movement_id,movement_no,p_id,'استلام',p_opening_qty,current_date,opening_cost,p_warehouse_id,'opening_balance',p_id,'رصيد افتتاحي',auth.uid());
    select * into item from public.inventory_items where id=p_id;
  end if;
  return item;
end;$function$;

create or replace function public.create_inventory_item(p_id text,p_code text,p_name text,p_category text,p_brand text,p_unit text,p_barcode text,p_warehouse_id text,p_location text,p_minimum_qty numeric,p_maximum_qty numeric,p_reorder_point numeric,p_lead_time_days integer,p_last_purchase_cost numeric,p_opening_qty numeric,p_opening_unit_cost numeric,p_notes text)
returns public.inventory_items language sql security definer set search_path=pg_catalog,public,private
as $$ select * from private.create_inventory_item($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17); $$;
revoke execute on function public.create_inventory_item(text,text,text,text,text,text,text,text,text,numeric,numeric,numeric,integer,numeric,numeric,numeric,text) from public,anon;
grant execute on function public.create_inventory_item(text,text,text,text,text,text,text,text,text,numeric,numeric,numeric,integer,numeric,numeric,numeric,text) to authenticated;

create or replace function public.post_stock_movement(p_id text,p_item_id text,p_movement_type text,p_quantity numeric,p_movement_date date,p_unit_cost numeric default 0,p_warehouse_id text default null,p_asset_id text default null,p_work_order_id text default null,p_project_id text default null,p_reference_type text default null,p_reference_id text default null,p_notes text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,private as $function$
declare item public.inventory_items; movement public.stock_movements; movement_no text; effective_cost numeric;
begin
  if not private.can_module('movements','write') then raise exception 'لا تملك صلاحية تسجيل حركة مخزون' using errcode='42501'; end if;
  if p_quantity is null or p_quantity<=0 then raise exception 'كمية الحركة يجب أن تكون أكبر من صفر' using errcode='22023'; end if;
  if p_movement_type not in ('استلام','صرف','مرتجع','تسوية زيادة','تسوية نقص') then raise exception 'نوع حركة المخزون غير صالح' using errcode='22023'; end if;
  select * into item from public.inventory_items where id=p_item_id for update;
  if not found then raise exception 'صنف المخزون غير موجود' using errcode='23503'; end if;
  effective_cost:=greatest(coalesce(nullif(p_unit_cost,0),item.average_cost,item.last_purchase_cost,0),0);
  movement_no:='STK-'||lpad(nextval('private.stock_movement_no_seq')::text,7,'0');
  insert into public.stock_movements(id,movement_no,item_id,movement_type,quantity,movement_date,unit_cost,warehouse_id,asset_id,work_order_id,project_id,reference_type,reference_id,notes,created_by)
  values(coalesce(nullif(trim(p_id),''),'MV-'||replace(gen_random_uuid()::text,'-','')),movement_no,p_item_id,p_movement_type,p_quantity,coalesce(p_movement_date,current_date),effective_cost,p_warehouse_id,p_asset_id,p_work_order_id,p_project_id,nullif(trim(p_reference_type),''),nullif(trim(p_reference_id),''),nullif(trim(p_notes),''),auth.uid()) returning * into movement;
  select * into item from public.inventory_items where id=p_item_id;
  return jsonb_build_object('movement',to_jsonb(movement),'item',to_jsonb(item));
end;$function$;
revoke execute on function public.post_stock_movement(text,text,text,numeric,date,numeric,text,text,text,text,text,text,text) from public,anon;
grant execute on function public.post_stock_movement(text,text,text,numeric,date,numeric,text,text,text,text,text,text,text) to authenticated;

drop view if exists public.inventory_stock_summary;
create view public.inventory_stock_summary with (security_invoker=true) as
select i.id,i.code,i.name,i.category,i.brand,i.unit,i.barcode,i.warehouse_id,i.location,i.minimum_qty,i.maximum_qty,i.reorder_point,i.lead_time_days,i.average_cost,i.last_purchase_cost,i.current_qty,i.opening_qty,i.active,i.notes,
case when i.current_qty<=greatest(i.reorder_point,i.minimum_qty) and greatest(i.reorder_point,i.minimum_qty)>0 then true else false end low_stock,
round(i.current_qty*i.average_cost,2) stock_value from public.inventory_items i;
grant select on public.inventory_stock_summary to authenticated;

-- Stock posting is protected by database-side balance and cost synchronization.
create or replace function private.apply_stock_movement()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $function$
declare
  delta numeric(14,3);
  item public.inventory_items%rowtype;
begin
  delta := case
    when new.movement_type in ('استلام','مرتجع','تسوية زيادة') then new.quantity
    when new.movement_type in ('صرف','تسوية نقص') then -new.quantity
    else 0
  end;

  select * into item from public.inventory_items where id=new.item_id for update;
  if not found then raise exception 'صنف المخزون غير موجود' using errcode='23503'; end if;
  if item.current_qty + delta < 0 then
    raise exception 'الرصيد غير كافٍ للصنف %، الرصيد الحالي % والكمية المطلوبة %', item.name, item.current_qty, new.quantity
      using errcode='23514';
  end if;

  update public.inventory_items
  set current_qty=current_qty+delta,
      average_cost=case
        when new.movement_type='استلام' and delta>0
        then round(((current_qty*average_cost)+(new.quantity*new.unit_cost))/greatest(current_qty+new.quantity,0.000001),3)
        else average_cost
      end,
      last_purchase_cost=case when new.movement_type='استلام' then new.unit_cost else last_purchase_cost end
  where id=new.item_id;

  return new;
end;
$function$;

drop trigger if exists trg_stock_movement_apply on public.stock_movements;
create trigger trg_stock_movement_apply after insert on public.stock_movements
for each row execute function private.apply_stock_movement();

create or replace function private.sync_stock_issue_cost()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $function$
declare amount numeric(14,2);
begin
  if new.movement_type='صرف' and new.work_order_id is not null then
    amount := round(new.quantity*new.unit_cost,2);
    if amount>0 then
      insert into public.cost_entries(
        id,cost_date,category,asset_id,project_id,amount,quantity,unit_cost,
        description,reference_type,reference_id,status,metadata
      ) values (
        'SM-COST-'||new.id,new.movement_date,'maintenance',new.asset_id,new.project_id,
        amount,new.quantity,new.unit_cost,'صرف قطع غيار لأمر صيانة',
        'stock_movement',new.id,'مسجلة',
        jsonb_build_object('work_order_id',new.work_order_id,'movement_no',new.movement_no)
      ) on conflict(id) do update set
        cost_date=excluded.cost_date,asset_id=excluded.asset_id,project_id=excluded.project_id,
        amount=excluded.amount,quantity=excluded.quantity,unit_cost=excluded.unit_cost,
        updated_at=now(),metadata=excluded.metadata;
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_stock_issue_cost_sync on public.stock_movements;
create trigger trg_stock_issue_cost_sync after insert on public.stock_movements
for each row execute function private.sync_stock_issue_cost();

drop trigger if exists trg_stock_movements_audit on public.stock_movements;
create trigger trg_stock_movements_audit after insert or update or delete on public.stock_movements
for each row execute function private.audit_change();

-- Keep the work-order cost ledger synchronized with the final approved work order.
create or replace function private.sync_work_order_cost()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $function$
declare total_cost numeric(14,2);
begin
  if tg_op='DELETE' then
    delete from public.cost_entries where reference_type='work_order' and reference_id=old.id;
    return old;
  end if;

  total_cost:=greatest(coalesce(new.labor_cost,0),0)+greatest(coalesce(new.parts_cost,0),0)+greatest(coalesce(new.vendor_cost,0),0);
  if new.status='مكتمل' and total_cost>0 then
    insert into public.cost_entries(
      id,cost_date,category,asset_id,project_id,amount,description,reference_type,reference_id,status,metadata
    ) values (
      'WO-COST-'||new.id,coalesce(new.completed,new.opened,current_date),'maintenance',new.asset_id,new.project_id,
      total_cost,coalesce(new.description,'أمر صيانة'),'work_order',new.id,'مسجلة',
      jsonb_build_object('labor_cost',coalesce(new.labor_cost,0),'parts_cost',coalesce(new.parts_cost,0),
                         'vendor_cost',coalesce(new.vendor_cost,0),'work_order_status',new.status)
    ) on conflict(id) do update set
      cost_date=excluded.cost_date,asset_id=excluded.asset_id,project_id=excluded.project_id,amount=excluded.amount,
      description=excluded.description,metadata=excluded.metadata,updated_at=now();
  else
    delete from public.cost_entries where reference_type='work_order' and reference_id=new.id;
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_work_orders_cost_sync on public.work_orders;
create trigger trg_work_orders_cost_sync after insert or update or delete on public.work_orders
for each row execute function private.sync_work_order_cost();

notify pgrst,'reload schema';
