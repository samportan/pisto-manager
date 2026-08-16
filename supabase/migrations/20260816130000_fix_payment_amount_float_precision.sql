-- Normalize payment amounts to money scale (3) before balance checks.
-- JSON float64 values like 12.55 become ~12.550000000000001, which can fail
-- `p_amount > balance` against exact numeric balances when collecting in full.

create or replace function public.record_customer_payment(
  p_organization_id uuid,
  p_customer_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_date timestamptz default now(),
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_sale public.sales;
  v_remaining numeric;
  v_apply numeric;
  v_balance numeric;
  v_new_paid numeric;
  v_total_balance numeric := 0;
  v_allocations jsonb := '[]'::jsonb;
  v_pay_date timestamptz := coalesce(p_date, now());
  v_amount numeric;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;
  if not public.user_has_org_access(p_organization_id) then
    raise exception 'No access to organization';
  end if;
  if p_customer_id is null then
    raise exception 'Customer is required';
  end if;

  v_amount := round(p_amount, 3);

  if v_amount is null or v_amount <= 0 then
    raise exception 'Payment amount must be positive';
  end if;
  if p_payment_method is null or p_payment_method not in ('cash', 'card', 'transfer') then
    raise exception 'Invalid payment method';
  end if;

  select coalesce(sum(s.total - s.amount_paid), 0)
  into v_total_balance
  from public.sales s
  where s.organization_id = p_organization_id
    and s.customer_id = p_customer_id
    and s.deleted_at is null
    and s.payment_status <> 'paid';

  if v_total_balance <= 0 then
    raise exception 'No open balance for customer';
  end if;
  if v_amount > v_total_balance then
    raise exception 'Payment exceeds balance due';
  end if;

  v_remaining := v_amount;

  for v_sale in
    select *
    from public.sales
    where organization_id = p_organization_id
      and customer_id = p_customer_id
      and deleted_at is null
      and payment_status <> 'paid'
    order by date asc, id asc
    for update
  loop
    exit when v_remaining <= 0;

    v_balance := v_sale.total - v_sale.amount_paid;
    if v_balance <= 0 then
      continue;
    end if;

    v_apply := least(v_remaining, v_balance);

    insert into public.sale_payments (
      organization_id, sale_id, user_id, amount, payment_method, date, notes
    )
    values (
      p_organization_id, v_sale.id, v_user_id, v_apply,
      p_payment_method, v_pay_date, p_notes
    );

    v_new_paid := v_sale.amount_paid + v_apply;

    update public.sales
    set
      amount_paid = v_new_paid,
      payment_status = case
        when v_new_paid >= total then 'paid'
        when v_new_paid > 0 then 'partial'
        else 'credit'
      end
    where id = v_sale.id;

    v_allocations := v_allocations || jsonb_build_array(
      jsonb_build_object('sale_id', v_sale.id, 'amount', v_apply)
    );
    v_remaining := v_remaining - v_apply;
  end loop;

  if v_remaining > 0 then
    raise exception 'Payment exceeds balance due';
  end if;

  return jsonb_build_object(
    'customer_id', p_customer_id,
    'amount', v_amount,
    'allocations', v_allocations
  );
end;
$$;

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
  v_amount numeric;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_amount := round(p_amount, 3);

  if v_amount is null or v_amount <= 0 then
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
  if v_amount > v_balance then
    raise exception 'Payment exceeds balance due';
  end if;

  insert into public.sale_payments (
    organization_id, sale_id, user_id, amount, payment_method, date, notes
  )
  values (
    v_sale.organization_id, p_sale_id, v_user_id, v_amount,
    p_payment_method, coalesce(p_date, now()), p_notes
  );

  v_new_paid := v_sale.amount_paid + v_amount;

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
  v_amount numeric;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_amount := round(p_amount, 3);

  if v_amount is null or v_amount <= 0 then
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
  if v_amount > v_balance then
    raise exception 'Payment exceeds balance due';
  end if;

  insert into public.purchase_payments (
    organization_id, purchase_id, user_id, amount, payment_method, date, notes
  )
  values (
    v_purchase.organization_id, p_purchase_id, v_user_id, v_amount,
    p_payment_method, coalesce(p_date, now()), p_notes
  );

  v_new_paid := v_purchase.amount_paid + v_amount;

  update public.purchases
  set
    amount_paid = v_new_paid,
    payment_status = public.purchase_payment_status_from_amounts(v_new_paid, total)
  where id = p_purchase_id
  returning * into v_purchase;

  return v_purchase;
end;
$$;
