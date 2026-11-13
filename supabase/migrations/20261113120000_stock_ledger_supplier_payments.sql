-- Stock ledger: one module owns every change to products.stock.
--
-- Before this migration each RPC (sales, purchases, adjustments, deletes) ran its
-- own `update products set stock = ...`. Only manual adjustments were logged, so
-- when a number looked wrong there was no way to tell which document moved it.
-- The 2026-11-10 reconcile (20261110001655) rebuilt stock as
-- "received - sold" and dropped the opening stock typed when products were
-- created. 53 products lost 594 units and 16 went negative.
--
-- This migration:
--   1. Adds public.apply_stock_movement(): the only writer of products.stock.
--      It locks the product row, validates, updates and logs a stock_movements
--      row (stock_before / stock_after / reference to the sale or purchase).
--   2. Blocks direct client updates of products.stock (trigger) and direct
--      client writes to stock_movements (grants).
--   3. Logs opening stock when a product is created with stock > 0.
--   4. Rewrites every stock RPC on top of apply_stock_movement. Signatures and
--      error messages stay the same so deployed clients keep working.
--   5. Reverts the 2026-11-10 reconcile for products nobody has counted since.
--   6. Adds supplier balances + record_supplier_payment (pay several supplier
--      purchases in one payment, FIFO over the selected purchases).

-- ---------------------------------------------------------------------------
-- 1. stock_movements: system reasons + reference to the source document
-- ---------------------------------------------------------------------------

alter table public.stock_movements
  add column if not exists reference_id uuid;

alter table public.stock_movements
  drop constraint if exists stock_movements_reason_check;

alter table public.stock_movements
  add constraint stock_movements_reason_check check (
    reason = any (array[
      -- manual adjustments (create_stock_adjustment)
      'count_correction', 'personal_use', 'waste', 'gift', 'other',
      -- automatic movements
      'initial_stock', 'sale', 'sale_void',
      'purchase_receive', 'purchase_edit', 'purchase_void',
      'system_correction'
    ]::text[])
  );

create index if not exists stock_movements_reference_idx
  on public.stock_movements (reference_id)
  where reference_id is not null;

-- Clients read the ledger; only SECURITY DEFINER functions write it.
revoke insert, update, delete, truncate on table public.stock_movements from anon, authenticated;
drop policy if exists stock_movements_insert on public.stock_movements;

-- ---------------------------------------------------------------------------
-- 2. Core writer
-- ---------------------------------------------------------------------------

create or replace function public.apply_stock_movement(
  p_organization_id uuid,
  p_product_id uuid,
  p_delta numeric,
  p_reason text,
  p_reference_id uuid default null,
  p_notes text default null,
  p_allow_negative boolean default false,
  p_user_id uuid default null,
  p_require_active boolean default false,
  p_insufficient_message text default null
)
returns public.stock_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products;
  v_after numeric;
  v_movement public.stock_movements;
begin
  if p_delta is null or p_delta = 0 then
    return null;
  end if;

  select * into v_product
  from public.products
  where id = p_product_id
    and organization_id = p_organization_id
  for update;

  if v_product.id is null or (p_require_active and v_product.deleted_at is not null) then
    raise exception 'Product not found';
  end if;

  v_after := v_product.stock + p_delta;

  if v_after < 0 and not coalesce(p_allow_negative, false) then
    raise exception '%', coalesce(
      p_insufficient_message,
      format('Insufficient stock for product %s', p_product_id)
    );
  end if;

  update public.products
  set stock = v_after
  where id = p_product_id;

  insert into public.stock_movements (
    organization_id, product_id, user_id,
    quantity_delta, reason, notes, stock_before, stock_after, reference_id
  )
  values (
    p_organization_id, p_product_id,
    coalesce(p_user_id, auth.uid(), v_product.user_id),
    p_delta, p_reason, p_notes, v_product.stock, v_after, p_reference_id
  )
  returning * into v_movement;

  return v_movement;
end;
$$;

revoke all on function public.apply_stock_movement(
  uuid, uuid, numeric, text, uuid, text, boolean, uuid, boolean, text
) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Guards on products
-- ---------------------------------------------------------------------------

