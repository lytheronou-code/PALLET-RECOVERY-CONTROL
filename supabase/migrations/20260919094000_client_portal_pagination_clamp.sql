-- Independent review fix (fase 4): portal_list_vouchers and
-- portal_list_movements accepted p_page_size directly with only a lower
-- bound (greatest(p_page_size, 1)) -- a portal user calling the RPC
-- directly (bypassing the UI's own page size) could request an
-- unbounded row count through a SECURITY DEFINER function. Not a
-- data-isolation issue (still scoped to the caller's own counterparty),
-- but avoidable load. Clamped to 100, matching
-- portal_list_recovery_cases/portal_list_documents (already clamped in
-- 20260919091000).

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
  v_limit := least(greatest(coalesce(p_page_size, 20), 1), 100);
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
  v_limit := least(greatest(coalesce(p_page_size, 20), 1), 100);
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
