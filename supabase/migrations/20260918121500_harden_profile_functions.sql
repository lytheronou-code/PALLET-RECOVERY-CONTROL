-- handle_new_user() is a trigger body, never meant to be called directly:
-- revoke the implicit PostgREST RPC exposure the advisor flagged for both
-- anon and authenticated. Triggers execute with the privileges of the
-- function owner regardless of table grants, so this does not break the
-- on_auth_user_created trigger itself.
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Supabase RLS perf guidance: wrap auth.<fn>() in a scalar subquery so the
-- planner evaluates it once per statement instead of once per row.
drop policy if exists org_members_read_profiles on public.profiles;
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
    where mine.user_id = (select auth.uid())
      and theirs.user_id = profiles.id
  )
);

drop policy if exists self_update_profile on public.profiles;
create policy self_update_profile
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));
