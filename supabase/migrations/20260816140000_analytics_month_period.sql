-- Allow last_month and calendar YYYY-MM in analytics period bounds.
-- Overview P&L follows the selected period and returns previous-month totals.

create or replace function public.analytics_period_bounds(
  p_period text,
  p_timezone text default 'America/El_Salvador',
  out o_start timestamptz,
  out o_end timestamptz
)
language plpgsql
stable
set search_path = public
as $$
declare
  v_today date;
  v_month_start date;
  v_year int;
  v_month int;
begin
  if p_period is null then
    raise exception 'Invalid period';
  end if;

  if p_period = 'all_time' then
    o_start := null;
    o_end := null;
    return;
  end if;

  if p_period ~ '^\d{4}-(0[1-9]|1[0-2])$' then
    v_year := split_part(p_period, '-', 1)::int;
    v_month := split_part(p_period, '-', 2)::int;
    v_month_start := make_date(v_year, v_month, 1);
    o_start := (v_month_start::timestamp at time zone p_timezone);
    o_end := ((v_month_start + interval '1 month')::timestamp at time zone p_timezone);
    return;
  end if;

  if p_period not in ('today', 'this_month', 'last_month', 'last_30_days') then
    raise exception 'Invalid period';
  end if;

  v_today := (timezone(p_timezone, now()))::date;

  if p_period = 'today' then
    o_start := (v_today::timestamp at time zone p_timezone);
    o_end := ((v_today + 1)::timestamp at time zone p_timezone);
  elsif p_period = 'this_month' then
    v_month_start := date_trunc('month', v_today::timestamp)::date;
    o_start := (v_month_start::timestamp at time zone p_timezone);
    o_end := ((v_month_start + interval '1 month')::timestamp at time zone p_timezone);
  elsif p_period = 'last_month' then
    v_month_start := date_trunc('month', v_today::timestamp)::date;
    o_start := (((v_month_start - interval '1 month')::date)::timestamp at time zone p_timezone);
    o_end := (v_month_start::timestamp at time zone p_timezone);
  else
    o_start := ((v_today - 30)::timestamp at time zone p_timezone);
    o_end := ((v_today + 1)::timestamp at time zone p_timezone);
  end if;
end;
$$;

drop function if exists public.get_business_overview(uuid, text);

