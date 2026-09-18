-- Threat model:
-- organization_members currently has a single SELECT policy scoped to
-- user_id = auth.uid(): a member can see their OWN row only, never their
-- teammates'. That silently breaks anything that needs "who else is in my
-- org" (member counts, an assignee picker, a future team page) and is not
-- a privacy boundary anyone asked for -- teammates in the same tenant are
-- expected to see each other, cross-tenant isolation is what must hold.
--
-- Fix: let a member read organization_members rows for any organization
-- they themselves belong to. A same-table RLS subquery on
-- organization_members would self-reference during evaluation, so the
-- standard-safe pattern is a SECURITY DEFINER, STABLE helper that checks
-- membership directly (bypassing RLS internally, since RLS is exactly
-- what it's implementing) and returns only a boolean -- it cannot leak
-- row data itself.
--
-- auth.users is never exposed to PostgREST directly (it's outside the
-- public schema), so showing a teammate's email for an assignee picker
-- needs a public.profiles mirror, synced from auth.users by trigger and
-- backfilled once for existing users. RLS on profiles reuses the same
-- is_org_member() check via a join, so a profile is only visible to
-- people who share an organization with that user.

create or replace function public.is_org_member(p_organization_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = p_organization_id
      and user_id = auth.uid()
  );
$$;

revoke all on function public.is_org_member(uuid) from public;
revoke execute on function public.is_org_member(uuid) from anon;
grant execute on function public.is_org_member(uuid) to authenticated;

drop policy if exists members_read_own_membership on public.organization_members;
create policy members_read_org_membership
on public.organization_members
for select
to authenticated
using (public.is_org_member(organization_id));

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy org_members_read_profiles
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members mine
    join public.organization_members theirs
      on theirs.organization_id = mine.organization_id
    where mine.user_id = auth.uid()
      and theirs.user_id = profiles.id
  )
);

create policy self_update_profile
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email, updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- One-time backfill for users who signed up before this migration.
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;
