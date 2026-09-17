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

  if exists (
    select 1
    from public.organization_members
    where user_id = v_uid
  ) then
    raise exception 'organization already initialized for this user';
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
revoke execute on function public.bootstrap_organization(text) from anon;
grant execute on function public.bootstrap_organization(text) to authenticated;
