-- Profile locale for i18n
alter table public.profiles
  add column if not exists locale text not null default 'es';

-- Organization scoping for business entities
alter table public.products
  add column if not exists organization_id uuid references public.organizations(id);
alter table public.contacts
  add column if not exists organization_id uuid references public.organizations(id);
alter table public.sales
  add column if not exists organization_id uuid references public.organizations(id);
alter table public.purchases
  add column if not exists organization_id uuid references public.organizations(id);

-- Backfill organization_id from first business org owned by user
update public.products p
set organization_id = sub.org_id
from (
  select distinct on (o.owner_user_id) o.owner_user_id, o.id as org_id
  from public.organizations o
  where o.type = 'business'
  order by o.owner_user_id, o.created_at asc
) sub
where p.user_id = sub.owner_user_id and p.organization_id is null;

update public.contacts c
set organization_id = sub.org_id
from (
  select distinct on (o.owner_user_id) o.owner_user_id, o.id as org_id
  from public.organizations o
  where o.type = 'business'
  order by o.owner_user_id, o.created_at asc
) sub
where c.user_id = sub.owner_user_id and c.organization_id is null;

update public.sales s
set organization_id = sub.org_id
from (
  select distinct on (o.owner_user_id) o.owner_user_id, o.id as org_id
  from public.organizations o
  where o.type = 'business'
  order by o.owner_user_id, o.created_at asc
) sub
where s.user_id = sub.owner_user_id and s.organization_id is null;

update public.purchases pu
set organization_id = sub.org_id
from (
  select distinct on (o.owner_user_id) o.owner_user_id, o.id as org_id
  from public.organizations o
  where o.type = 'business'
  order by o.owner_user_id, o.created_at asc
) sub
where pu.user_id = sub.owner_user_id and pu.organization_id is null;

create index if not exists products_org_active_idx
  on public.products (organization_id) where deleted_at is null;
create index if not exists contacts_org_active_idx
  on public.contacts (organization_id) where deleted_at is null;
create index if not exists sales_org_active_date_idx
  on public.sales (organization_id, date desc) where deleted_at is null;
create index if not exists purchases_org_active_date_idx
  on public.purchases (organization_id, date desc) where deleted_at is null;

-- Org access helper
create or replace function public.user_has_org_access(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_users ou
    where ou.organization_id = org_id and ou.user_id = auth.uid()
  );
$$;

-- RLS: profiles
alter table public.profiles enable row level security;
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid());

-- RLS: personal finance
alter table public.accounts enable row level security;
drop policy if exists accounts_all_own on public.accounts;
create policy accounts_all_own on public.accounts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.categories enable row level security;
drop policy if exists categories_all_own on public.categories;
create policy categories_all_own on public.categories
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.budgets enable row level security;
drop policy if exists budgets_all_own on public.budgets;
create policy budgets_all_own on public.budgets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.transactions enable row level security;
drop policy if exists transactions_all_own on public.transactions;
create policy transactions_all_own on public.transactions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- RLS: organizations
alter table public.organizations enable row level security;
drop policy if exists organizations_select_member on public.organizations;
create policy organizations_select_member on public.organizations
  for select using (public.user_has_org_access(id) or owner_user_id = auth.uid());
drop policy if exists organizations_insert_own on public.organizations;
create policy organizations_insert_own on public.organizations
  for insert with check (owner_user_id = auth.uid());
drop policy if exists organizations_update_owner on public.organizations;
create policy organizations_update_owner on public.organizations
  for update using (owner_user_id = auth.uid());

alter table public.organization_users enable row level security;
drop policy if exists org_users_select on public.organization_users;
create policy org_users_select on public.organization_users
  for select using (user_id = auth.uid() or public.user_has_org_access(organization_id));
drop policy if exists org_users_insert on public.organization_users;
create policy org_users_insert on public.organization_users
  for insert with check (user_id = auth.uid());

-- RLS: business entities (org-scoped)
alter table public.products enable row level security;
drop policy if exists products_org on public.products;
create policy products_org on public.products
  for all using (
    user_id = auth.uid()
    and (organization_id is null or public.user_has_org_access(organization_id))
  ) with check (
    user_id = auth.uid()
    and organization_id is not null
    and public.user_has_org_access(organization_id)
  );

