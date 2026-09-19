-- Performance Advisor: organization_branding_localizations has two
-- permissive SELECT policies (org_members_read_branding_localizations,
-- portal_members_read_branding_localizations) evaluated on every read for
-- every role. Same fix as profiles in 20260919120500: collapse into one
-- policy that ORs both conditions. Access is unchanged.

drop policy if exists org_members_read_branding_localizations on public.organization_branding_localizations;
drop policy if exists portal_members_read_branding_localizations on public.organization_branding_localizations;

create policy read_branding_localizations
on public.organization_branding_localizations
for select
to authenticated
using (
  is_org_member(organization_id)
  or exists (
    select 1
    from public.client_portal_memberships cpm
    where cpm.organization_id = organization_branding_localizations.organization_id
      and cpm.user_id = (select auth.uid())
      and cpm.active
  )
);
