-- Performance Advisor finding (multiple_permissive_policies): two separate
-- permissive SELECT policies on organization_branding (one for internal
-- org members, one for client portal members) means Postgres evaluates
-- both conditions on every SELECT. The table is at most one row per
-- organization, so the cost is negligible either way, but a single
-- combined policy is just as readable and removes the finding outright.
drop policy if exists org_members_read_branding on public.organization_branding;
drop policy if exists portal_members_read_branding on public.organization_branding;

create policy readers_read_branding on public.organization_branding
  for select
  using (
    public.is_org_member(organization_id)
    or exists (
      select 1 from public.client_portal_memberships cpm
      where cpm.organization_id = organization_branding.organization_id
        and cpm.user_id = (select auth.uid())
        and cpm.active
    )
  );
