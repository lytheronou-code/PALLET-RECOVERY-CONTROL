-- Independent review fix (fase 4): granting/activating/deactivating a
-- client's access to their own operational and financial data is an
-- authorization/security operation, not a day-to-day operator task --
-- admin/operator was too permissive. Operators keep read access to
-- membership status (useful operationally, e.g. to see who currently
-- has portal access), but only admin can create, change or remove a
-- membership.

drop policy if exists operators_insert_client_portal_memberships on public.client_portal_memberships;
create policy admin_insert_client_portal_memberships on public.client_portal_memberships
  for insert
  with check (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = client_portal_memberships.organization_id
        and m.user_id = (select auth.uid())
        and m.role = 'admin'
    )
  );

drop policy if exists operators_update_client_portal_memberships on public.client_portal_memberships;
create policy admin_update_client_portal_memberships on public.client_portal_memberships
  for update
  using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = client_portal_memberships.organization_id
        and m.user_id = (select auth.uid())
        and m.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = client_portal_memberships.organization_id
        and m.user_id = (select auth.uid())
        and m.role = 'admin'
    )
  );

drop policy if exists operators_delete_client_portal_memberships on public.client_portal_memberships;
create policy admin_delete_client_portal_memberships on public.client_portal_memberships
  for delete
  using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = client_portal_memberships.organization_id
        and m.user_id = (select auth.uid())
        and m.role = 'admin'
    )
  );

-- read_client_portal_memberships (self OR admin/operator SELECT) is
-- unchanged -- operators still see membership status, they just can no
-- longer write to it.

create or replace function public.admin_grant_client_portal_access(p_counterparty_id uuid, p_email text)
returns table (id uuid, user_id uuid, email text, active boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_target_user uuid;
  v_membership_id uuid;
  v_existing_active_counterparty uuid;
begin
  select organization_id into v_org from public.counterparties where id = p_counterparty_id;
  if v_org is null then
    raise exception 'counterparty not found';
  end if;

  if not exists (
    select 1 from public.organization_members m
    where m.organization_id = v_org and m.user_id = auth.uid() and m.role = 'admin'
  ) then
    raise exception 'insufficient privileges';
  end if;

  select p.id into v_target_user from public.profiles p where lower(p.email) = lower(trim(p_email));
  if v_target_user is null then
    raise exception 'no account found for this email -- the client must sign up first';
  end if;

  -- V1 enforces exactly one active portal membership per user (see the
  -- partial unique index on client_portal_memberships). Activating a
  -- second counterparty for someone who already has an active one
  -- elsewhere would either violate that constraint or silently switch
  -- which customer's data they see -- neither is acceptable, so this is
  -- rejected explicitly instead of falling through to the constraint
  -- violation's raw error text.
  select counterparty_id into v_existing_active_counterparty
  from public.client_portal_memberships
  where user_id = v_target_user and active and counterparty_id <> p_counterparty_id
  limit 1;

  if v_existing_active_counterparty is not null then
    raise exception 'user already has an active portal membership for a different counterparty';
  end if;

  insert into public.client_portal_memberships (organization_id, counterparty_id, user_id, active)
  values (v_org, p_counterparty_id, v_target_user, true)
  on conflict (organization_id, counterparty_id, user_id) do update set active = true
  returning client_portal_memberships.id into v_membership_id;

  return query
  select cpm.id, cpm.user_id, p.email, cpm.active
  from public.client_portal_memberships cpm
  join public.profiles p on p.id = cpm.user_id
  where cpm.id = v_membership_id;
end;
$$;

revoke all on function public.admin_grant_client_portal_access(uuid, text) from public;
grant execute on function public.admin_grant_client_portal_access(uuid, text) to authenticated;
revoke execute on function public.admin_grant_client_portal_access(uuid, text) from anon;
