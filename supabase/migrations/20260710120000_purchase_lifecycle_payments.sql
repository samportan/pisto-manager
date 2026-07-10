-- Purchase lifecycle: pending/received receipt, supplier payments, fees, editable lines

-- Purchases: receipt + money columns
alter table public.purchases
  add column if not exists receipt_status text not null default 'received'
    check (receipt_status in ('pending', 'received', 'cancelled')),
  add column if not exists expected_at timestamptz,
  add column if not exists received_at timestamptz,
  add column if not exists subtotal numeric not null default 0,
  add column if not exists fees_amount numeric not null default 0,
  add column if not exists fees_notes text,
  add column if not exists payment_method text not null default 'cash'
    check (payment_method in ('cash', 'transfer', 'credit')),
  add column if not exists payment_status text not null default 'paid'
    check (payment_status in ('unpaid', 'partial', 'paid', 'credit')),
  add column if not exists amount_paid numeric not null default 0;

-- Backfill existing purchases
update public.purchases
set
  receipt_status = 'received',
  received_at = date,
  subtotal = total,
  fees_amount = 0,
  payment_method = 'cash',
  payment_status = 'paid',
  amount_paid = total
where subtotal = 0 and amount_paid = 0;

alter table public.purchases
  add column if not exists balance_due numeric
    generated always as (total - amount_paid) stored;

-- Purchase items: ordered vs received quantities
alter table public.purchase_items
  add column if not exists quantity_ordered numeric,
  add column if not exists quantity_received numeric;

update public.purchase_items
set
  quantity_ordered = quantity,
  quantity_received = quantity
where quantity_ordered is null;

alter table public.purchase_items
  alter column quantity_ordered set not null;

-- Purchase payments (supplier payables)
create table if not exists public.purchase_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  purchase_id uuid not null references public.purchases(id),
  user_id uuid not null references auth.users(id),
  amount numeric not null check (amount > 0),
  payment_method text not null check (payment_method in ('cash', 'transfer', 'credit')),
  date timestamptz not null default now(),
  notes text,
  deleted_at timestamptz
);

create index if not exists purchase_payments_purchase_idx
  on public.purchase_payments (purchase_id, date desc);
create index if not exists purchase_payments_org_idx
  on public.purchase_payments (organization_id);

alter table public.purchase_payments enable row level security;

drop policy if exists purchase_payments_select on public.purchase_payments;
create policy purchase_payments_select on public.purchase_payments
  for select using (public.user_has_org_access(organization_id));

drop policy if exists purchase_payments_insert on public.purchase_payments;
create policy purchase_payments_insert on public.purchase_payments
  for insert with check (public.user_has_org_access(organization_id));

-- Helper: compute purchase payment status from amounts
create or replace function public.purchase_payment_status_from_amounts(
  p_amount_paid numeric,
  p_total numeric
)
returns text
language sql
immutable
as $$
  select case
    when coalesce(p_amount_paid, 0) >= p_total then 'paid'
    when coalesce(p_amount_paid, 0) > 0 then 'partial'
    else 'credit'
  end;
$$;

-- Drop old create_purchase_with_items signature
drop function if exists public.create_purchase_with_items(uuid, uuid, timestamptz, text, jsonb);

