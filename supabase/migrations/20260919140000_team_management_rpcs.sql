-- Premium V5 P1 #3: Team management role UI. organization_members has
-- exactly one RLS policy (SELECT, members_read_org_membership) and
-- deliberately no INSERT/UPDATE/DELETE policy -- per
-- 20260917204239_bootstrap_organization_rpc.sql's own threat model, a
-- direct client INSERT policy on this table would let any authenticated
-- user attach themselves to an org they don't belong to. Every mutation
-- here therefore goes through an admin-gated SECURITY DEFINER RPC, same
-- shape as every other admin_* RPC in this schema (organization_members
-- lookup as the first statement, `raise exception` for every failure).
--
-- Real email invites remain blocked on missing SMTP configuration (same
-- as every prior pass). admin_add_organization_member follows
-- admin_grant_client_portal_access's existing pattern instead: look up an
-- already-registered account (public.profiles) by email and link it --
-- the target must have already self-registered via /signup.
--
-- Self-action guard (both role-change and removal): a caller can never
-- target their OWN membership row. This is a deliberate simplification,
-- not an oversight -- it forces a role change or removal of any admin
-- (including "the last one") to be performed by a *different* admin, and
-- as a direct consequence a dedicated "don't demote/remove the last
-- admin" check is unnecessary: the caller is already required to be an
-- admin by the privilege check above, and the caller can never be the
-- target, so at least one admin (the caller) always still exists in the
-- organization after either RPC succeeds.

create or replace function public.admin_add_organization_member(
  p_organization_id uuid,
  p_email text,
  p_role text
)
returns table (id uuid, user_id uuid, email text, display_name text, role text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_user uuid;
  v_new_id uuid;
begin
  if not exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
      and m.role = 'admin'
  ) then
    raise exception 'insufficient privileges';
  end if;

  if p_role is null or p_role not in ('admin', 'operator', 'viewer') then
    raise exception 'unsupported role';
  end if;

  select p.id into v_target_user
  from public.profiles p
  where lower(p.email) = lower(trim(p_email));

  if v_target_user is null then
    raise exception 'no account found for this email';
  end if;

  if exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id and m.user_id = v_target_user
  ) then
    raise exception 'already a member';
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (p_organization_id, v_target_user, p_role)
  returning organization_members.id into v_new_id;

  return query
    select m.id, m.user_id, p.email, p.display_name, m.role, m.created_at
    from public.organization_members m
    join public.profiles p on p.id = m.user_id
    where m.id = v_new_id;
end;
$$;

revoke all on function public.admin_add_organization_member(uuid, text, text) from public;
grant execute on function public.admin_add_organization_member(uuid, text, text) to authenticated;
revoke execute on function public.admin_add_organization_member(uuid, text, text) from anon;

create or replace function public.admin_update_organization_member_role(
  p_organization_id uuid,
  p_member_id uuid,
  p_role text
)
returns table (id uuid, user_id uuid, email text, display_name text, role text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_user uuid;
begin
  if not exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
      and m.role = 'admin'
  ) then
    raise exception 'insufficient privileges';
  end if;

  if p_role is null or p_role not in ('admin', 'operator', 'viewer') then
    raise exception 'unsupported role';
  end if;

  select m.user_id into v_target_user
  from public.organization_members m
  where m.id = p_member_id and m.organization_id = p_organization_id;

  if v_target_user is null then
    raise exception 'member not found';
  end if;

  if v_target_user = (select auth.uid()) then
    raise exception 'cannot change your own role';
  end if;

  -- Table alias, not a bare column reference: this function's own
  -- RETURNS TABLE (id uuid, ...) declares `id` as an implicit plpgsql
  -- variable in scope for the whole function body, which would make an
  -- unqualified `where id = p_member_id` ambiguous between that
  -- variable and the table's own id column (caught live by adversarial
  -- QA before this ever shipped).
  update public.organization_members m
  set role = p_role
  where m.id = p_member_id and m.organization_id = p_organization_id;

  return query
    select m.id, m.user_id, p.email, p.display_name, m.role, m.created_at
    from public.organization_members m
    join public.profiles p on p.id = m.user_id
    where m.id = p_member_id;
end;
$$;

revoke all on function public.admin_update_organization_member_role(uuid, uuid, text) from public;
grant execute on function public.admin_update_organization_member_role(uuid, uuid, text) to authenticated;
revoke execute on function public.admin_update_organization_member_role(uuid, uuid, text) from anon;

create or replace function public.admin_remove_organization_member(
  p_organization_id uuid,
  p_member_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_user uuid;
begin
  if not exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
      and m.role = 'admin'
  ) then
    raise exception 'insufficient privileges';
  end if;

  select m.user_id into v_target_user
  from public.organization_members m
  where m.id = p_member_id and m.organization_id = p_organization_id;

  if v_target_user is null then
    raise exception 'member not found';
  end if;

  if v_target_user = (select auth.uid()) then
    raise exception 'cannot remove yourself';
  end if;

  delete from public.organization_members
  where id = p_member_id and organization_id = p_organization_id;
end;
$$;

revoke all on function public.admin_remove_organization_member(uuid, uuid) from public;
grant execute on function public.admin_remove_organization_member(uuid, uuid) to authenticated;
revoke execute on function public.admin_remove_organization_member(uuid, uuid) from anon;
