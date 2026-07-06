alter table public.products add column if not exists deleted_at timestamptz;
alter table public.contacts add column if not exists deleted_at timestamptz;
alter table public.sales add column if not exists deleted_at timestamptz;
alter table public.purchases add column if not exists deleted_at timestamptz;
alter table public.sale_items add column if not exists deleted_at timestamptz;
alter table public.purchase_items add column if not exists deleted_at timestamptz;

create index if not exists products_user_active_idx
  on public.products (user_id) where deleted_at is null;
create index if not exists contacts_user_active_idx
  on public.contacts (user_id) where deleted_at is null;
create index if not exists sales_user_active_date_idx
  on public.sales (user_id, date desc) where deleted_at is null;
create index if not exists purchases_user_active_date_idx
  on public.purchases (user_id, date desc) where deleted_at is null;
