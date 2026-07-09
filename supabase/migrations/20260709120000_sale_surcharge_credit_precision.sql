-- Money precision (trunc 3), card surcharge, credit sales, sale payments

-- Sales: subtotal + card surcharge columns
alter table public.sales
  add column if not exists subtotal numeric not null default 0,
  add column if not exists card_surcharge_rate numeric,
  add column if not exists card_surcharge_amount numeric not null default 0,
  add column if not exists apply_card_surcharge boolean not null default false;

-- Sales: payment status / amounts
alter table public.sales
  add column if not exists payment_status text not null default 'paid'
    check (payment_status in ('paid', 'partial', 'credit')),
  add column if not exists amount_paid numeric not null default 0;

-- Backfill existing sales
update public.sales
set subtotal = total,
    amount_paid = total,
    payment_status = 'paid'
where subtotal = 0 or amount_paid = 0;

alter table public.sales
  add column if not exists balance_due numeric
    generated always as (total - amount_paid) stored;

-- Sale payments (abonos)
create table if not exists public.sale_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  sale_id uuid not null references public.sales(id),
  user_id uuid not null references auth.users(id),
  amount numeric not null check (amount > 0),
  payment_method text not null check (payment_method in ('cash', 'card', 'transfer')),
  date timestamptz not null default now(),
  notes text,
  deleted_at timestamptz
);

create index if not exists sale_payments_sale_idx
  on public.sale_payments (sale_id, date desc);
create index if not exists sale_payments_org_idx
  on public.sale_payments (organization_id);

alter table public.sale_payments enable row level security;

create policy sale_payments_select on public.sale_payments
  for select using (public.user_has_org_access(organization_id));

create policy sale_payments_insert on public.sale_payments
  for insert with check (public.user_has_org_access(organization_id));

-- Updated create_sale_with_items: trunc(3), surcharge, credit
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
  v_stock numeric;
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

    select stock, unit_of_measure into v_stock, v_uom from public.products
    where id = v_product_id and organization_id = p_organization_id and deleted_at is null
    for update;

    if v_stock is null then
      raise exception 'Product not found';
    end if;
    if v_stock < v_qty then
      raise exception 'Insufficient stock for product %', v_product_id;
    end if;

    insert into public.sale_items (sale_id, product_id, quantity, unit_price, line_total, unit_of_measure, deleted_at)
    values (v_sale.id, v_product_id, v_qty, v_unit_price, v_line_total, v_uom, null);

    update public.products set stock = stock - v_qty where id = v_product_id;
  end loop;

  return v_sale;
end;
$$;

-- Record sale payment (abono)
create or replace function public.record_sale_payment(
  p_sale_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_date timestamptz default now(),
  p_notes text default null
)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_sale public.sales;
  v_new_paid numeric;
  v_balance numeric;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be positive';
  end if;
  if p_payment_method is null or p_payment_method not in ('cash', 'card', 'transfer') then
    raise exception 'Invalid payment method';
  end if;

  select * into v_sale from public.sales
  where id = p_sale_id and deleted_at is null
  for update;

  if v_sale.id is null then
    raise exception 'Sale not found';
  end if;
  if not public.user_has_org_access(v_sale.organization_id) then
    raise exception 'No access to organization';
  end if;
  if v_sale.payment_status = 'paid' then
    raise exception 'Sale is already fully paid';
  end if;

  v_balance := v_sale.total - v_sale.amount_paid;
  if p_amount > v_balance then
    raise exception 'Payment exceeds balance due';
  end if;

  insert into public.sale_payments (
    organization_id, sale_id, user_id, amount, payment_method, date, notes
  )
  values (
    v_sale.organization_id, p_sale_id, v_user_id, p_amount,
    p_payment_method, coalesce(p_date, now()), p_notes
  );

  v_new_paid := v_sale.amount_paid + p_amount;

  update public.sales
  set
    amount_paid = v_new_paid,
    payment_status = case
      when v_new_paid >= total then 'paid'
      when v_new_paid > 0 then 'partial'
      else 'credit'
    end
  where id = p_sale_id
  returning * into v_sale;

  return v_sale;
end;
$$;

-- Updated create_purchase_with_items: trunc(3)
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
  v_uom public.unit_of_measure;
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
    v_line_total := trunc(v_qty * v_unit_cost, 3);
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
    v_line_total := trunc(v_qty * v_unit_cost, 3);

    select unit_of_measure into v_uom from public.products
    where id = v_product_id and organization_id = p_organization_id and deleted_at is null;

    if v_uom is null then
      raise exception 'Product not found';
    end if;

    insert into public.purchase_items (purchase_id, product_id, quantity, unit_cost, line_total, unit_of_measure, deleted_at)
    values (v_purchase.id, v_product_id, v_qty, v_unit_cost, v_line_total, v_uom, null);

    update public.products set stock = stock + v_qty
    where id = v_product_id and organization_id = p_organization_id;
  end loop;

  return v_purchase;
end;
$$;

-- Soft delete sale: block if credit/partial or has payment records
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
  v_payment_count int;
begin
  select * into v_sale from public.sales where id = p_sale_id and deleted_at is null;
  if v_sale.id is null then return; end if;
  if v_sale.user_id <> auth.uid() then raise exception 'Forbidden'; end if;
  if v_sale.organization_id is not null and not public.user_has_org_access(v_sale.organization_id) then
    raise exception 'Forbidden';
  end if;

  if v_sale.payment_status <> 'paid' then
    raise exception 'Cannot delete sale with outstanding balance';
  end if;

  select count(*) into v_payment_count
  from public.sale_payments
  where sale_id = p_sale_id and deleted_at is null;

  if v_payment_count > 0 then
    raise exception 'Cannot delete sale with payment records';
  end if;

  for v_item in
    select * from public.sale_items where sale_id = p_sale_id and deleted_at is null
  loop
    update public.products set stock = stock + v_item.quantity where id = v_item.product_id;
    update public.sale_items set deleted_at = v_ts where id = v_item.id;
  end loop;

  update public.sales set deleted_at = v_ts where id = p_sale_id;
end;
$$;

drop function if exists public.create_sale_with_items(uuid, uuid, timestamptz, text, text, jsonb);

grant execute on function public.record_sale_payment to authenticated;
