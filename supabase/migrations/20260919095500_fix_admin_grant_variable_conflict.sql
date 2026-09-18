-- Second round of the same bug: even with every SELECT/WHERE reference
-- qualified, the INSERT's "on conflict (organization_id, counterparty_id,
-- user_id)" column list still collided with the RETURNS TABLE OUT
-- parameter named user_id -- a conflict-target column list cannot be
-- table-qualified (there is no valid "on conflict (t.user_id)" syntax),
-- so qualifying was not an available fix there. This function never
-- reads or assigns the OUT parameters as PL/pgSQL variables anywhere
-- (all real work uses v_-prefixed locals, and the OUT columns are only
-- populated via the final RETURN QUERY), so instructing PL/pgSQL to
-- always prefer the column interpretation over the variable one for any
-- ambiguous name is safe here and removes the whole class of collision.
create or replace function public.admin_grant_client_portal_access(p_counterparty_id uuid, p_email text)
returns table (id uuid, user_id uuid, email text, active boolean)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
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
