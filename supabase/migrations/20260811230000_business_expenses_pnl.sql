-- Business expenses ledger + P&L / cash position on overview RPC

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  date timestamptz not null default now(),
  category text not null check (category in ('operating', 'financial', 'personal')),
  subcategory text not null,
  payment_method text not null check (payment_method in ('petty_cash', 'bank', 'sales_cash')),
  is_recurring boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists expenses_org_active_date_idx
  on public.expenses (organization_id, date desc)
  where deleted_at is null;

create index if not exists expenses_org_category_date_idx
  on public.expenses (organization_id, category, date desc)
  where deleted_at is null;

alter table public.expenses enable row level security;

drop policy if exists expenses_org on public.expenses;
create policy expenses_org on public.expenses
  for all using (
    user_id = auth.uid()
    and public.user_has_org_access(organization_id)
  ) with check (
    user_id = auth.uid()
    and organization_id is not null
    and public.user_has_org_access(organization_id)
  );

create or replace function public.get_business_overview(
  p_organization_id uuid,
  p_timezone text default 'America/El_Salvador'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bounds record;
  v_month_totals jsonb;
  v_pnl jsonb;
  v_cash jsonb;
  v_series jsonb := '[]'::jsonb;
  v_top_products jsonb;
  v_low_stock_count int;
  v_low_stock_preview jsonb;
  v_i int;
  v_local_now timestamp;
  v_year int;
  v_month int;
  v_key text;
  v_rev numeric;
  v_pur numeric;
  v_opex numeric;
  v_fin numeric;
  v_personal numeric;
  v_gross numeric;
  v_operating numeric;
  v_net numeric;
  v_ms timestamptz;
  v_me timestamptz;
  v_cash_in numeric;
  v_bank_in numeric;
  v_purchase_out numeric;
  v_expense_out numeric;
  v_recurring_count int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not public.user_has_org_access(p_organization_id) then
    raise exception 'No access to organization';
  end if;

  select * into v_bounds
  from public.analytics_period_bounds('this_month', p_timezone);

  select coalesce(sum(s.total), 0)
  into v_rev
  from public.sales s
  where s.organization_id = p_organization_id
    and s.deleted_at is null
    and s.payment_status = 'paid'
    and s.date >= v_bounds.o_start
    and s.date < v_bounds.o_end;

  select coalesce(sum(p.total), 0)
  into v_pur
  from public.purchases p
  where p.organization_id = p_organization_id
    and p.deleted_at is null
    and p.payment_status = 'paid'
    and coalesce(p.receipt_status, 'received') = 'received'
    and p.date >= v_bounds.o_start
    and p.date < v_bounds.o_end;

  select coalesce(sum(e.amount), 0)
  into v_opex
  from public.expenses e
  where e.organization_id = p_organization_id
    and e.deleted_at is null
    and e.category = 'operating'
    and e.date >= v_bounds.o_start
    and e.date < v_bounds.o_end;

  select coalesce(sum(e.amount), 0)
  into v_fin
  from public.expenses e
  where e.organization_id = p_organization_id
    and e.deleted_at is null
    and e.category = 'financial'
    and e.date >= v_bounds.o_start
    and e.date < v_bounds.o_end;

  select coalesce(sum(e.amount), 0)
  into v_personal
  from public.expenses e
  where e.organization_id = p_organization_id
    and e.deleted_at is null
    and e.category = 'personal'
    and e.date >= v_bounds.o_start
    and e.date < v_bounds.o_end;

  v_gross := v_rev - v_pur;
  v_operating := v_gross - v_opex;
  v_net := v_operating - v_fin - v_personal;

  v_month_totals := jsonb_build_object(
    'revenue', v_rev,
    'purchases', v_pur,
    'margin', v_gross
  );

  v_pnl := jsonb_build_object(
    'revenue', v_rev,
    'cogs', v_pur,
    'gross_profit', v_gross,
    'operating_expenses', v_opex,
    'operating_profit', v_operating,
    'financial_expenses', v_fin,
    'personal_expenses', v_personal,
    'net_profit', v_net
  );

  select coalesce(sum(sp.amount), 0)
  into v_cash_in
  from public.sale_payments sp
  where sp.organization_id = p_organization_id
    and sp.deleted_at is null
    and sp.payment_method = 'cash';

  select coalesce(sum(sp.amount), 0)
  into v_bank_in
  from public.sale_payments sp
  where sp.organization_id = p_organization_id
    and sp.deleted_at is null
    and sp.payment_method in ('transfer', 'card');

  select coalesce(sum(pp.amount), 0)
  into v_purchase_out
  from public.purchase_payments pp
  where pp.organization_id = p_organization_id
    and pp.deleted_at is null
    and pp.payment_method in ('cash', 'transfer');

  select coalesce(sum(e.amount), 0)
  into v_expense_out
  from public.expenses e
  where e.organization_id = p_organization_id
    and e.deleted_at is null;

  select count(*)::int
  into v_recurring_count
  from public.expenses e
  where e.organization_id = p_organization_id
    and e.deleted_at is null
    and e.is_recurring = true;

  v_cash := jsonb_build_object(
    'cash_income', v_cash_in,
    'bank_income', v_bank_in,
    'inventory_purchases', v_purchase_out,
    'total_expenses', v_expense_out,
    'available_balance', (v_cash_in + v_bank_in) - (v_purchase_out + v_expense_out),
    'recurring_expense_count', v_recurring_count
  );

  v_local_now := date_trunc('month', timezone(p_timezone, now()));
  for v_i in reverse 5..0 loop
    v_year := extract(year from (v_local_now - (v_i || ' months')::interval))::int;
    v_month := extract(month from (v_local_now - (v_i || ' months')::interval))::int;
    v_ms := (make_date(v_year, v_month, 1)::timestamp at time zone p_timezone);
    v_me := ((make_date(v_year, v_month, 1) + interval '1 month')::timestamp at time zone p_timezone);
    v_key := to_char(make_date(v_year, v_month, 1), 'YYYY-MM');

    select coalesce(sum(s.total), 0)
    into v_rev
    from public.sales s
    where s.organization_id = p_organization_id
      and s.deleted_at is null
      and s.payment_status = 'paid'
      and s.date >= v_ms
      and s.date < v_me;

    select coalesce(sum(p.total), 0)
    into v_pur
    from public.purchases p
    where p.organization_id = p_organization_id
      and p.deleted_at is null
      and p.payment_status = 'paid'
      and coalesce(p.receipt_status, 'received') = 'received'
      and p.date >= v_ms
      and p.date < v_me;

    v_series := v_series || jsonb_build_array(
      jsonb_build_object(
        'key', v_key,
        'revenue', v_rev,
        'purchases', v_pur,
        'margin', v_rev - v_pur
      )
    );
  end loop;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'product_id', r.product_id,
        'product_name', r.product_name,
        'revenue', r.revenue,
        'units_sold', r.units_sold
      )
      order by r.revenue desc
    ),
    '[]'::jsonb
  )
  into v_top_products
  from (
    select
      si.product_id,
      coalesce(max(pr.name), si.product_id::text) as product_name,
      coalesce(sum(si.line_total), 0)::numeric as revenue,
      coalesce(sum(si.quantity), 0)::numeric as units_sold
    from public.sale_items si
    join public.sales s on s.id = si.sale_id
    left join public.products pr on pr.id = si.product_id
    where s.organization_id = p_organization_id
      and s.deleted_at is null
      and s.payment_status = 'paid'
      and s.date >= v_bounds.o_start
      and s.date < v_bounds.o_end
      and si.deleted_at is null
    group by si.product_id
    order by revenue desc
    limit 5
  ) r;

  select count(*)::int
  into v_low_stock_count
  from public.products p
  where p.organization_id = p_organization_id
    and p.deleted_at is null
    and coalesce(p.min_stock, 0) > 0
    and p.stock <= p.min_stock;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', x.id,
        'name', x.name,
        'stock', x.stock,
        'min_stock', x.min_stock,
        'unit_of_measure', x.unit_of_measure
      )
    ),
    '[]'::jsonb
  )
  into v_low_stock_preview
  from (
    select p.id, p.name, p.stock, p.min_stock, coalesce(p.unit_of_measure, 'unit') as unit_of_measure
    from public.products p
    where p.organization_id = p_organization_id
      and p.deleted_at is null
      and coalesce(p.min_stock, 0) > 0
      and p.stock <= p.min_stock
    order by (p.stock - p.min_stock) asc, p.name asc
    limit 8
  ) x;

  return jsonb_build_object(
    'month_totals', v_month_totals,
    'pnl', v_pnl,
    'cash_position', v_cash,
    'series', v_series,
    'top_products', coalesce(v_top_products, '[]'::jsonb),
    'low_stock_count', v_low_stock_count,
    'low_stock_preview', coalesce(v_low_stock_preview, '[]'::jsonb)
  );
end;
$$;

grant execute on function public.get_business_overview(uuid, text) to authenticated;
