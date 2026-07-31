-- Fix stock drift when editing received purchases.
-- Previous matching used the first JSON line per product_id, so duplicate
-- product lines (or re-saving them) inflated products.stock on every save.
-- Stock deltas are now Σ(new received) − Σ(old received) per product.

create or replace function public.update_received_purchase(
  p_purchase_id uuid,
  p_supplier_id uuid,
  p_date timestamptz,
  p_notes text,
  p_fees_amount numeric default 0,
  p_fees_notes text default null,
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
  v_qty_ordered numeric;
  v_qty_received numeric;
  v_unit_cost numeric;
  v_line_total numeric;
  v_subtotal numeric := 0;
  v_fees numeric := 0;
  v_total numeric := 0;
  v_stock numeric;
  v_uom public.unit_of_measure;
  v_ts timestamptz := now();
  v_delta record;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_purchase from public.purchases
  where id = p_purchase_id and deleted_at is null
  for update;

  if v_purchase.id is null then
    raise exception 'Purchase not found';
  end if;
  if not public.user_has_org_access(v_purchase.organization_id) then
    raise exception 'No access to organization';
  end if;
  if v_purchase.receipt_status <> 'received' then
    raise exception 'Only received purchases can be updated this way';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Add at least one line item';
  end if;

  v_fees := coalesce(p_fees_amount, 0);

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    if v_product_id is null then
      raise exception 'Product is required';
    end if;

    v_qty_received := coalesce(
      (v_item->>'quantity_received')::numeric,
      (v_item->>'quantity_ordered')::numeric,
      (v_item->>'quantity')::numeric
    );
    v_unit_cost := (v_item->>'unit_cost')::numeric;
    if v_qty_received is null or v_qty_received <= 0 then
      raise exception 'Quantity received must be positive';
    end if;
    if v_unit_cost is null or v_unit_cost < 0 then
      raise exception 'Unit cost must be non-negative';
    end if;
    v_line_total := trunc(v_qty_received * v_unit_cost, 3);
    v_subtotal := v_subtotal + v_line_total;
  end loop;

  v_total := trunc(v_subtotal + v_fees, 3);

  for v_delta in
    with old_qty as (
      select
        product_id,
        sum(coalesce(quantity_received, quantity_ordered, quantity)) as qty
      from public.purchase_items
      where purchase_id = p_purchase_id
        and deleted_at is null
      group by product_id
    ),
    new_qty as (
      select
        (item->>'product_id')::uuid as product_id,
        sum(
          coalesce(
            (item->>'quantity_received')::numeric,
            (item->>'quantity_ordered')::numeric,
            (item->>'quantity')::numeric
          )
        ) as qty
      from jsonb_array_elements(p_items) as item
      group by 1
    )
    select
      coalesce(n.product_id, o.product_id) as product_id,
      coalesce(n.qty, 0) - coalesce(o.qty, 0) as delta
    from old_qty o
    full outer join new_qty n on n.product_id = o.product_id
    where coalesce(n.qty, 0) - coalesce(o.qty, 0) <> 0
  loop
    select stock into v_stock
    from public.products
    where id = v_delta.product_id
      and organization_id = v_purchase.organization_id
      and deleted_at is null
    for update;

    if v_stock is null then
      raise exception 'Product not found';
    end if;
    if v_stock + v_delta.delta < 0 then
      raise exception 'Insufficient stock to reduce purchase quantity';
    end if;

    update public.products
    set stock = stock + v_delta.delta
    where id = v_delta.product_id
      and organization_id = v_purchase.organization_id;
  end loop;

  update public.purchase_items
  set deleted_at = v_ts
  where purchase_id = p_purchase_id
    and deleted_at is null;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty_ordered := coalesce(
      (v_item->>'quantity_ordered')::numeric,
      (v_item->>'quantity_received')::numeric,
      (v_item->>'quantity')::numeric
    );
    v_qty_received := coalesce(
      (v_item->>'quantity_received')::numeric,
      v_qty_ordered
    );
    v_unit_cost := (v_item->>'unit_cost')::numeric;
    v_line_total := trunc(v_qty_received * v_unit_cost, 3);

    select unit_of_measure into v_uom
    from public.products
    where id = v_product_id
      and organization_id = v_purchase.organization_id
      and deleted_at is null;

    if v_uom is null then
      raise exception 'Product not found';
    end if;

    insert into public.purchase_items (
      purchase_id, product_id, quantity, quantity_ordered, quantity_received,
      unit_cost, line_total, unit_of_measure, deleted_at
    )
    values (
      p_purchase_id, v_product_id, v_qty_received, v_qty_ordered, v_qty_received,
      v_unit_cost, v_line_total, v_uom, null
    );
  end loop;

  update public.purchases
  set
    supplier_id = p_supplier_id,
    date = p_date,
    notes = p_notes,
    subtotal = v_subtotal,
    fees_amount = v_fees,
    fees_notes = p_fees_notes,
    total = v_total,
    amount_paid = least(amount_paid, v_total),
    payment_status = public.purchase_payment_status_from_amounts(least(amount_paid, v_total), v_total)
  where id = p_purchase_id
  returning * into v_purchase;

  return v_purchase;
end;
$$;

grant execute on function public.update_received_purchase to authenticated;