alter table public.contacts enable row level security;
drop policy if exists contacts_org on public.contacts;
create policy contacts_org on public.contacts
  for all using (
    user_id = auth.uid()
    and (organization_id is null or public.user_has_org_access(organization_id))
  ) with check (
    user_id = auth.uid()
    and organization_id is not null
    and public.user_has_org_access(organization_id)
  );

alter table public.sales enable row level security;
drop policy if exists sales_org on public.sales;
create policy sales_org on public.sales
  for all using (
    user_id = auth.uid()
    and (organization_id is null or public.user_has_org_access(organization_id))
  ) with check (
    user_id = auth.uid()
    and organization_id is not null
    and public.user_has_org_access(organization_id)
  );

alter table public.purchases enable row level security;
drop policy if exists purchases_org on public.purchases;
create policy purchases_org on public.purchases
  for all using (
    user_id = auth.uid()
    and (organization_id is null or public.user_has_org_access(organization_id))
  ) with check (
    user_id = auth.uid()
    and organization_id is not null
    and public.user_has_org_access(organization_id)
  );

alter table public.sale_items enable row level security;
drop policy if exists sale_items_org on public.sale_items;
create policy sale_items_org on public.sale_items
  for all using (
    exists (
      select 1 from public.sales s
      where s.id = sale_id and s.user_id = auth.uid()
        and (s.organization_id is null or public.user_has_org_access(s.organization_id))
    )
  );

alter table public.purchase_items enable row level security;
drop policy if exists purchase_items_org on public.purchase_items;
create policy purchase_items_org on public.purchase_items
  for all using (
    exists (
      select 1 from public.purchases p
      where p.id = purchase_id and p.user_id = auth.uid()
        and (p.organization_id is null or public.user_has_org_access(p.organization_id))
    )
  );

-- Atomic sale creation with stock adjustment
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
    v_total := v_total + (v_item->>'line_total')::numeric;
  end loop;

  insert into public.sales (user_id, organization_id, customer_id, date, notes, total, deleted_at)
  values (v_user_id, p_organization_id, p_customer_id, p_date, p_notes, v_total, null)
  returning * into v_sale;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::numeric;
    v_unit_price := (v_item->>'unit_price')::numeric;
    v_line_total := (v_item->>'line_total')::numeric;

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

-- Atomic purchase creation with stock adjustment
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
    v_total := v_total + (v_item->>'line_total')::numeric;
  end loop;

  insert into public.purchases (user_id, organization_id, supplier_id, date, notes, total, deleted_at)
  values (v_user_id, p_organization_id, p_supplier_id, p_date, p_notes, v_total, null)
  returning * into v_purchase;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::numeric;
    v_unit_cost := (v_item->>'unit_cost')::numeric;
    v_line_total := (v_item->>'line_total')::numeric;

    insert into public.purchase_items (purchase_id, product_id, quantity, unit_cost, line_total, deleted_at)
    values (v_purchase.id, v_product_id, v_qty, v_unit_cost, v_line_total, null);

    update public.products set stock = stock + v_qty
    where id = v_product_id and organization_id = p_organization_id;
  end loop;

  return v_purchase;
end;
$$;

-- Soft delete sale with stock reversal
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

  for v_item in
    select * from public.sale_items where sale_id = p_sale_id and deleted_at is null
  loop
    update public.products set stock = stock + v_item.quantity where id = v_item.product_id;
    update public.sale_items set deleted_at = v_ts where id = v_item.id;
  end loop;

  update public.sales set deleted_at = v_ts where id = p_sale_id;
end;
$$;

-- Soft delete purchase with stock reversal
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
begin
  select * into v_purchase from public.purchases where id = p_purchase_id and deleted_at is null;
  if v_purchase.id is null then return; end if;
  if v_purchase.user_id <> auth.uid() then raise exception 'Forbidden'; end if;
  if v_purchase.organization_id is not null and not public.user_has_org_access(v_purchase.organization_id) then
    raise exception 'Forbidden';
  end if;

  for v_item in
    select * from public.purchase_items where purchase_id = p_purchase_id and deleted_at is null
  loop
    update public.products set stock = stock - v_item.quantity where id = v_item.product_id;
    update public.purchase_items set deleted_at = v_ts where id = v_item.id;
  end loop;

  update public.purchases set deleted_at = v_ts where id = p_purchase_id;
end;
$$;

grant execute on function public.create_sale_with_items to authenticated;
grant execute on function public.create_purchase_with_items to authenticated;
grant execute on function public.soft_delete_sale to authenticated;
grant execute on function public.soft_delete_purchase to authenticated;
