-- Performance Advisor flagged client_portal_memberships: self_read_ and
-- operators_manage_ were both permissive SELECT policies for the same
-- roles, so Postgres evaluated both on every query. Same end behavior
-- (self OR admin/operator can read), split into one SELECT policy (OR'd
-- condition) plus separate write-only policies for admin/operator.

drop policy if exists self_read_client_portal_membership on public.client_portal_memberships;
drop policy if exists operators_manage_client_portal_memberships on public.client_portal_memberships;

create policy read_client_portal_memberships on public.client_portal_memberships
  for select
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.organization_members m
      where m.organization_id = client_portal_memberships.organization_id
        and m.user_id = (select auth.uid())
        and m.role in ('admin', 'operator')
    )
  );

create policy operators_insert_client_portal_memberships on public.client_portal_memberships
  for insert
  with check (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = client_portal_memberships.organization_id
        and m.user_id = (select auth.uid())
        and m.role in ('admin', 'operator')
    )
  );

create policy operators_update_client_portal_memberships on public.client_portal_memberships
  for update
  using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = client_portal_memberships.organization_id
        and m.user_id = (select auth.uid())
        and m.role in ('admin', 'operator')
    )
  )
  with check (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = client_portal_memberships.organization_id
        and m.user_id = (select auth.uid())
        and m.role in ('admin', 'operator')
    )
  );

create policy operators_delete_client_portal_memberships on public.client_portal_memberships
  for delete
  using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = client_portal_memberships.organization_id
        and m.user_id = (select auth.uid())
        and m.role in ('admin', 'operator')
    )
  );
