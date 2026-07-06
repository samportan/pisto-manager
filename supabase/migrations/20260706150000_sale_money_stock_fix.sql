-- Recompute line totals server-side and validate quantities/prices

create or replace function public.create_sale_with_items(
  p_organization_id uuid,
  p_customer_id uuid,
  p_date timestamptz,
  p_notes text,
  p_items jsonb
)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_sale public.sales;
  v_item jsonb;
  v_product_id uuid;
  v_qty numeric;
  v_unit_price numeric;
  v_line_total numeric;
  v_total numeric := 0;
  v_stock numeric;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;
  if not public.user_has_org_access(p_organization_id) then
    raise exception 'No access to organization';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::numeric;
    v_unit_price := (v_item->>'unit_price')::numeric;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Quantity must be positive';
    end if;
    if v_unit_price is null or v_unit_price < 0 then
      raise exception 'Unit price must be non-negative';
    end if;
    v_line_total := round(v_qty * v_unit_price, 2);
    v_total := v_total + v_line_total;
  end loop;

  insert into public.sales (user_id, organization_id, customer_id, date, notes, total, deleted_at)
  values (v_user_id, p_organization_id, p_customer_id, p_date, p_notes, v_total, null)
  returning * into v_sale;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::numeric;
    v_unit_price := (v_item->>'unit_price')::numeric;
    v_line_total := round(v_qty * v_unit_price, 2);

    select stock into v_stock from public.products
    where id = v_product_id and organization_id = p_organization_id and deleted_at is null
    for update;

    if v_stock is null then
      raise exception 'Product not found';
    end if;
    if v_stock < v_qty then
      raise exception 'Insufficient stock for product %', v_product_id;
    end if;

    insert into public.sale_items (sale_id, product_id, quantity, unit_price, line_total, deleted_at)
    values (v_sale.id, v_product_id, v_qty, v_unit_price, v_line_total, null);

    update public.products set stock = stock - v_qty where id = v_product_id;
  end loop;

  return v_sale;
end;
$$;

create or replace function public.create_purchase_with_items(
  p_organization_id uuid,
  p_supplier_id uuid,
  p_date timestamptz,
  p_notes text,
  p_items jsonb
)
returns public.purchases
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_purchase public.purchases;
  v_item jsonb;
  v_product_id uuid;
  v_qty numeric;
  v_unit_cost numeric;
  v_line_total numeric;
  v_total numeric := 0;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;
  if not public.user_has_org_access(p_organization_id) then
    raise exception 'No access to organization';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::numeric;
    v_unit_cost := (v_item->>'unit_cost')::numeric;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Quantity must be positive';
    end if;
    if v_unit_cost is null or v_unit_cost < 0 then
      raise exception 'Unit cost must be non-negative';
    end if;
    v_line_total := round(v_qty * v_unit_cost, 2);
    v_total := v_total + v_line_total;
  end loop;

  insert into public.purchases (user_id, organization_id, supplier_id, date, notes, total, deleted_at)
  values (v_user_id, p_organization_id, p_supplier_id, p_date, p_notes, v_total, null)
  returning * into v_purchase;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::numeric;
    v_unit_cost := (v_item->>'unit_cost')::numeric;
    v_line_total := round(v_qty * v_unit_cost, 2);

    insert into public.purchase_items (purchase_id, product_id, quantity, unit_cost, line_total, deleted_at)
    values (v_purchase.id, v_product_id, v_qty, v_unit_cost, v_line_total, null);

    update public.products set stock = stock + v_qty
    where id = v_product_id and organization_id = p_organization_id;
  end loop;

  return v_purchase;
end;
$$;
