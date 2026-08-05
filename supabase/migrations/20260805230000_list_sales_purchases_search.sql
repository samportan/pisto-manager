-- Paginated sales/purchases list with search across contact + line products.
-- Filtering runs in SQL before limit/offset so counts and pages stay correct.

create extension if not exists pg_trgm;

create index if not exists products_org_name_trgm_idx
  on public.products using gin (name gin_trgm_ops)
  where deleted_at is null;

create index if not exists products_org_sku_trgm_idx
  on public.products using gin (sku gin_trgm_ops)
  where deleted_at is null and sku is not null;

create index if not exists products_org_barcode_trgm_idx
  on public.products using gin (barcode gin_trgm_ops)
  where deleted_at is null and barcode is not null;

create index if not exists contacts_org_name_trgm_idx
  on public.contacts using gin (name gin_trgm_ops)
  where deleted_at is null;

create index if not exists sales_notes_trgm_idx
  on public.sales using gin (notes gin_trgm_ops)
  where deleted_at is null and notes is not null;

create index if not exists purchases_notes_trgm_idx
  on public.purchases using gin (notes gin_trgm_ops)
  where deleted_at is null and notes is not null;

create or replace function public._escape_ilike_pattern(p_term text)
returns text
language sql
immutable
as $$
  select replace(replace(replace(p_term, '\', '\\'), '%', '\%'), '_', '\_');
$$;

create or replace function public.list_sales_paginated(
  p_organization_id uuid,
  p_page integer default 1,
  p_page_size integer default 10,
  p_search text default null,
  p_date_from timestamptz default null,
  p_date_to timestamptz default null,
  p_payment_method text default null,
  p_payment_status text default null,
  p_customer_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_page int := greatest(coalesce(p_page, 1), 1);
  v_page_size int := least(greatest(coalesce(p_page_size, 10), 1), 100);
  v_offset int;
  v_term text;
  v_pattern text;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not public.user_has_org_access(p_organization_id) then
    raise exception 'No access to organization';
  end if;

  v_offset := (v_page - 1) * v_page_size;
  v_term := nullif(trim(coalesce(p_search, '')), '');
  if v_term is not null then
    v_pattern := '%' || public._escape_ilike_pattern(v_term) || '%';
  end if;

  with filtered as (
    select s.*
    from public.sales s
    where s.organization_id = p_organization_id
      and s.deleted_at is null
      and (p_date_from is null or s.date >= p_date_from)
      and (p_date_to is null or s.date <= p_date_to)
      and (p_payment_method is null or p_payment_method = 'all' or s.payment_method = p_payment_method)
      and (p_payment_status is null or p_payment_status = 'all' or s.payment_status = p_payment_status)
      and (p_customer_id is null or s.customer_id = p_customer_id)
      and (
        v_pattern is null
        or s.notes ilike v_pattern escape '\'
        or s.total::text ilike v_pattern escape '\'
        or exists (
          select 1
          from public.contacts c
          where c.id = s.customer_id
            and c.deleted_at is null
            and c.name ilike v_pattern escape '\'
        )
        or exists (
          select 1
          from public.sale_items si
          join public.products p on p.id = si.product_id
          where si.sale_id = s.id
            and si.deleted_at is null
            and (
              p.name ilike v_pattern escape '\'
              or coalesce(p.sku, '') ilike v_pattern escape '\'
              or coalesce(p.barcode, '') ilike v_pattern escape '\'
            )
        )
      )
  ),
  counted as (
    select count(*)::int as total from filtered
  ),
  page_rows as (
    select
      to_jsonb(s) || jsonb_build_object(
        'sale_items',
        (
          select coalesce(
            jsonb_agg(
              jsonb_build_object(
                'quantity', si.quantity,
                'deleted_at', si.deleted_at,
                'products', case
                  when pr.id is null then null
                  else jsonb_build_object('name', pr.name)
                end
              )
              order by si.id
            ),
            '[]'::jsonb
          )
          from public.sale_items si
          left join public.products pr on pr.id = si.product_id
          where si.sale_id = s.id
        )
      ) as row_data
    from filtered s
    order by s.date desc, s.id desc
    limit v_page_size
    offset v_offset
  )
  select jsonb_build_object(
    'data', coalesce((select jsonb_agg(row_data) from page_rows), '[]'::jsonb),
    'total', (select total from counted),
    'page', v_page,
    'page_size', v_page_size
  )
  into v_result;

  return v_result;
end;
$$;

create or replace function public.list_purchases_paginated(
  p_organization_id uuid,
  p_page integer default 1,
  p_page_size integer default 10,
  p_search text default null,
  p_date_from timestamptz default null,
  p_date_to timestamptz default null,
  p_receipt_status text default null,
  p_payment_status text default null,
  p_payment_method text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_page int := greatest(coalesce(p_page, 1), 1);
  v_page_size int := least(greatest(coalesce(p_page_size, 10), 1), 100);
  v_offset int;
  v_term text;
  v_pattern text;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not public.user_has_org_access(p_organization_id) then
    raise exception 'No access to organization';
  end if;

  v_offset := (v_page - 1) * v_page_size;
  v_term := nullif(trim(coalesce(p_search, '')), '');
  if v_term is not null then
    v_pattern := '%' || public._escape_ilike_pattern(v_term) || '%';
  end if;

  with filtered as (
    select p.*
    from public.purchases p
    where p.organization_id = p_organization_id
      and p.deleted_at is null
      and (p_date_from is null or p.date >= p_date_from)
      and (p_date_to is null or p.date <= p_date_to)
      and (p_receipt_status is null or p_receipt_status = 'all' or p.receipt_status = p_receipt_status)
      and (p_payment_status is null or p_payment_status = 'all' or p.payment_status = p_payment_status)
      and (p_payment_method is null or p_payment_method = 'all' or p.payment_method = p_payment_method)
      and (
        v_pattern is null
        or p.notes ilike v_pattern escape '\'
        or p.fees_notes ilike v_pattern escape '\'
        or p.total::text ilike v_pattern escape '\'
        or exists (
          select 1
          from public.contacts c
          where c.id = p.supplier_id
            and c.deleted_at is null
            and c.name ilike v_pattern escape '\'
        )
        or exists (
          select 1
          from public.purchase_items pi
          join public.products pr on pr.id = pi.product_id
          where pi.purchase_id = p.id
            and pi.deleted_at is null
            and (
              pr.name ilike v_pattern escape '\'
              or coalesce(pr.sku, '') ilike v_pattern escape '\'
              or coalesce(pr.barcode, '') ilike v_pattern escape '\'
            )
        )
      )
  ),
  counted as (
    select count(*)::int as total from filtered
  ),
  page_rows as (
    select
      to_jsonb(p) || jsonb_build_object(
        'purchase_items',
        (
          select coalesce(
            jsonb_agg(
              jsonb_build_object(
                'id', pi.id,
                'quantity', coalesce(pi.quantity_ordered, pi.quantity),
                'deleted_at', pi.deleted_at,
                'products', case
                  when pr.id is null then null
                  else jsonb_build_object('name', pr.name)
                end
              )
              order by pi.id
            ),
            '[]'::jsonb
          )
          from public.purchase_items pi
          left join public.products pr on pr.id = pi.product_id
          where pi.purchase_id = p.id
        )
      ) as row_data
    from filtered p
    order by p.date desc, p.id desc
    limit v_page_size
    offset v_offset
  )
  select jsonb_build_object(
    'data', coalesce((select jsonb_agg(row_data) from page_rows), '[]'::jsonb),
    'total', (select total from counted),
    'page', v_page,
    'page_size', v_page_size
  )
  into v_result;

  return v_result;
end;
$$;

grant execute on function public._escape_ilike_pattern(text) to authenticated;
grant execute on function public.list_sales_paginated(uuid, integer, integer, text, timestamptz, timestamptz, text, text, uuid) to authenticated;
grant execute on function public.list_purchases_paginated(uuid, integer, integer, text, timestamptz, timestamptz, text, text, text) to authenticated;
