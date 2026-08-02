-- Indexes for analytics joins + payment period filters
create index if not exists sale_items_sale_id_active_idx
  on public.sale_items (sale_id)
  where deleted_at is null;

create index if not exists sale_items_product_id_active_idx
  on public.sale_items (product_id)
  where deleted_at is null;

create index if not exists purchase_items_purchase_id_active_idx
  on public.purchase_items (purchase_id)
  where deleted_at is null;

create index if not exists sale_payments_org_date_active_idx
  on public.sale_payments (organization_id, date)
  where deleted_at is null;

create index if not exists transactions_user_date_idx
  on public.transactions (user_id, date desc);

-- Period bounds in a business timezone (inclusive start, exclusive end).
-- all_time → both null.
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
begin
  if p_period is null or p_period not in ('today', 'this_month', 'last_30_days', 'all_time') then
    raise exception 'Invalid period';
  end if;

  if p_period = 'all_time' then
    o_start := null;
    o_end := null;
    return;
  end if;

  v_today := (timezone(p_timezone, now()))::date;

  if p_period = 'today' then
    o_start := (v_today::timestamp at time zone p_timezone);
    o_end := ((v_today + 1)::timestamp at time zone p_timezone);
  elsif p_period = 'this_month' then
    v_month_start := date_trunc('month', v_today::timestamp)::date;
    o_start := (v_month_start::timestamp at time zone p_timezone);
    o_end := ((v_month_start + interval '1 month')::timestamp at time zone p_timezone);
  else
    o_start := ((v_today - 30)::timestamp at time zone p_timezone);
    o_end := ((v_today + 1)::timestamp at time zone p_timezone);
  end if;
end;
$$;

create or replace function public.get_customer_balances_agg(p_organization_id uuid)
returns jsonb
language plpgsql
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
          'customer_id', x.customer_id,
          'balance_due', x.balance_due,
          'open_sale_count', x.open_sale_count
        )
        order by x.balance_due desc
      )
      from (
        select
          s.customer_id,
          coalesce(sum(s.balance_due), 0)::numeric as balance_due,
          count(*)::int as open_sale_count
        from public.sales s
        where s.organization_id = p_organization_id
          and s.deleted_at is null
          and s.payment_status <> 'paid'
          and s.customer_id is not null
        group by s.customer_id
      ) x
    ),
    '[]'::jsonb
  );
end;
$$;

grant execute on function public.get_customer_balances_agg(uuid) to authenticated;

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
  v_ms timestamptz;
  v_me timestamptz;
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

  v_month_totals := jsonb_build_object(
    'revenue', v_rev,
    'purchases', v_pur,
    'margin', v_rev - v_pur
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
    'series', v_series,
    'top_products', coalesce(v_top_products, '[]'::jsonb),
    'low_stock_count', v_low_stock_count,
    'low_stock_preview', coalesce(v_low_stock_preview, '[]'::jsonb)
  );
end;
$$;

grant execute on function public.get_business_overview(uuid, text) to authenticated;