create or replace function public.create_purchase_with_items(
  p_organization_id uuid,
  p_supplier_id uuid,
  p_date timestamptz,
  p_notes text,
  p_receipt_status text,
  p_expected_at timestamptz default null,
  p_payment_method text default 'cash',
  p_amount_paid numeric default null,
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

  v_fees := coalesce(p_fees_amount, 0);

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty_ordered := coalesce(
      (v_item->>'quantity_ordered')::numeric,
      (v_item->>'quantity')::numeric
    );
    v_unit_cost := (v_item->>'unit_cost')::numeric;
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
      update public.products set stock = stock + v_qty_received
      where id = v_product_id and organization_id = p_organization_id;
    end if;
  end loop;

  return v_purchase;
end;
$$;

create or replace function public.update_pending_purchase(
  p_purchase_id uuid,
  p_supplier_id uuid,
  p_date timestamptz,
  p_notes text,
  p_expected_at timestamptz default null,
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
  v_unit_cost numeric;
  v_line_total numeric;
  v_subtotal numeric := 0;
  v_fees numeric := 0;
  v_total numeric := 0;
  v_uom public.unit_of_measure;
  v_ts timestamptz := now();
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
  if v_purchase.receipt_status <> 'pending' then
    raise exception 'Only pending purchases can be updated this way';
  end if;

  v_fees := coalesce(p_fees_amount, 0);

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty_ordered := coalesce(
      (v_item->>'quantity_ordered')::numeric,
      (v_item->>'quantity')::numeric
    );
    v_unit_cost := (v_item->>'unit_cost')::numeric;
    if v_qty_ordered is null or v_qty_ordered <= 0 then
      raise exception 'Quantity ordered must be positive';
    end if;
    if v_unit_cost is null or v_unit_cost < 0 then
      raise exception 'Unit cost must be non-negative';
    end if;
    v_line_total := trunc(v_qty_ordered * v_unit_cost, 3);
    v_subtotal := v_subtotal + v_line_total;
  end loop;

  v_total := trunc(v_subtotal + v_fees, 3);

  update public.purchase_items set deleted_at = v_ts
  where purchase_id = p_purchase_id and deleted_at is null;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty_ordered := coalesce(
      (v_item->>'quantity_ordered')::numeric,
      (v_item->>'quantity')::numeric
    );
    v_unit_cost := (v_item->>'unit_cost')::numeric;
    v_line_total := trunc(v_qty_ordered * v_unit_cost, 3);

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
      p_purchase_id, v_product_id, v_qty_ordered, v_qty_ordered, null,
      v_unit_cost, v_line_total, v_uom, null
    );
  end loop;

  update public.purchases
  set
    supplier_id = p_supplier_id,
    date = p_date,
    notes = p_notes,
    expected_at = p_expected_at,
    subtotal = v_subtotal,
    fees_amount = v_fees,
    fees_notes = p_fees_notes,
    total = v_total
  where id = p_purchase_id
  returning * into v_purchase;

  return v_purchase;
end;
$$;

create or replace function public.receive_purchase(
  p_purchase_id uuid,
  p_date timestamptz default null,
  p_notes text default null,
  p_payment_method text default 'cash',
  p_amount_paid numeric default null,
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

    update public.products set stock = stock + v_qty_received
    where id = v_product_id and organization_id = v_purchase.organization_id;
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
  v_old_item record;
  v_item jsonb;
  v_product_id uuid;
  v_qty_ordered numeric;
  v_qty_received numeric;
  v_old_qty numeric;
  v_new_qty numeric;
  v_delta numeric;
  v_unit_cost numeric;
  v_line_total numeric;
  v_subtotal numeric := 0;
  v_fees numeric := 0;
  v_total numeric := 0;
  v_stock numeric;
  v_uom public.unit_of_measure;
  v_ts timestamptz := now();
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

  v_fees := coalesce(p_fees_amount, 0);

  for v_item in select * from jsonb_array_elements(p_items)
  loop
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

  for v_old_item in
    select * from public.purchase_items
    where purchase_id = p_purchase_id and deleted_at is null
  loop
    v_old_qty := coalesce(v_old_item.quantity_received, v_old_item.quantity_ordered, v_old_item.quantity);
    v_new_qty := 0;

    for v_item in select * from jsonb_array_elements(p_items)
    loop
      if (v_item->>'product_id')::uuid = v_old_item.product_id then
        v_new_qty := coalesce(
          (v_item->>'quantity_received')::numeric,
          (v_item->>'quantity_ordered')::numeric,
          (v_item->>'quantity')::numeric
        );
        exit;
      end if;
    end loop;

    v_delta := v_new_qty - v_old_qty;
    if v_delta < 0 then
      select stock into v_stock from public.products
      where id = v_old_item.product_id and organization_id = v_purchase.organization_id
      for update;
      if v_stock is null then
        raise exception 'Product not found';
      end if;
      if v_stock + v_delta < 0 then
        raise exception 'Insufficient stock to reduce purchase quantity';
      end if;
    end if;
  end loop;

  for v_old_item in
    select * from public.purchase_items
    where purchase_id = p_purchase_id and deleted_at is null
  loop
    v_old_qty := coalesce(v_old_item.quantity_received, v_old_item.quantity_ordered, v_old_item.quantity);
    v_new_qty := 0;

    for v_item in select * from jsonb_array_elements(p_items)
    loop
      if (v_item->>'product_id')::uuid = v_old_item.product_id then
        v_new_qty := coalesce(
          (v_item->>'quantity_received')::numeric,
          (v_item->>'quantity_ordered')::numeric,
          (v_item->>'quantity')::numeric
        );
        exit;
      end if;
    end loop;

    v_delta := v_new_qty - v_old_qty;
    if v_delta <> 0 then
      update public.products set stock = stock + v_delta
      where id = v_old_item.product_id and organization_id = v_purchase.organization_id;
    end if;
  end loop;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    if exists (
      select 1 from public.purchase_items
      where purchase_id = p_purchase_id
        and product_id = v_product_id
        and deleted_at is null
    ) then
      continue;
    end if;

    v_qty_received := coalesce(
      (v_item->>'quantity_received')::numeric,
      (v_item->>'quantity_ordered')::numeric,
      (v_item->>'quantity')::numeric
    );

    update public.products set stock = stock + v_qty_received
    where id = v_product_id and organization_id = v_purchase.organization_id;
  end loop;

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

create or replace function public.record_purchase_payment(
  p_purchase_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_date timestamptz default now(),
  p_notes text default null
)
returns public.purchases
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_purchase public.purchases;
  v_new_paid numeric;
  v_balance numeric;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be positive';
  end if;
  if p_payment_method is null or p_payment_method not in ('cash', 'transfer', 'credit') then
    raise exception 'Invalid payment method';
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
    raise exception 'Cannot record payment until purchase is received';
  end if;
  if v_purchase.payment_status = 'paid' then
    raise exception 'Purchase is already fully paid';
  end if;

  v_balance := v_purchase.total - v_purchase.amount_paid;
  if p_amount > v_balance then
    raise exception 'Payment exceeds balance due';
  end if;

  insert into public.purchase_payments (
    organization_id, purchase_id, user_id, amount, payment_method, date, notes
  )
  values (
    v_purchase.organization_id, p_purchase_id, v_user_id, p_amount,
    p_payment_method, coalesce(p_date, now()), p_notes
  );

  v_new_paid := v_purchase.amount_paid + p_amount;

  update public.purchases
  set
    amount_paid = v_new_paid,
    payment_status = public.purchase_payment_status_from_amounts(v_new_paid, total)
  where id = p_purchase_id
  returning * into v_purchase;

  return v_purchase;
end;
$$;

create or replace function public.cancel_pending_purchase(p_purchase_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase public.purchases;
  v_ts timestamptz := now();
begin
  select * into v_purchase from public.purchases
  where id = p_purchase_id and deleted_at is null;

  if v_purchase.id is null then return; end if;
  if v_purchase.user_id <> auth.uid() then raise exception 'Forbidden'; end if;
  if not public.user_has_org_access(v_purchase.organization_id) then
    raise exception 'Forbidden';
  end if;
  if v_purchase.receipt_status <> 'pending' then
    raise exception 'Only pending purchases can be cancelled';
  end if;

  update public.purchase_items set deleted_at = v_ts
  where purchase_id = p_purchase_id and deleted_at is null;

  update public.purchases
  set receipt_status = 'cancelled', deleted_at = v_ts
  where id = p_purchase_id;
end;
$$;

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
  v_qty numeric;
begin
  select * into v_purchase from public.purchases where id = p_purchase_id and deleted_at is null;
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
    select * from public.purchase_items where purchase_id = p_purchase_id and deleted_at is null
  loop
    v_qty := coalesce(v_item.quantity_received, v_item.quantity_ordered, v_item.quantity);
    if v_qty > 0 then
      update public.products set stock = stock - v_qty where id = v_item.product_id;
    end if;
    update public.purchase_items set deleted_at = v_ts where id = v_item.id;
  end loop;

  update public.purchases set deleted_at = v_ts where id = p_purchase_id;
end;
$$;

grant execute on function public.create_purchase_with_items to authenticated;
grant execute on function public.update_pending_purchase to authenticated;
grant execute on function public.receive_purchase to authenticated;
grant execute on function public.update_received_purchase to authenticated;
grant execute on function public.record_purchase_payment to authenticated;
grant execute on function public.cancel_pending_purchase to authenticated;
