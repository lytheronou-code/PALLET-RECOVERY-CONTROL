-- Independent review fix (fase 4): two client-facing RPCs leaked
-- internal-only fields that "visibility='client'" or "this document is
-- linked to the client's own counterparty" never implied should be
-- client-visible:
--
-- 1. portal_list_recovery_cases returned `priority`, an internal
--    recovery-management concept (escalation/operational strategy/
--    commercial urgency) that has no business being shown to the
--    counterparty the case is even about.
-- 2. portal_list_documents returned `notes`, an internal operational
--    field on the document row. An operator marking a document
--    visibility='client' shares the FILE, not implicitly every
--    internal annotation ever attached to its metadata row. A
--    dedicated client-facing `client_description` field can be added
--    later if a real use case needs one -- not reusing `notes`.
--
-- Both columns are removed from the RETURNS TABLE entirely (not just
-- left null), so they are structurally impossible to read through
-- these functions regardless of any future change to their SELECT list.

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
  v_limit := least(greatest(coalesce(p_page_size, 20), 1), 100);
  v_offset := greatest(coalesce(p_page, 1), 1) - 1;
  v_offset := v_offset * v_limit;

  return query
  select rc.id, rc.reference, pt.code,
    rc.quantity_claimed, rc.quantity_recovered,
    greatest(rc.quantity_claimed - rc.quantity_recovered, 0),
    (greatest(rc.quantity_claimed - rc.quantity_recovered, 0) * rc.unit_value_snapshot)::numeric,
    rc.due_date, rc.status, rc.opened_at,
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

drop function if exists public.portal_list_documents(integer, integer);

create function public.portal_list_documents(p_page integer default 1, p_page_size integer default 20)
returns table (
  id uuid,
  document_type text,
  original_filename text,
  uploaded_at timestamptz,
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
  select d.id, d.document_type, d.original_filename, d.uploaded_at,
    count(*) over ()
  from public.documents d
  where d.organization_id = v_org and d.counterparty_id = v_cp
    and d.visibility = 'client' and d.status = 'active'
  order by d.uploaded_at desc
  limit v_limit offset v_offset;
end;
$$;

revoke all on function public.portal_list_documents(integer, integer) from public;
grant execute on function public.portal_list_documents(integer, integer) to authenticated;
revoke execute on function public.portal_list_documents(integer, integer) from anon;