-- Direct API updates run as anon/authenticated. RPCs run as the function owner.
create or replace function public.products_guard_stock_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.stock is distinct from old.stock
     and current_user in ('anon', 'authenticated') then
    raise exception 'Stock can only change through sales, purchases, or stock adjustments';
  end if;
  return new;
end;
$$;

drop trigger if exists products_guard_stock_update on public.products;
create trigger products_guard_stock_update
  before update of stock on public.products
  for each row
  execute function public.products_guard_stock_update();

-- Opening stock typed in "new product" is logged so the ledger starts complete.
create or replace function public.products_log_initial_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.stock, 0) <> 0 and new.organization_id is not null then
    insert into public.stock_movements (
      organization_id, product_id, user_id,
      quantity_delta, reason, notes, stock_before, stock_after
    )
    values (
      new.organization_id, new.id, coalesce(auth.uid(), new.user_id),
      new.stock, 'initial_stock', null, 0, new.stock
    );
  end if;
  return new;
end;
$$;

drop trigger if exists products_log_initial_stock on public.products;
create trigger products_log_initial_stock
  after insert on public.products
  for each row
  execute function public.products_log_initial_stock();

-- ---------------------------------------------------------------------------
-- 4. Stock RPCs rewritten on apply_stock_movement
-- ---------------------------------------------------------------------------

-- 4a. Manual adjustment (same contract: returns the movement row)
create or replace function public.create_stock_adjustment(
  p_organization_id uuid,
  p_product_id uuid,
  p_quantity_delta numeric,
  p_reason text,
  p_notes text default null
)
returns public.stock_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;
  if not public.user_has_org_access(p_organization_id) then
    raise exception 'No access to organization';
  end if;
  if p_quantity_delta is null or p_quantity_delta = 0 then
    raise exception 'Quantity delta must be non-zero';
  end if;
  if p_reason is null or p_reason not in ('count_correction', 'personal_use', 'waste', 'gift', 'other') then
    raise exception 'Invalid adjustment reason';
  end if;

  return public.apply_stock_movement(
    p_organization_id, p_product_id, p_quantity_delta, p_reason,
    null, p_notes, false, v_user_id, true,
    'Insufficient stock for adjustment'
  );
end;
$$;

