-- Threat model:
-- `organizations` and `organization_members` have SELECT-only RLS policies today.
-- There is intentionally no client-facing INSERT policy on either table, because a
-- direct INSERT policy on `organization_members` would let an authenticated user
-- attach themselves to an *existing* organization (privilege escalation into another
-- tenant's data) unless the policy encoded first-admin bootstrap semantics itself.
-- Instead, first-organization bootstrap is done through this SECURITY DEFINER RPC,
-- which is the only path allowed to write these two tables from the client. It:
--   * requires an authenticated caller (auth.uid() must be non-null);
--   * always inserts the caller as the organization's own first member with role
--     'admin' -- it can never add a different user, and never attaches the caller
--     to an organization that already exists;
--   * pins search_path to prevent search_path hijacking of a SECURITY DEFINER function;
--   * is granted to `authenticated` only, never to `anon`.
create or replace function public.bootstrap_organization(p_name text)
returns table (organization_id uuid, role text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_org_id uuid;
  v_base_slug text;
  v_slug text;
  v_suffix int := 0;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'organization name is required';
  end if;

  if length(trim(p_name)) > 200 then
    raise exception 'organization name is too long';
  end if;

  v_base_slug := lower(regexp_replace(trim(p_name), '[^a-zA-Z0-9]+', '-', 'g'));
  v_base_slug := trim(both '-' from v_base_slug);
  if v_base_slug = '' then
    v_base_slug := 'org';
  end if;
  v_slug := v_base_slug;

  loop
    begin
      insert into public.organizations (name, slug)
      values (trim(p_name), v_slug)
      returning id into v_org_id;
      exit;
    exception when unique_violation then
      v_suffix := v_suffix + 1;
      v_slug := v_base_slug || '-' || v_suffix;
      if v_suffix > 50 then
        raise exception 'could not allocate a unique organization slug';
      end if;
    end;
  end loop;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_org_id, v_uid, 'admin');

  return query select v_org_id, 'admin'::text;
end;
$$;

revoke all on function public.bootstrap_organization(text) from public;
grant execute on function public.bootstrap_organization(text) to authenticated;
