-- Second round of bugs found by this migration's own adversarial re-test:
-- PL/pgSQL's RETURN QUERY requires an EXACT type match between the SELECT
-- list and the function's RETURNS TABLE declaration -- unlike a plain
-- top-level SELECT, it does not apply assignment casts (int -> numeric,
-- bigint -> numeric, ...). quantity_claimed/quantity_recovered/quantity
-- are all `integer` columns; sum(integer) returns `bigint`. Every
-- projected column below is now explicitly cast to match its declared
-- output type instead of relying on an implicit cast that PL/pgSQL does
-- not actually perform here.

drop function if exists public.portal_list_recovery_cases(integer, integer);

create function public.portal_list_recovery_cases(p_page integer default 1, p_page_size integer default 20)
returns table (
  id uuid,
  reference text,
  pallet_type_code text,
  quantity_claimed integer,
  quantity_recovered integer,
  outstanding_quantity integer,
  outstanding_value numeric,
  due_date date,
  priority text,
  status text,
  opened_at date,
  total_count bigint
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_org uuid;
  v_cp uuid;
  v_offset integer;
  v_limit integer;
begin
  select organization_id, counterparty_id into v_org, v_cp from public.portal_current_context();
  if v_org is null then
    raise exception 'no active client portal membership';
  end if;
  v_limit := greatest(coalesce(p_page_size, 20), 1);
  v_offset := greatest(coalesce(p_page, 1), 1) - 1;
  v_offset := v_offset * v_limit;

  return query
  select rc.id, rc.reference, pt.code,
    rc.quantity_claimed, rc.quantity_recovered,
    greatest(rc.quantity_claimed - rc.quantity_recovered, 0),
    (greatest(rc.quantity_claimed - rc.quantity_recovered, 0) * rc.unit_value_snapshot)::numeric,
    rc.due_date, rc.priority, rc.status, rc.opened_at,
    count(*) over ()
  from public.recovery_cases rc
  join public.pallet_types pt on pt.id = rc.pallet_type_id
  where rc.organization_id = v_org and rc.counterparty_id = v_cp
  order by rc.opened_at desc
  limit v_limit offset v_offset;
end;
$$;

revoke all on function public.portal_list_recovery_cases(integer, integer) from public;
grant execute on function public.portal_list_recovery_cases(integer, integer) to authenticated;
revoke execute on function public.portal_list_recovery_cases(integer, integer) from anon;

drop function if exists public.portal_list_vouchers(integer, integer);

create function public.portal_list_vouchers(p_page integer default 1, p_page_size integer default 20)
returns table (
  id uuid,
  voucher_number text,
  quantity integer,
  recovered_quantity integer,
  outstanding_quantity integer,
  issue_date date,
  recovery_due_date date,
  status text,
  pallet_type_code text,
  site_name text,
  total_count bigint
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_org uuid;
  v_cp uuid;
  v_offset integer;
  v_limit integer;
begin
  select organization_id, counterparty_id into v_org, v_cp from public.portal_current_context();
  if v_org is null then
    raise exception 'no active client portal membership';
  end if;
  v_limit := greatest(coalesce(p_page_size, 20), 1);
  v_offset := greatest(coalesce(p_page, 1), 1) - 1;
  v_offset := v_offset * v_limit;

  return query
  select v.id, v.voucher_number, v.quantity, v.recovered_quantity,
    greatest(v.quantity - v.recovered_quantity, 0),
    v.issue_date, v.recovery_due_date, v.status,
    pt.code, s.name,
    count(*) over ()
  from public.vouchers v
  join public.pallet_types pt on pt.id = v.pallet_type_id
  left join public.sites s on s.id = v.site_id
  where v.organization_id = v_org and v.counterparty_id = v_cp
  order by v.issue_date desc
  limit v_limit offset v_offset;
end;
$$;

revoke all on function public.portal_list_vouchers(integer, integer) from public;
grant execute on function public.portal_list_vouchers(integer, integer) to authenticated;
revoke execute on function public.portal_list_vouchers(integer, integer) from anon;

drop function if exists public.portal_list_movements(integer, integer);

create function public.portal_list_movements(p_page integer default 1, p_page_size integer default 20)
returns table (
  id uuid,
  movement_date date,
  direction text,
  quantity integer,
  document_type text,
  document_number text,
  pallet_type_code text,
  site_name text,
  total_count bigint
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_org uuid;
  v_cp uuid;
  v_offset integer;
  v_limit integer;
begin
  select organization_id, counterparty_id into v_org, v_cp from public.portal_current_context();
  if v_org is null then
    raise exception 'no active client portal membership';
  end if;
  v_limit := greatest(coalesce(p_page_size, 20), 1);
  v_offset := greatest(coalesce(p_page, 1), 1) - 1;
  v_offset := v_offset * v_limit;

  return query
  select m.id, m.movement_date, m.direction, m.quantity,
    m.document_type, m.document_number,
    pt.code, s.name,
    count(*) over ()
  from public.pallet_movements m
  join public.pallet_types pt on pt.id = m.pallet_type_id
  left join public.sites s on s.id = m.site_id
  where m.organization_id = v_org and m.counterparty_id = v_cp
  order by m.movement_date desc
  limit v_limit offset v_offset;
end;
$$;

revoke all on function public.portal_list_movements(integer, integer) from public;
grant execute on function public.portal_list_movements(integer, integer) to authenticated;
revoke execute on function public.portal_list_movements(integer, integer) from anon;

drop function if exists public.portal_counterparty_summary();

create function public.portal_counterparty_summary()
returns table (
  outstanding_pallets numeric,
  estimated_exposure numeric,
  open_vouchers_count integer,
  active_recovery_cases_count integer,
  recovered_pallets numeric,
  recovered_value numeric,
  next_due_date date
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_org uuid;
  v_cp uuid;
begin
  select organization_id, counterparty_id into v_org, v_cp from public.portal_current_context();
  if v_org is null then
    raise exception 'no active client portal membership';
  end if;

  return query
  select
    coalesce(sum(greatest(rc.quantity_claimed - rc.quantity_recovered, 0))
      filter (where rc.status not in ('closed_unrecovered', 'cancelled')), 0)::numeric,
    coalesce(sum(greatest(rc.quantity_claimed - rc.quantity_recovered, 0) * rc.unit_value_snapshot)
      filter (where rc.status not in ('closed_unrecovered', 'cancelled')), 0)::numeric,
    (select count(*)::integer from public.vouchers v
      where v.organization_id = v_org and v.counterparty_id = v_cp and v.status in ('open', 'partial')),
    (select count(*)::integer from public.recovery_cases rc2
      where rc2.organization_id = v_org and rc2.counterparty_id = v_cp
        and rc2.status in ('open', 'contacted', 'scheduled', 'partial', 'disputed')),
    coalesce(sum(rc.quantity_recovered), 0)::numeric,
    coalesce(sum(rc.quantity_recovered * rc.unit_value_snapshot), 0)::numeric,
    (select min(rc3.due_date) from public.recovery_cases rc3
      where rc3.organization_id = v_org and rc3.counterparty_id = v_cp
        and rc3.due_date is not null
        and rc3.status not in ('closed_unrecovered', 'cancelled', 'recovered'))
  from public.recovery_cases rc
  where rc.organization_id = v_org and rc.counterparty_id = v_cp;
end;
$$;

revoke all on function public.portal_counterparty_summary() from public;
grant execute on function public.portal_counterparty_summary() to authenticated;
revoke execute on function public.portal_counterparty_summary() from anon;
