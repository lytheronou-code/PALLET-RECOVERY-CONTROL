-- Follow-up to 20260919120000_self_read_own_profile.sql: the Performance
-- Advisor flagged two issues introduced by adding self_read_profile
-- alongside the pre-existing org_members_read_profiles:
--   1. auth_rls_initplan -- self_read_profile called auth.uid() directly,
--      re-evaluating it per row instead of once per statement.
--   2. multiple_permissive_policies -- two permissive SELECT policies on
--      the same table/role means Postgres evaluates both for every query.
--
-- Fix: collapse both into a single SELECT policy that ORs the two
-- conditions (self, or shares an organization with the target), with
-- auth.uid() wrapped in a scalar subquery so the planner evaluates it
-- once. Access is unchanged -- this is a pure consolidation.

drop policy if exists org_members_read_profiles on public.profiles;
drop policy if exists self_read_profile on public.profiles;

create policy read_profiles
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1
    from public.organization_members mine
    join public.organization_members theirs
      on theirs.organization_id = mine.organization_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = profiles.id
  )
);
