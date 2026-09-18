-- Without this, admin/operator's write RLS on client_portal_memberships
-- (added in 20260918150000) has no usable entry point: an operator's own
-- RLS-scoped session can never look up an arbitrary external user's
-- profiles row by email (org_members_read_profiles only lets an org
-- member read OTHER MEMBERS of their own org). SECURITY DEFINER, same
-- pattern as bootstrap_organization: does its own explicit admin/operator
-- authorization check before touching anything, and only ever returns
-- the minimal id/email/active fields needed to confirm the grant --
-- never a general profile-lookup surface.
--
-- Team invites by email remain blocked on SMTP configuration (same as
-- P1); this function assumes the client has already self-registered via
-- the public /signup flow and simply links their existing account to a
-- counterparty. If no account exists yet for that email, it raises a
-- clear error rather than silently doing nothing.

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
begin
  select organization_id into v_org from public.counterparties where id = p_counterparty_id;
  if v_org is null then
    raise exception 'counterparty not found';
  end if;

  if not exists (
    select 1 from public.organization_members m
    where m.organization_id = v_org and m.user_id = auth.uid() and m.role in ('admin', 'operator')
  ) then
    raise exception 'insufficient privileges';
  end if;

  select p.id into v_target_user from public.profiles p where lower(p.email) = lower(trim(p_email));
  if v_target_user is null then
    raise exception 'no account found for this email -- the client must sign up first';
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