-- 4b. Sale (paid, partial and fiado all leave the shelf)
create or replace function public.create_sale_with_items(
  p_organization_id uuid,
  p_customer_id uuid,
  p_date timestamptz,
  p_notes text,
  p_payment_method text,
  p_apply_card_surcharge boolean,
  p_amount_paid numeric,
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
  v_subtotal numeric := 0;
  v_surcharge numeric := 0;
  v_total numeric := 0;
  v_amount_paid numeric;
  v_payment_status text;
  v_uom public.unit_of_measure;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;
  if not public.user_has_org_access(p_organization_id) then
    raise exception 'No access to organization';
  end if;
  if p_payment_method is null or p_payment_method not in ('cash', 'card', 'transfer') then
    raise exception 'Invalid payment method';
  end if;
  if p_apply_card_surcharge and p_payment_method <> 'card' then
    raise exception 'Card surcharge only applies to card payments';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Add at least one line item';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::numeric;
    v_unit_price := (v_item->>'unit_price')::numeric;
    if (v_item->>'product_id') is null then
      raise exception 'Product is required';
    end if;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Quantity must be positive';
    end if;
    if v_unit_price is null or v_unit_price < 0 then
      raise exception 'Unit price must be non-negative';
    end if;
    v_line_total := trunc(v_qty * v_unit_price, 3);
    v_subtotal := v_subtotal + v_line_total;
  end loop;

  if p_payment_method = 'card' then
    v_surcharge := trunc(v_subtotal * 0.05, 3);
  end if;

  if coalesce(p_apply_card_surcharge, false) then
    v_total := v_subtotal + v_surcharge;
  else
    v_total := v_subtotal;
  end if;

  v_amount_paid := coalesce(p_amount_paid, v_total);
  if v_amount_paid < 0 or v_amount_paid > v_total then
    raise exception 'Amount paid must be between 0 and total';
  end if;

  if v_amount_paid < v_total and p_customer_id is null then
    raise exception 'Customer required for partial or credit sales';
  end if;

  if v_amount_paid >= v_total then
    v_payment_status := 'paid';
    v_amount_paid := v_total;
  elsif v_amount_paid > 0 then
    v_payment_status := 'partial';
  else
    v_payment_status := 'credit';
  end if;

  insert into public.sales (
    user_id, organization_id, customer_id, date, notes,
    subtotal, card_surcharge_rate, card_surcharge_amount, apply_card_surcharge,
    total, payment_method, payment_status, amount_paid, deleted_at
  )
  values (
    v_user_id, p_organization_id, p_customer_id, p_date, p_notes,
    v_subtotal,
    case when p_payment_method = 'card' then 0.05 else null end,
    v_surcharge,
    coalesce(p_apply_card_surcharge, false),
    v_total, p_payment_method, v_payment_status, v_amount_paid, null
  )
  returning * into v_sale;

  if v_amount_paid > 0 and v_payment_status <> 'paid' then
    insert into public.sale_payments (
      organization_id, sale_id, user_id, amount, payment_method, date, notes
    )
    values (
      p_organization_id, v_sale.id, v_user_id, v_amount_paid,
      p_payment_method, p_date, p_notes
    );
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::numeric;
    v_unit_price := (v_item->>'unit_price')::numeric;
    v_line_total := trunc(v_qty * v_unit_price, 3);

    select unit_of_measure into v_uom from public.products
    where id = v_product_id and organization_id = p_organization_id and deleted_at is null;

    if v_uom is null then
      raise exception 'Product not found';
    end if;

    insert into public.sale_items (sale_id, product_id, quantity, unit_price, line_total, unit_of_measure, deleted_at)
    values (v_sale.id, v_product_id, v_qty, v_unit_price, v_line_total, v_uom, null);

    perform public.apply_stock_movement(
      p_organization_id, v_product_id, -v_qty, 'sale',
      v_sale.id, null, false, v_user_id, true,
      format('Insufficient stock for product %s', v_product_id)
    );
  end loop;

  return v_sale;
end;
$$;

-- 4c. Delete sale: stock goes back, payments are voided
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
  select * into v_sale from public.sales where id = p_sale_id and deleted_at is null for update;
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
    perform public.apply_stock_movement(
      v_sale.organization_id, v_item.product_id, v_item.quantity, 'sale_void',
      p_sale_id, null, true, auth.uid(), false, null
    );
    update public.sale_items set deleted_at = v_ts where id = v_item.id;
  end loop;

  update public.sales set deleted_at = v_ts where id = p_sale_id;
end;
$$;

-- 4d. Create purchase (stock only moves when status = received)
create or replace function public.create_purchase_with_items(
  p_organization_id uuid,
  p_supplier_id uuid,
  p_date timestamptz,
  p_notes text,
  p_receipt_status text,
  p_items jsonb,
  p_expected_at timestamptz default null,
  p_payment_method text default 'cash',
  p_amount_paid numeric default null,
  p_fees_amount numeric default 0,
  p_fees_notes text default null
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
  v_amount_paid numeric;
  v_payment_status text;
  v_uom public.unit_of_measure;
  v_received_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;
  if not public.user_has_org_access(p_organization_id) then
    raise exception 'No access to organization';
  end if;
  if p_receipt_status is null or p_receipt_status not in ('pending', 'received') then
    raise exception 'Invalid receipt status';
  end if;
  if p_payment_method is null or p_payment_method not in ('cash', 'transfer', 'credit') then
    raise exception 'Invalid payment method';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Add at least one line item';
  end if;

  v_fees := coalesce(p_fees_amount, 0);

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty_ordered := coalesce(
      (v_item->>'quantity_ordered')::numeric,
      (v_item->>'quantity')::numeric
    );
    v_unit_cost := (v_item->>'unit_cost')::numeric;
    if (v_item->>'product_id') is null then
      raise exception 'Product is required';
    end if;
    if v_qty_ordered is null or v_qty_ordered <= 0 then
      raise exception 'Quantity ordered must be positive';
    end if;
    if v_unit_cost is null or v_unit_cost < 0 then
      raise exception 'Unit cost must be non-negative';
    end if;

    if p_receipt_status = 'received' then
      v_qty_received := coalesce(
        (v_item->>'quantity_received')::numeric,
        v_qty_ordered
      );
      if v_qty_received is null or v_qty_received <= 0 then
        raise exception 'Quantity received must be positive';
      end if;
      v_line_total := trunc(v_qty_received * v_unit_cost, 3);
    else
      v_line_total := trunc(v_qty_ordered * v_unit_cost, 3);
    end if;

    v_subtotal := v_subtotal + v_line_total;
  end loop;

  v_total := trunc(v_subtotal + v_fees, 3);

  if p_receipt_status = 'received' then
    v_amount_paid := coalesce(p_amount_paid, v_total);
    if v_amount_paid < 0 or v_amount_paid > v_total then
      raise exception 'Amount paid must be between 0 and total';
    end if;
    if v_amount_paid < v_total and p_supplier_id is null then
      raise exception 'Supplier required for partial or credit purchases';
    end if;
    if v_amount_paid >= v_total then
      v_payment_status := 'paid';
      v_amount_paid := v_total;
    elsif v_amount_paid > 0 then
      v_payment_status := 'partial';
    else
      v_payment_status := 'credit';
    end if;
    v_received_at := p_date;
  else
    v_amount_paid := 0;
    v_payment_status := 'unpaid';
    v_received_at := null;
  end if;

  insert into public.purchases (
    user_id, organization_id, supplier_id, date, notes,
    receipt_status, expected_at, received_at,
    subtotal, fees_amount, fees_notes, total,
    payment_method, payment_status, amount_paid, deleted_at
  )
  values (
    v_user_id, p_organization_id, p_supplier_id, p_date, p_notes,
    p_receipt_status, p_expected_at, v_received_at,
    v_subtotal, v_fees, p_fees_notes, v_total,
    p_payment_method, v_payment_status, v_amount_paid, null
  )
  returning * into v_purchase;

  if p_receipt_status = 'received' and v_amount_paid > 0 and v_payment_status <> 'paid' then
    insert into public.purchase_payments (
      organization_id, purchase_id, user_id, amount, payment_method, date, notes
    )
    values (
      p_organization_id, v_purchase.id, v_user_id, v_amount_paid,
      p_payment_method, p_date, p_notes
    );
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty_ordered := coalesce(
      (v_item->>'quantity_ordered')::numeric,
      (v_item->>'quantity')::numeric
    );
    v_unit_cost := (v_item->>'unit_cost')::numeric;

    if p_receipt_status = 'received' then
      v_qty_received := coalesce(
        (v_item->>'quantity_received')::numeric,
        v_qty_ordered
      );
      v_line_total := trunc(v_qty_received * v_unit_cost, 3);
    else
      v_qty_received := null;
      v_line_total := trunc(v_qty_ordered * v_unit_cost, 3);
    end if;

    select unit_of_measure into v_uom from public.products
    where id = v_product_id and organization_id = p_organization_id and deleted_at is null;

    if v_uom is null then
      raise exception 'Product not found';
    end if;

    insert into public.purchase_items (
      purchase_id, product_id, quantity, quantity_ordered, quantity_received,
      unit_cost, line_total, unit_of_measure, deleted_at
    )
    values (
      v_purchase.id, v_product_id, coalesce(v_qty_received, v_qty_ordered),
      v_qty_ordered, v_qty_received, v_unit_cost, v_line_total, v_uom, null
    );

    if p_receipt_status = 'received' then
      perform public.apply_stock_movement(
        p_organization_id, v_product_id, v_qty_received, 'purchase_receive',
        v_purchase.id, null, true, v_user_id, true, null
      );
    end if;
  end loop;

  return v_purchase;
end;
$$;

-- 4e. Receive a pending purchase
create or replace function public.receive_purchase(
  p_purchase_id uuid,
  p_items jsonb,
  p_date timestamptz default null,
  p_notes text default null,
  p_payment_method text default 'cash',
  p_amount_paid numeric default null,
  p_fees_amount numeric default 0,
  p_fees_notes text default null
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
  v_amount_paid numeric;
  v_payment_status text;
  v_uom public.unit_of_measure;
  v_received_at timestamptz := coalesce(p_date, now());
  v_ts timestamptz := now();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;
  if p_payment_method is null or p_payment_method not in ('cash', 'transfer', 'credit') then
    raise exception 'Invalid payment method';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Add at least one line item';
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
  if v_purchase.receipt_status <> 'pending' then
    raise exception 'Only pending purchases can be received';
  end if;

  v_fees := coalesce(p_fees_amount, 0);

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty_received := coalesce(
      (v_item->>'quantity_received')::numeric,
      (v_item->>'quantity_ordered')::numeric,
      (v_item->>'quantity')::numeric
    );
    v_unit_cost := (v_item->>'unit_cost')::numeric;
    if (v_item->>'product_id') is null then
      raise exception 'Product is required';
    end if;
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
  v_amount_paid := coalesce(p_amount_paid, v_total);

  if v_amount_paid < 0 or v_amount_paid > v_total then
    raise exception 'Amount paid must be between 0 and total';
  end if;
  if v_amount_paid < v_total and v_purchase.supplier_id is null then
    raise exception 'Supplier required for partial or credit purchases';
  end if;

  if v_amount_paid >= v_total then
    v_payment_status := 'paid';
    v_amount_paid := v_total;
  elsif v_amount_paid > 0 then
    v_payment_status := 'partial';
  else
    v_payment_status := 'credit';
  end if;

  update public.purchase_items set deleted_at = v_ts
  where purchase_id = p_purchase_id and deleted_at is null;

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

    select unit_of_measure into v_uom from public.products
    where id = v_product_id and organization_id = v_purchase.organization_id and deleted_at is null;

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

    perform public.apply_stock_movement(
      v_purchase.organization_id, v_product_id, v_qty_received, 'purchase_receive',
      p_purchase_id, null, true, v_user_id, true, null
    );
  end loop;

  update public.purchases
  set
    receipt_status = 'received',
    received_at = v_received_at,
    date = coalesce(p_date, date),
    notes = coalesce(p_notes, notes),
    subtotal = v_subtotal,
    fees_amount = v_fees,
    fees_notes = coalesce(p_fees_notes, fees_notes),
    total = v_total,
    payment_method = p_payment_method,
    payment_status = v_payment_status,
    amount_paid = v_amount_paid
  where id = p_purchase_id
  returning * into v_purchase;

  if v_amount_paid > 0 then
    insert into public.purchase_payments (
      organization_id, purchase_id, user_id, amount, payment_method, date, notes
    )
    values (
      v_purchase.organization_id, p_purchase_id, v_user_id, v_amount_paid,
      p_payment_method, v_received_at, p_notes
    );
  end if;

  return v_purchase;
end;
$$;

-- 4f. Edit a received purchase: stock moves by Σ(new) − Σ(old) per product
create or replace function public.update_received_purchase(
  p_purchase_id uuid,
  p_supplier_id uuid,
  p_date timestamptz,
  p_notes text,
  p_items jsonb,
  p_fees_amount numeric default 0,
  p_fees_notes text default null
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
    order by 1
  loop
    perform public.apply_stock_movement(
      v_purchase.organization_id, v_delta.product_id, v_delta.delta, 'purchase_edit',
      p_purchase_id, null, false, v_user_id, false,
      'Insufficient stock to reduce purchase quantity'
    );
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
      and organization_id = v_purchase.organization_id;

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

-- 4g. Delete purchase: received units leave stock. Refuse if they were already sold.
create or replace function public.soft_delete_purchase(p_purchase_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase public.purchases;
  v_item record;
  v_ts timestamptz := now();
  v_payment_count int;
begin
  select * into v_purchase from public.purchases where id = p_purchase_id and deleted_at is null for update;
  if v_purchase.id is null then return; end if;
  if v_purchase.user_id <> auth.uid() then raise exception 'Forbidden'; end if;
  if v_purchase.organization_id is not null and not public.user_has_org_access(v_purchase.organization_id) then
    raise exception 'Forbidden';
  end if;

  if v_purchase.receipt_status = 'pending' then
    update public.purchase_items set deleted_at = v_ts
    where purchase_id = p_purchase_id and deleted_at is null;
    update public.purchases set deleted_at = v_ts where id = p_purchase_id;
    return;
  end if;

  if v_purchase.payment_status in ('partial', 'credit') then
    raise exception 'Cannot delete purchase with outstanding balance';
  end if;

  select count(*) into v_payment_count
  from public.purchase_payments
  where purchase_id = p_purchase_id and deleted_at is null;

  if v_payment_count > 0 then
    raise exception 'Cannot delete purchase with payment records';
  end if;

  for v_item in
    select
      product_id,
      sum(coalesce(quantity_received, quantity_ordered, quantity)) as qty
    from public.purchase_items
    where purchase_id = p_purchase_id and deleted_at is null
    group by product_id
    order by product_id
  loop
    if v_item.qty > 0 then
      perform public.apply_stock_movement(
        v_purchase.organization_id, v_item.product_id, -v_item.qty, 'purchase_void',
        p_purchase_id, null, false, auth.uid(), false,
        'Insufficient stock to reduce purchase quantity'
      );
    end if;
  end loop;

  update public.purchase_items set deleted_at = v_ts
  where purchase_id = p_purchase_id and deleted_at is null;

  update public.purchases set deleted_at = v_ts where id = p_purchase_id;
end;
$$;

grant execute on function public.create_stock_adjustment(uuid, uuid, numeric, text, text) to authenticated;
grant execute on function public.create_sale_with_items(uuid, uuid, timestamptz, text, text, boolean, numeric, jsonb) to authenticated;
grant execute on function public.soft_delete_sale(uuid) to authenticated;
grant execute on function public.create_purchase_with_items(uuid, uuid, timestamptz, text, text, jsonb, timestamptz, text, numeric, numeric, text) to authenticated;
grant execute on function public.receive_purchase(uuid, jsonb, timestamptz, text, text, numeric, numeric, text) to authenticated;
grant execute on function public.update_received_purchase(uuid, uuid, timestamptz, text, jsonb, numeric, text) to authenticated;
grant execute on function public.soft_delete_purchase(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Undo the 2026-11-10 reconcile
-- ---------------------------------------------------------------------------
-- Every stock RPC already handled paid, partial and credit sales, and no
-- received purchase was ever saved with repeated product lines, so the
-- pre-reconcile numbers were right. The reconcile ignored opening stock.
-- Add back exactly what it removed, keeping every sale and purchase since.
-- Products counted by hand after the reconcile keep their count.

alter table public.stock_reconcile_20261109
  add column if not exists reverted_at timestamptz,
  add column if not exists reverted_delta numeric;

do $$
declare
  r record;
begin
  for r in
    select rc.product_id, rc.organization_id, rc.previous_stock, rc.computed_stock, p.user_id
    from public.stock_reconcile_20261109 rc
    join public.products p on p.id = rc.product_id
    where rc.reverted_at is null
      and rc.previous_stock > rc.computed_stock
      and not exists (
        select 1
        from public.stock_movements sm
        where sm.product_id = rc.product_id
          and sm.created_at > rc.reconciled_at
          and sm.reason in ('count_correction', 'personal_use', 'waste', 'gift', 'other')
      )
    order by rc.product_id
  loop
    perform public.apply_stock_movement(
      r.organization_id, r.product_id, r.previous_stock - r.computed_stock, 'system_correction',
      null,
      'Restaura el stock inicial que la reconciliación automática del 10/11/2026 descontó por error',
      true, r.user_id, false, null
    );

    update public.stock_reconcile_20261109
    set reverted_at = now(),
        reverted_delta = r.previous_stock - r.computed_stock
    where product_id = r.product_id;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Supplier debts: balances + pay several purchases at once
-- ---------------------------------------------------------------------------

create index if not exists purchases_org_supplier_open_idx
  on public.purchases (organization_id, supplier_id, date)
  where deleted_at is null and payment_status in ('partial', 'credit');

create or replace function public.get_supplier_balances_agg(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not public.user_has_org_access(p_organization_id) then
    raise exception 'No access to organization';
  end if;

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'supplier_id', x.supplier_id,
          'balance_due', x.balance_due,
          'open_purchase_count', x.open_purchase_count
        )
        order by x.balance_due desc
      )
      from (
        select
          p.supplier_id,
          coalesce(sum(p.total - p.amount_paid), 0)::numeric as balance_due,
          count(*)::int as open_purchase_count
        from public.purchases p
        where p.organization_id = p_organization_id
          and p.deleted_at is null
          and p.receipt_status = 'received'
          and p.payment_status in ('partial', 'credit')
          and p.supplier_id is not null
          and p.total - p.amount_paid > 0
        group by p.supplier_id
      ) x
    ),
    '[]'::jsonb
  );
end;
$$;

-- One payment split across several open purchases of a supplier, oldest first.
-- p_purchase_ids limits the split to the purchases the user picked (null = all).
create or replace function public.record_supplier_payment(
  p_organization_id uuid,
  p_supplier_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_date timestamptz default now(),
  p_notes text default null,
  p_purchase_ids uuid[] default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_purchase public.purchases;
  v_amount numeric;
  v_remaining numeric;
  v_balance numeric;
  v_apply numeric;
  v_new_paid numeric;
  v_total_balance numeric := 0;
  v_allocations jsonb := '[]'::jsonb;
  v_pay_date timestamptz := coalesce(p_date, now());
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;
  if not public.user_has_org_access(p_organization_id) then
    raise exception 'No access to organization';
  end if;
  if p_supplier_id is null then
    raise exception 'Supplier is required';
  end if;

  v_amount := round(p_amount, 3);

  if v_amount is null or v_amount <= 0 then
    raise exception 'Payment amount must be positive';
  end if;
  if p_payment_method is null or p_payment_method not in ('cash', 'transfer', 'credit') then
    raise exception 'Invalid payment method';
  end if;
  if p_purchase_ids is not null and cardinality(p_purchase_ids) = 0 then
    raise exception 'Select at least one purchase';
  end if;

  -- Lock the open purchases first so the balance check and the split agree.
  perform 1
  from public.purchases
  where organization_id = p_organization_id
    and supplier_id = p_supplier_id
    and deleted_at is null
    and receipt_status = 'received'
    and payment_status in ('partial', 'credit')
    and (p_purchase_ids is null or id = any (p_purchase_ids))
  order by date asc, id asc
  for update;

  select coalesce(sum(total - amount_paid), 0)
  into v_total_balance
  from public.purchases
  where organization_id = p_organization_id
    and supplier_id = p_supplier_id
    and deleted_at is null
    and receipt_status = 'received'
    and payment_status in ('partial', 'credit')
    and (p_purchase_ids is null or id = any (p_purchase_ids));

  if v_total_balance <= 0 then
    raise exception 'No open balance for supplier';
  end if;
  if v_amount > v_total_balance then
    raise exception 'Payment exceeds balance due';
  end if;

  v_remaining := v_amount;

  for v_purchase in
    select *
    from public.purchases
    where organization_id = p_organization_id
      and supplier_id = p_supplier_id
      and deleted_at is null
      and receipt_status = 'received'
      and payment_status in ('partial', 'credit')
      and (p_purchase_ids is null or id = any (p_purchase_ids))
    order by date asc, id asc
  loop
    exit when v_remaining <= 0;

    v_balance := v_purchase.total - v_purchase.amount_paid;
    if v_balance <= 0 then
      continue;
    end if;

    v_apply := least(v_remaining, v_balance);

    insert into public.purchase_payments (
      organization_id, purchase_id, user_id, amount, payment_method, date, notes
    )
    values (
      p_organization_id, v_purchase.id, v_user_id, v_apply,
      p_payment_method, v_pay_date, p_notes
    );

    v_new_paid := v_purchase.amount_paid + v_apply;

    update public.purchases
    set
      amount_paid = v_new_paid,
      payment_status = public.purchase_payment_status_from_amounts(v_new_paid, total)
    where id = v_purchase.id;

    v_allocations := v_allocations || jsonb_build_array(
      jsonb_build_object('purchase_id', v_purchase.id, 'amount', v_apply)
    );
    v_remaining := v_remaining - v_apply;
  end loop;

  if v_remaining > 0 then
    raise exception 'Payment exceeds balance due';
  end if;

  return jsonb_build_object(
    'supplier_id', p_supplier_id,
    'amount', v_amount,
    'allocations', v_allocations
  );
end;
$$;

revoke all on function public.get_supplier_balances_agg(uuid) from public, anon;
revoke all on function public.record_supplier_payment(uuid, uuid, numeric, text, timestamptz, text, uuid[]) from public, anon;
grant execute on function public.get_supplier_balances_agg(uuid) to authenticated;
grant execute on function public.record_supplier_payment(uuid, uuid, numeric, text, timestamptz, text, uuid[]) to authenticated;
