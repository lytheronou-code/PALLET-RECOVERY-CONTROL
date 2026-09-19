-- Fixes two bugs found by this migration's own adversarial re-test:
--
-- 1. portal_list_recovery_cases declared opened_at as timestamptz, but
--    recovery_cases.opened_at is `date` -- every call failed with
--    "structure of query does not match function result type".
--
-- 2. client_portal_read_documents_storage's EXISTS subquery reads
--    public.documents directly, which is itself subject to documents'
--    OWN row-level security -- and a client-portal user has no SELECT
--    policy on public.documents (by design, see the M1/M2 schema
--    comments), so the subquery always saw zero rows and the policy
--    never matched even for a document the client IS authorized to
--    read. Wrapped the same check in a SECURITY DEFINER function
--    (mirrors is_org_member/is_client_portal_member) so it evaluates
--    with elevated privileges regardless of the caller's own RLS
--    visibility into documents.

drop function if exists public.portal_list_recovery_cases(integer, integer);

create function public.portal_list_recovery_cases(p_page integer default 1, p_page_size integer default 20)
returns table (
  id uuid,
  reference text,
  pallet_type_code text,
  quantity_claimed numeric,
  quantity_recovered numeric,
  outstanding_quantity numeric,
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
    greatest(rc.quantity_claimed - rc.quantity_recovered, 0) * rc.unit_value_snapshot,
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

create or replace function public.is_client_visible_document_path(p_storage_path text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.documents d
    where d.storage_path = p_storage_path
      and d.visibility = 'client'
      and d.status = 'active'
      and public.is_client_portal_member(d.organization_id, d.counterparty_id)
  );
$$;

revoke all on function public.is_client_visible_document_path(text) from public;
grant execute on function public.is_client_visible_document_path(text) to authenticated;
revoke execute on function public.is_client_visible_document_path(text) from anon;

drop policy if exists client_portal_read_documents_storage on storage.objects;
create policy client_portal_read_documents_storage on storage.objects
  for select
  using (
    bucket_id = 'documents'
    and public.is_client_visible_document_path(storage.objects.name)
  );
