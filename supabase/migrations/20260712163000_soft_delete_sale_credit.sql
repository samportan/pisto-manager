-- Allow soft-deleting credit/partial sales: cascade abonos, restore stock.

create or replace function public.soft_delete_sale(p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.sales;
  v_item record;
  v_ts timestamptz := now();
begin
  select * into v_sale from public.sales where id = p_sale_id and deleted_at is null;
  if v_sale.id is null then return; end if;
  if v_sale.user_id <> auth.uid() then raise exception 'Forbidden'; end if;
  if v_sale.organization_id is not null and not public.user_has_org_access(v_sale.organization_id) then
    raise exception 'Forbidden';
  end if;

  update public.sale_payments
  set deleted_at = v_ts
  where sale_id = p_sale_id and deleted_at is null;

  for v_item in
    select * from public.sale_items where sale_id = p_sale_id and deleted_at is null
  loop
    update public.products set stock = stock + v_item.quantity where id = v_item.product_id;
    update public.sale_items set deleted_at = v_ts where id = v_item.id;
  end loop;

  update public.sales set deleted_at = v_ts where id = p_sale_id;
end;
$$;

grant execute on function public.soft_delete_sale to authenticated;
