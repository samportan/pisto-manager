-- On-hand stock is products.stock. Sales already decrement it for paid, partial,
-- and credit (fiado) in create_sale_with_items. Two things still left the number
-- higher than the shelf:
--   1. Re-saving a received purchase used to add the full quantity again.
--   2. Any credit sale that never decremented stock stays in the balance.
--
-- For products with received purchases and no manual count, rebuild:
--   stock = qty received - qty sold (paid + partial + credit) + manual adjustments
-- Only decrease. A higher document total is left for a physical count.
-- The previous value is stored in stock_reconcile_20261109.

create table if not exists public.stock_reconcile_20261109 (
  product_id uuid primary key references public.products (id) on delete cascade,
  organization_id uuid not null references public.organizations (id),
  previous_stock numeric not null,
  computed_stock numeric not null,
  received_qty numeric not null,
  sold_qty numeric not null,
  reconciled_at timestamptz not null default now()
);

alter table public.stock_reconcile_20261109 enable row level security;

drop policy if exists stock_reconcile_20261109_select on public.stock_reconcile_20261109;
create policy stock_reconcile_20261109_select
  on public.stock_reconcile_20261109
  for select
  using (public.user_has_org_access(organization_id));

revoke all on table public.stock_reconcile_20261109 from anon, authenticated;
grant select on table public.stock_reconcile_20261109 to authenticated;

create temp table stock_reconcile_calc on commit drop as
with received as (
  select
    pi.product_id,
    coalesce(sum(coalesce(pi.quantity_received, pi.quantity)), 0) as qty
  from public.purchase_items pi
  join public.purchases pu on pu.id = pi.purchase_id
  where pi.deleted_at is null
    and pu.deleted_at is null
    and pu.receipt_status = 'received'
  group by pi.product_id
),
sold as (
  select
    si.product_id,
    coalesce(sum(si.quantity), 0) as qty
  from public.sale_items si
  join public.sales s on s.id = si.sale_id
  where si.deleted_at is null
    and s.deleted_at is null
  group by si.product_id
),
movement as (
  select
    sm.product_id,
    coalesce(sum(sm.quantity_delta), 0) as adj_qty,
    count(*)::int as adj_count
  from public.stock_movements sm
  where sm.reason in ('count_correction', 'personal_use', 'waste', 'gift', 'other')
  group by sm.product_id
),
calc as (
  select
    p.id as product_id,
    p.organization_id,
    p.stock as previous_stock,
    coalesce(r.qty, 0) as received_qty,
    coalesce(s.qty, 0) as sold_qty,
    case
      when coalesce(m.adj_count, 0) > 0 then p.stock
      when coalesce(r.qty, 0) = 0 then p.stock
      else coalesce(r.qty, 0) - coalesce(s.qty, 0) + coalesce(m.adj_qty, 0)
    end as computed_stock
  from public.products p
  left join received r on r.product_id = p.id
  left join sold s on s.product_id = p.id
  left join movement m on m.product_id = p.id
  where p.deleted_at is null
)
select *
from calc
where computed_stock < previous_stock;

insert into public.stock_reconcile_20261109 (
  product_id,
  organization_id,
  previous_stock,
  computed_stock,
  received_qty,
  sold_qty
)
select
  product_id,
  organization_id,
  previous_stock,
  computed_stock,
  received_qty,
  sold_qty
from stock_reconcile_calc
on conflict (product_id) do nothing;

update public.products p
set stock = c.computed_stock
from stock_reconcile_calc c
where p.id = c.product_id
  and p.stock is distinct from c.computed_stock;
