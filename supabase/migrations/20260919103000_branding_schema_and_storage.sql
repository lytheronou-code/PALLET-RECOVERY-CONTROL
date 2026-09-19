-- Premium V4 M5: white-label branding foundation.
--
-- organization_branding is a single opt-in row per organization (primary
-- key IS organization_id, not a surrogate id + unique constraint) --
-- branding is inherently 1:1 with an organization, and this makes "does
-- this org have branding configured yet" a plain existence check rather
-- than a join condition.
--
-- Mutation goes only through admin_update_organization_branding() (added
-- below), never a direct RLS INSERT/UPDATE policy -- same pattern as
-- organizations itself (no direct UPDATE policy; bootstrap_organization is
-- the only writer). This keeps "only an admin can change branding" as a
-- single enforcement point instead of duplicating the role check across
-- an RLS policy and every call site.
create table public.organization_branding (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  portal_name text,
  logo_path text,
  compact_logo_path text,
  primary_color text check (primary_color is null or primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text check (secondary_color is null or secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  support_email text,
  support_phone text,
  website text,
  welcome_message_it text,
  welcome_message_en text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organization_branding enable row level security;

revoke all on public.organization_branding from anon, authenticated;
grant select on public.organization_branding to authenticated;

-- Internal operators (admin AND operator -- "operators may view them").
create policy org_members_read_branding on public.organization_branding
  for select
  using (public.is_org_member(organization_id));

-- Client Portal users may read only the branding of their own authorized
-- organization (adversarial scenario 5), never any other org's, whether
-- or not that org is also the one their own account happens to operate
-- internally in (client_portal_memberships is checked independently of
-- organization_members here, deliberately -- these are disjoint access
-- grants and this policy must not accidentally fall back to the internal
-- one).
create policy portal_members_read_branding on public.organization_branding
  for select
  using (
    exists (
      select 1 from public.client_portal_memberships cpm
      where cpm.organization_id = organization_branding.organization_id
        and cpm.user_id = (select auth.uid())
        and cpm.active
    )
  );

-- Private, tenant-isolated, and deliberately a separate bucket from
-- "documents": branding assets are small, non-sensitive presentation
-- images with no audit-trail requirement, whereas documents are
-- immutable evidence. Keeping them apart means a logo re-upload/replace
-- flow can freely delete the old object (see the DELETE policy below)
-- without touching the "never delete tracked evidence" guarantee the
-- documents bucket depends on.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'branding-assets',
  'branding-assets',
  false,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
);

-- Path convention: {organization_id}/{uuid}-{safe_filename}
-- INSERT/UPDATE/DELETE: admin-only (branding is an admin-only setting),
-- own org path prefix only.
create policy admins_write_branding_storage on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'branding-assets'
    and exists (
      select 1 from public.organization_members m
      where m.user_id = (select auth.uid())
        and m.role = 'admin'
        and (storage.foldername(storage.objects.name))[1] = m.organization_id::text
    )
  );

create policy admins_delete_branding_storage on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'branding-assets'
    and exists (
      select 1 from public.organization_members m
      where m.user_id = (select auth.uid())
        and m.role = 'admin'
        and (storage.foldername(storage.objects.name))[1] = m.organization_id::text
    )
  );

-- SELECT authorization mirrors the metadata source of truth (same
-- principle as documents' storage SELECT policy): a path is readable only
-- while organization_branding actually references it as the current
-- logo/compact_logo, and only to that organization's own internal members
-- or its own portal members -- never by guessing a path.
create policy readers_select_branding_storage on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'branding-assets'
    and exists (
      select 1 from public.organization_branding b
      where (b.logo_path = storage.objects.name or b.compact_logo_path = storage.objects.name)
        and (
          public.is_org_member(b.organization_id)
          or exists (
            select 1 from public.client_portal_memberships cpm
            where cpm.organization_id = b.organization_id
              and cpm.user_id = (select auth.uid())
              and cpm.active
          )
        )
    )
  );