create or replace function public.get_sale_insights(
  p_organization_id uuid,
  p_period text default 'this_month',
  p_timezone text default 'America/El_Salvador',
  p_top_n int default 5,
  p_walk_in_label text default 'Walk-in'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bounds record;
  v_sale_count int;
  v_revenue numeric;
  v_margin numeric;
  v_ar numeric;
  v_open_count int;
  v_collected numeric;
  v_payment_methods jsonb;
  v_top_customers jsonb;
  v_customer_ranking jsonb;
  v_top_days jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not public.user_has_org_access(p_organization_id) then
    raise exception 'No access to organization';
  end if;

  select * into v_bounds
  from public.analytics_period_bounds(p_period, p_timezone);

  select
    count(*)::int,
    coalesce(sum(s.total), 0)
  into v_sale_count, v_revenue
  from public.sales s
  where s.organization_id = p_organization_id
    and s.deleted_at is null
    and s.payment_status = 'paid'
    and (v_bounds.o_start is null or s.date >= v_bounds.o_start)
    and (v_bounds.o_end is null or s.date < v_bounds.o_end);

  select coalesce(sum(si.line_total - si.quantity * coalesce(pr.cost_price, 0)), 0)
  into v_margin
  from public.sale_items si
  join public.sales s on s.id = si.sale_id
  left join public.products pr on pr.id = si.product_id
  where s.organization_id = p_organization_id
    and s.deleted_at is null
    and s.payment_status = 'paid'
    and si.deleted_at is null
    and (v_bounds.o_start is null or s.date >= v_bounds.o_start)
    and (v_bounds.o_end is null or s.date < v_bounds.o_end);

  select
    coalesce(sum(s.balance_due), 0),
    count(*)::int
  into v_ar, v_open_count
  from public.sales s
  where s.organization_id = p_organization_id
    and s.deleted_at is null
    and s.payment_status <> 'paid';

  select coalesce(sum(sp.amount), 0)
  into v_collected
  from public.sale_payments sp
  where sp.organization_id = p_organization_id
    and sp.deleted_at is null
    and (v_bounds.o_start is null or sp.date >= v_bounds.o_start)
    and (v_bounds.o_end is null or sp.date < v_bounds.o_end);

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'method', m.method,
        'revenue', m.revenue,
        'count', m.cnt,
        'percentage', case when v_revenue > 0 then (m.revenue / v_revenue) * 100 else 0 end
      )
      order by array_position(array['cash','card','transfer'], m.method)
    ),
    '[]'::jsonb
  )
  into v_payment_methods
  from (
    select
      methods.method,
      coalesce(sum(s.total), 0)::numeric as revenue,
      count(s.id)::int as cnt
    from (
      select unnest(array['cash','card','transfer']) as method
    ) methods
    left join public.sales s
      on s.organization_id = p_organization_id
     and s.deleted_at is null
     and s.payment_status = 'paid'
     and s.payment_method = methods.method
     and (v_bounds.o_start is null or s.date >= v_bounds.o_start)
     and (v_bounds.o_end is null or s.date < v_bounds.o_end)
    group by methods.method
  ) m;

  with ranked as (
    select
      s.customer_id,
      case
        when s.customer_id is null then p_walk_in_label
        else coalesce(max(c.name), '?')
      end as customer_name,
      count(*)::int as sale_count,
      coalesce(sum(s.total), 0)::numeric as revenue
    from public.sales s
    left join public.contacts c on c.id = s.customer_id and c.deleted_at is null
    where s.organization_id = p_organization_id
      and s.deleted_at is null
      and s.payment_status = 'paid'
      and (v_bounds.o_start is null or s.date >= v_bounds.o_start)
      and (v_bounds.o_end is null or s.date < v_bounds.o_end)
    group by s.customer_id
  )
  select
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'customer_id', r.customer_id,
            'customer_name', r.customer_name,
            'sale_count', r.sale_count,
            'revenue', r.revenue
          )
          order by r.revenue desc
        )
        from ranked r
      ),
      '[]'::jsonb
    ),
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'customer_id', t.customer_id,
            'customer_name', t.customer_name,
            'sale_count', t.sale_count,
            'revenue', t.revenue
          )
          order by t.revenue desc
        )
        from (
          select * from ranked order by revenue desc limit greatest(p_top_n, 1)
        ) t
      ),
      '[]'::jsonb
    )
  into v_customer_ranking, v_top_customers;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'date', d.day,
        'revenue', d.revenue,
        'count', d.cnt
      )
      order by d.revenue desc
    ),
    '[]'::jsonb
  )
  into v_top_days
  from (
    select
      (timezone(p_timezone, s.date))::date::text as day,
      coalesce(sum(s.total), 0)::numeric as revenue,
      count(*)::int as cnt
    from public.sales s
    where s.organization_id = p_organization_id
      and s.deleted_at is null
      and s.payment_status = 'paid'
      and (v_bounds.o_start is null or s.date >= v_bounds.o_start)
      and (v_bounds.o_end is null or s.date < v_bounds.o_end)
    group by 1
    order by revenue desc
    limit greatest(p_top_n, 1)
  ) d;

  return jsonb_build_object(
    'kpis', jsonb_build_object(
      'sale_count', v_sale_count,
      'revenue', v_revenue,
      'avg_ticket', case when v_sale_count > 0 then v_revenue / v_sale_count else 0 end,
      'estimated_margin', v_margin,
      'accounts_receivable', v_ar,
      'open_credit_count', v_open_count,
      'collected_in_period', v_collected
    ),
    'payment_methods', coalesce(v_payment_methods, '[]'::jsonb),
    'top_customers', coalesce(v_top_customers, '[]'::jsonb),
    'customer_ranking', coalesce(v_customer_ranking, '[]'::jsonb),
    'top_days', coalesce(v_top_days, '[]'::jsonb)
  );
end;
$$;

grant execute on function public.get_sale_insights(uuid, text, text, int, text) to authenticated;

