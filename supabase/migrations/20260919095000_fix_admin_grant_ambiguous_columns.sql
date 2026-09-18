-- Bug found by this pass's own adversarial re-test: admin_grant_client_portal_access
-- declares RETURNS TABLE (id uuid, user_id uuid, email text, active boolean),
-- which implicitly creates PL/pgSQL variables named id/user_id/email/active
-- in the function body's scope. Two unqualified references --
-- "where id = p_counterparty_id" and "... and active and ..." -- collided
-- with those OUT-parameter variables and made EVERY call to this
-- function fail with "column reference is ambiguous", including
-- legitimate admin calls -- this function has never actually worked.
-- Fixed by qualifying every column reference with its table alias.

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
  select c.organization_id into v_org from public.counterparties c where c.id = p_counterparty_id;
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

  select cpm.counterparty_id into v_existing_active_counterparty
  from public.client_portal_memberships cpm
  where cpm.user_id = v_target_user and cpm.active and cpm.counterparty_id <> p_counterparty_id
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
