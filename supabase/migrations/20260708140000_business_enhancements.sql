-- Business enhancements: payment_method, unit_of_measure, stock_movements

-- Payment method on sales
alter table public.sales
  add column if not exists payment_method text not null default 'cash'
  check (payment_method in ('cash', 'card', 'transfer'));

-- Unit of measure on products
do $$ begin
  create type public.unit_of_measure as enum ('unit', 'lb', 'kg', 'package', 'box', 'liter');
exception
  when duplicate_object then null;
end $$;

alter table public.products
  add column if not exists unit_of_measure public.unit_of_measure not null default 'unit';

-- Snapshot UoM on line items
alter table public.sale_items
  add column if not exists unit_of_measure public.unit_of_measure;

alter table public.purchase_items
  add column if not exists unit_of_measure public.unit_of_measure;

-- Stock movements audit table
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  product_id uuid not null references public.products(id),
  user_id uuid not null references auth.users(id),
  quantity_delta numeric not null,
  reason text not null check (reason in ('count_correction', 'personal_use', 'waste', 'gift', 'other')),
  notes text,
  stock_before numeric not null,
  stock_after numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists stock_movements_product_created_idx
  on public.stock_movements (product_id, created_at desc);
create index if not exists stock_movements_org_created_idx
  on public.stock_movements (organization_id, created_at desc);

alter table public.stock_movements enable row level security;

create policy stock_movements_select on public.stock_movements
  for select using (public.user_has_org_access(organization_id));

create policy stock_movements_insert on public.stock_movements
  for insert with check (public.user_has_org_access(organization_id));

-- Updated create_sale_with_items with payment_method and unit_of_measure snapshot
create or replace function public.create_sale_with_items(
  p_organization_id uuid,
  p_customer_id uuid,
  p_date timestamptz,
  p_notes text,
  p_payment_method text,
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

  insert into public.sales (user_id, organization_id, customer_id, date, notes, total, payment_method, deleted_at)
  values (v_user_id, p_organization_id, p_customer_id, p_date, p_notes, v_total, p_payment_method, null)
  returning * into v_sale;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::numeric;
    v_unit_price := (v_item->>'unit_price')::numeric;
    v_line_total := round(v_qty * v_unit_price, 2);

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

-- Updated create_purchase_with_items with unit_of_measure snapshot
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

-- Stock adjustment RPC
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
  v_stock numeric;
  v_stock_after numeric;
  v_movement public.stock_movements;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;
  if not public.user_has_org_access(p_organization_id) then
    raise exception 'No access to organization';
  end if;
  if p_quantity_delta = 0 then
    raise exception 'Quantity delta must be non-zero';
  end if;
  if p_reason is null or p_reason not in ('count_correction', 'personal_use', 'waste', 'gift', 'other') then
    raise exception 'Invalid adjustment reason';
  end if;

  select stock into v_stock from public.products
  where id = p_product_id and organization_id = p_organization_id and deleted_at is null
  for update;

  if v_stock is null then
    raise exception 'Product not found';
  end if;

  v_stock_after := v_stock + p_quantity_delta;
  if v_stock_after < 0 then
    raise exception 'Insufficient stock for adjustment';
  end if;

  insert into public.stock_movements (
    organization_id, product_id, user_id,
    quantity_delta, reason, notes, stock_before, stock_after
  )
  values (
    p_organization_id, p_product_id, v_user_id,
    p_quantity_delta, p_reason, p_notes, v_stock, v_stock_after
  )
  returning * into v_movement;

  update public.products set stock = v_stock_after where id = p_product_id;

  return v_movement;
end;
$$;

grant execute on function public.create_stock_adjustment to authenticated;

-- Drop old create_sale_with_items signature (5 params) if exists
drop function if exists public.create_sale_with_items(uuid, uuid, timestamptz, text, jsonb);