create or replace function public.get_product_insights(
  p_organization_id uuid,
  p_period text default 'this_month',
  p_timezone text default 'America/El_Salvador'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bounds record;
  v_inv_cost numeric;
  v_inv_retail numeric;
  v_active int;
  v_low int;
  v_out int;
  v_revenue numeric;
  v_units numeric;
  v_margin numeric;
  v_dead int;
  v_ranking jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not public.user_has_org_access(p_organization_id) then
    raise exception 'No access to organization';
  end if;

  select * into v_bounds
  from public.analytics_period_bounds(p_period, p_timezone);

  select
    coalesce(sum(p.stock * p.cost_price), 0),
    coalesce(sum(p.stock * p.sale_price), 0),
    count(*) filter (where p.is_active)::int,
    count(*) filter (
      where coalesce(p.min_stock, 0) > 0 and p.stock <= p.min_stock
    )::int,
    count(*) filter (where p.stock <= 0)::int
  into v_inv_cost, v_inv_retail, v_active, v_low, v_out
  from public.products p
  where p.organization_id = p_organization_id
    and p.deleted_at is null;

  select
    coalesce(sum(si.line_total), 0),
    coalesce(sum(si.quantity), 0),
    coalesce(sum(si.line_total - si.quantity * coalesce(pr.cost_price, 0)), 0)
  into v_revenue, v_units, v_margin
  from public.sale_items si
  join public.sales s on s.id = si.sale_id
  left join public.products pr on pr.id = si.product_id
  where s.organization_id = p_organization_id
    and s.deleted_at is null
    and s.payment_status = 'paid'
    and si.deleted_at is null
    and (v_bounds.o_start is null or s.date >= v_bounds.o_start)
    and (v_bounds.o_end is null or s.date < v_bounds.o_end);

  select count(*)::int
  into v_dead
  from public.products p
  where p.organization_id = p_organization_id
    and p.deleted_at is null
    and p.stock > 0
    and not exists (
      select 1
      from public.sale_items si
      join public.sales s on s.id = si.sale_id
      where si.product_id = p.id
        and si.deleted_at is null
        and s.organization_id = p_organization_id
        and s.deleted_at is null
        and s.payment_status = 'paid'
        and (v_bounds.o_start is null or s.date >= v_bounds.o_start)
        and (v_bounds.o_end is null or s.date < v_bounds.o_end)
    );

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'product_id', r.product_id,
        'product_name', r.product_name,
        'units_sold', r.units_sold,
        'revenue', r.revenue,
        'estimated_margin', r.estimated_margin,
        'stock', r.stock,
        'low_stock', r.low_stock,
        'out_of_stock', r.out_of_stock
      )
      order by r.revenue desc
    ),
    '[]'::jsonb
  )
  into v_ranking
  from (
    select
      si.product_id,
      coalesce(max(pr.name), si.product_id::text) as product_name,
      coalesce(sum(si.quantity), 0)::numeric as units_sold,
      coalesce(sum(si.line_total), 0)::numeric as revenue,
      coalesce(sum(si.line_total - si.quantity * coalesce(pr.cost_price, 0)), 0)::numeric as estimated_margin,
      coalesce(max(pr.stock), 0)::numeric as stock,
      (
        coalesce(max(pr.min_stock), 0) > 0
        and coalesce(max(pr.stock), 0) <= coalesce(max(pr.min_stock), 0)
      ) as low_stock,
      coalesce(max(pr.stock), 0) <= 0 as out_of_stock
    from public.sale_items si
    join public.sales s on s.id = si.sale_id
    left join public.products pr on pr.id = si.product_id
    where s.organization_id = p_organization_id
      and s.deleted_at is null
      and s.payment_status = 'paid'
      and si.deleted_at is null
      and (v_bounds.o_start is null or s.date >= v_bounds.o_start)
      and (v_bounds.o_end is null or s.date < v_bounds.o_end)
    group by si.product_id
  ) r;

  return jsonb_build_object(
    'inventory', jsonb_build_object(
      'inventory_value_cost', v_inv_cost,
      'inventory_value_retail', v_inv_retail,
      'potential_margin', v_inv_retail - v_inv_cost,
      'active_products', v_active,
      'low_stock_count', v_low,
      'out_of_stock_count', v_out
    ),
    'period_sales', jsonb_build_object(
      'revenue', v_revenue,
      'units_sold', v_units,
      'estimated_margin', v_margin
    ),
    'dead_stock_count', v_dead,
    'ranking', coalesce(v_ranking, '[]'::jsonb)
  );
end;
$$;

grant execute on function public.get_product_insights(uuid, text, text) to authenticated;

-- Lightweight personal expense aggregate for financial-summary fallback
create or replace function public.get_user_month_expense_total(
  p_timezone text default 'America/El_Salvador'
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_bounds record;
  v_total numeric;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_bounds
  from public.analytics_period_bounds('this_month', p_timezone);

  select coalesce(sum(t.amount), 0)
  into v_total
  from public.transactions t
  where t.user_id = v_user_id
    and t.type = 'expense'
    and t.date >= v_bounds.o_start
    and t.date < v_bounds.o_end;

  return v_total;
end;
$$;

grant execute on function public.get_user_month_expense_total(text) to authenticated;
