-- M2: Client Portal read functions. Every function below resolves the
-- caller's org/counterparty from their OWN client_portal_memberships row
-- via portal_current_context() -- never from a client-supplied parameter --
-- so there is no organization_id/counterparty_id argument for a forged
-- request to tamper with. Each returns an explicit, client-safe column
-- list only (no internal notes, no assignee_user_id, no correction/audit
-- columns). All are SECURITY DEFINER + STABLE, revoked from public, and
-- granted to authenticated only.

-- Internal helper, intentionally NOT granted to authenticated: only the
-- portal_* functions in this file call it, and they run as SECURITY
-- DEFINER themselves, so no separate grant is needed for that call to
-- succeed.
create or replace function public.portal_current_context()
returns table (organization_id uuid, counterparty_id uuid)
language sql
security definer
set search_path = public
stable
as $$
  select m.organization_id, m.counterparty_id
  from public.client_portal_memberships m
  where m.user_id = auth.uid()
    and m.active
  order by m.created_at desc
  limit 1;
$$;

revoke all on function public.portal_current_context() from public, authenticated;

create or replace function public.portal_counterparty_summary()
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
      filter (where rc.status not in ('closed_unrecovered', 'cancelled')), 0),
    coalesce(sum(greatest(rc.quantity_claimed - rc.quantity_recovered, 0) * rc.unit_value_snapshot)
      filter (where rc.status not in ('closed_unrecovered', 'cancelled')), 0),
    (select count(*)::int from public.vouchers v
      where v.organization_id = v_org and v.counterparty_id = v_cp and v.status in ('open', 'partial')),
    (select count(*)::int from public.recovery_cases rc2
      where rc2.organization_id = v_org and rc2.counterparty_id = v_cp
        and rc2.status in ('open', 'contacted', 'scheduled', 'partial', 'disputed')),
    coalesce(sum(rc.quantity_recovered), 0),
    coalesce(sum(rc.quantity_recovered * rc.unit_value_snapshot), 0),
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

create or replace function public.portal_list_vouchers(p_page integer default 1, p_page_size integer default 20)
returns table (
  id uuid,
  voucher_number text,
  quantity numeric,
  recovered_quantity numeric,
  outstanding_quantity numeric,
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

create or replace function public.portal_list_movements(p_page integer default 1, p_page_size integer default 20)
returns table (
  id uuid,
  movement_date date,
  direction text,
  quantity numeric,
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

-- Deliberately excludes recovery_cases.notes and assignee_user_id -- those
-- are internal-only. voucher_id/site_id are also left out of the surface
-- for V1 (not needed by any of the required portal screens); add them
-- later as an additive change if a real client-facing use case needs them.
create or replace function public.portal_list_recovery_cases(p_page integer default 1, p_page_size integer default 20)
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
  opened_at timestamptz,
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

-- Only documents an internal operator explicitly marked visibility='client'
-- (and not superseded) are ever returned here.
create or replace function public.portal_list_documents(p_page integer default 1, p_page_size integer default 20)
returns table (
  id uuid,
  document_type text,
  original_filename text,
  uploaded_at timestamptz,
  notes text,
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
  select d.id, d.document_type, d.original_filename, d.uploaded_at, d.notes,
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

-- Re-verifies visibility/status/membership at call time (a document could
-- have been superseded or un-shared between the list call and the
-- download click) and hands back a storage_path for the caller's own
-- Server Action to pass to storage.createSignedUrl -- never returned to
-- the browser directly as a raw path/authorization mechanism.
create or replace function public.portal_get_document_storage_path(p_document_id uuid)
returns text
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_org uuid;
  v_cp uuid;
  v_path text;
begin
  select organization_id, counterparty_id into v_org, v_cp from public.portal_current_context();
  if v_org is null then
    raise exception 'no active client portal membership';
  end if;

  select storage_path into v_path
  from public.documents
  where id = p_document_id
    and organization_id = v_org
    and counterparty_id = v_cp
    and visibility = 'client'
    and status = 'active';

  if v_path is null then
    raise exception 'document not found or not accessible';
  end if;

  return v_path;
end;
$$;

revoke all on function public.portal_get_document_storage_path(uuid) from public;
grant execute on function public.portal_get_document_storage_path(uuid) to authenticated;

-- Storage RLS: additive SELECT policy for client portal access, joined
-- through public.documents exactly like the existing internal-operator
-- policy (org_members_read_documents_storage) -- never raw path parsing,
-- and scoped to visibility='client' + status='active' on top of
-- is_client_portal_member(). createSignedUrl() calls made with the
-- caller's own (non-elevated) session are gated by this policy.
create policy client_portal_read_documents_storage on storage.objects
  for select
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.documents d
      where d.storage_path = storage.objects.name
        and d.visibility = 'client'
        and d.status = 'active'
        and public.is_client_portal_member(d.organization_id, d.counterparty_id)
    )
  );