create or replace function public.get_business_overview(
  p_organization_id uuid,
  p_timezone text default 'America/El_Salvador',
  p_period text default 'this_month'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bounds record;
  v_month_totals jsonb;
  v_prev_totals jsonb;
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
  v_ps timestamptz;
  v_pe timestamptz;
  v_prev_month_start date;
  v_month_start_date date;
  v_cash_in numeric;
  v_bank_in numeric;
  v_purchase_out numeric;
  v_expense_out numeric;
  v_recurring_count int;
  v_prev_rev numeric;
  v_prev_pur numeric;
  v_prev_opex numeric;
  v_prev_fin numeric;
  v_prev_personal numeric;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not public.user_has_org_access(p_organization_id) then
    raise exception 'No access to organization';
  end if;

  select * into v_bounds
  from public.analytics_period_bounds(p_period, p_timezone);

  select coalesce(sum(s.total), 0)
  into v_rev
  from public.sales s
  where s.organization_id = p_organization_id
    and s.deleted_at is null
    and s.payment_status = 'paid'
    and (v_bounds.o_start is null or s.date >= v_bounds.o_start)
    and (v_bounds.o_end is null or s.date < v_bounds.o_end);

  select coalesce(sum(p.total), 0)
  into v_pur
  from public.purchases p
  where p.organization_id = p_organization_id
    and p.deleted_at is null
    and p.payment_status = 'paid'
    and coalesce(p.receipt_status, 'received') = 'received'
    and (v_bounds.o_start is null or p.date >= v_bounds.o_start)
    and (v_bounds.o_end is null or p.date < v_bounds.o_end);

  select coalesce(sum(e.amount), 0)
  into v_opex
  from public.expenses e
  where e.organization_id = p_organization_id
    and e.deleted_at is null
    and e.category = 'operating'
    and (v_bounds.o_start is null or e.date >= v_bounds.o_start)
    and (v_bounds.o_end is null or e.date < v_bounds.o_end);

  select coalesce(sum(e.amount), 0)
  into v_fin
  from public.expenses e
  where e.organization_id = p_organization_id
    and e.deleted_at is null
    and e.category = 'financial'
    and (v_bounds.o_start is null or e.date >= v_bounds.o_start)
    and (v_bounds.o_end is null or e.date < v_bounds.o_end);

  select coalesce(sum(e.amount), 0)
  into v_personal
  from public.expenses e
  where e.organization_id = p_organization_id
    and e.deleted_at is null
    and e.category = 'personal'
    and (v_bounds.o_start is null or e.date >= v_bounds.o_start)
    and (v_bounds.o_end is null or e.date < v_bounds.o_end);

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

  v_prev_totals := null;
  if p_period in ('this_month', 'last_month')
     or p_period ~ '^\d{4}-(0[1-9]|1[0-2])$' then
    v_month_start_date := (timezone(p_timezone, v_bounds.o_start))::date;
    v_prev_month_start := (v_month_start_date - interval '1 month')::date;
    v_ps := (v_prev_month_start::timestamp at time zone p_timezone);
    v_pe := (v_month_start_date::timestamp at time zone p_timezone);

    select coalesce(sum(s.total), 0)
    into v_prev_rev
    from public.sales s
    where s.organization_id = p_organization_id
      and s.deleted_at is null
      and s.payment_status = 'paid'
      and s.date >= v_ps
      and s.date < v_pe;

    select coalesce(sum(p.total), 0)
    into v_prev_pur
    from public.purchases p
    where p.organization_id = p_organization_id
      and p.deleted_at is null
      and p.payment_status = 'paid'
      and coalesce(p.receipt_status, 'received') = 'received'
      and p.date >= v_ps
      and p.date < v_pe;

    select coalesce(sum(e.amount), 0)
    into v_prev_opex
    from public.expenses e
    where e.organization_id = p_organization_id
      and e.deleted_at is null
      and e.category = 'operating'
      and e.date >= v_ps
      and e.date < v_pe;

    select coalesce(sum(e.amount), 0)
    into v_prev_fin
    from public.expenses e
    where e.organization_id = p_organization_id
      and e.deleted_at is null
      and e.category = 'financial'
      and e.date >= v_ps
      and e.date < v_pe;

    select coalesce(sum(e.amount), 0)
    into v_prev_personal
    from public.expenses e
    where e.organization_id = p_organization_id
      and e.deleted_at is null
      and e.category = 'personal'
      and e.date >= v_ps
      and e.date < v_pe;

    v_prev_totals := jsonb_build_object(
      'revenue', v_prev_rev,
      'purchases', v_prev_pur,
      'margin', v_prev_rev - v_prev_pur,
      'operating_profit', (v_prev_rev - v_prev_pur) - v_prev_opex,
      'net_profit', ((v_prev_rev - v_prev_pur) - v_prev_opex) - v_prev_fin - v_prev_personal
    );
  end if;

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
      and (v_bounds.o_start is null or s.date >= v_bounds.o_start)
      and (v_bounds.o_end is null or s.date < v_bounds.o_end)
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
    'prev_totals', v_prev_totals,
    'pnl', v_pnl,
    'cash_position', v_cash,
    'series', v_series,
    'top_products', coalesce(v_top_products, '[]'::jsonb),
    'low_stock_count', v_low_stock_count,
    'low_stock_preview', coalesce(v_low_stock_preview, '[]'::jsonb)
  );
end;
$$;

grant execute on function public.get_business_overview(uuid, text, text) to authenticated;
