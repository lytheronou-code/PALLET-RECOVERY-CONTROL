-- Independent-review finding (Premium V4 completion pass): a fixed pair of
-- welcome_message_it/welcome_message_en columns on organization_branding
-- does not scale -- adding de/fr/es/pt would mean a new column (and a new
-- RPC parameter, and new Settings UI markup) per language. Replace it with
-- a normalized per-locale table, the same "one row per (tenant, dimension)"
-- shape organization_branding itself already uses for the org, so a new
-- locale becomes a SUPPORTED_LOCALES entry + an additive CHECK constraint
-- widening, never a schema/RPC/UI change scattered across three files.
--
-- welcome_message_it/welcome_message_en stay on organization_branding,
-- deprecated but not dropped (per the review's explicit allowance) -- a
-- verified-empty read confirmed zero non-null rows exist in production
-- today, so the backfill below is a correctness formality, not a real
-- data-migration risk, and is safe to keep even if that ever changes.
create table public.organization_branding_localizations (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  locale text not null check (locale in ('en', 'it')),
  welcome_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, locale)
);

alter table public.organization_branding_localizations enable row level security;

revoke all on public.organization_branding_localizations from anon, authenticated;
grant select on public.organization_branding_localizations to authenticated;

-- Mirrors organization_branding's own two read policies exactly (same
-- tenant-isolation shape: internal org members, and separately that org's
-- own active portal members -- never any other org's row, whether read
-- internally or from the portal).
create policy org_members_read_branding_localizations on public.organization_branding_localizations
  for select
  using (public.is_org_member(organization_id));

create policy portal_members_read_branding_localizations on public.organization_branding_localizations
  for select
  using (
    exists (
      select 1 from public.client_portal_memberships cpm
      where cpm.organization_id = organization_branding_localizations.organization_id
        and cpm.user_id = (select auth.uid())
        and cpm.active
    )
  );

-- Safe backfill from the deprecated columns -- currently a no-op (zero
-- non-null rows in either column as of this migration), kept for
-- correctness so this migration is safe to run against any future data.
insert into public.organization_branding_localizations (organization_id, locale, welcome_message)
select organization_id, 'it', welcome_message_it
from public.organization_branding
where welcome_message_it is not null
union all
select organization_id, 'en', welcome_message_en
from public.organization_branding
where welcome_message_en is not null
on conflict (organization_id, locale) do nothing;

-- Admin-only write path, same enforcement shape as every other
-- admin_update_organization_* RPC -- mutation only through this
-- SECURITY DEFINER function, never a direct RLS INSERT/UPDATE policy.
create function public.admin_update_organization_branding_localization(
  p_organization_id uuid,
  p_locale text,
  p_welcome_message text default null
)
returns public.organization_branding_localizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.organization_branding_localizations;
begin
  if not exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
      and m.role = 'admin'
  ) then
    raise exception 'insufficient privileges';
  end if;

  -- `<> all(...)` (true only when the value differs from every listed
  -- locale, i.e. is absent from the list) -- not `<> any(...)`, which is
  -- true as soon as the value differs from at least one element and would
  -- incorrectly reject every valid locale. See
  -- 20260919110000_fix_country_currency_validation_logic.sql for the bug
  -- this exact mistake caused the first time it shipped in this codebase.
  if p_locale is null or p_locale <> all (array['en', 'it']) then
    raise exception 'unsupported locale';
  end if;

  insert into public.organization_branding_localizations (organization_id, locale, welcome_message, updated_at)
  values (p_organization_id, p_locale, nullif(trim(p_welcome_message), ''), now())
  on conflict (organization_id, locale) do update set
    welcome_message = excluded.welcome_message,
    updated_at = now()
  returning * into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_update_organization_branding_localization(uuid, text, text) from public;
grant execute on function public.admin_update_organization_branding_localization(uuid, text, text) to authenticated;
revoke execute on function public.admin_update_organization_branding_localization(uuid, text, text) from anon;

-- admin_update_organization_branding's signature changes (the two
-- welcome-message params are removed, callers now use the RPC above
-- instead) -- drop + create rather than create-or-replace, following this
-- codebase's own established convention for RPC signature changes
-- (20260919104500_split_organization_settings_rpcs.sql).
drop function if exists public.admin_update_organization_branding(
  uuid, text, text, text, text, text, text, text, text, text, text
);

create function public.admin_update_organization_branding(
  p_organization_id uuid,
  p_portal_name text default null,
  p_logo_path text default null,
  p_compact_logo_path text default null,
  p_primary_color text default null,
  p_secondary_color text default null,
  p_support_email text default null,
  p_support_phone text default null,
  p_website text default null
)
returns public.organization_branding
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.organization_branding;
begin
  if not exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
      and m.role = 'admin'
  ) then
    raise exception 'insufficient privileges';
  end if;

  if p_primary_color is not null and p_primary_color !~ '^#[0-9A-Fa-f]{6}$' then
    raise exception 'invalid primary color';
  end if;
  if p_secondary_color is not null and p_secondary_color !~ '^#[0-9A-Fa-f]{6}$' then
    raise exception 'invalid secondary color';
  end if;

  if p_logo_path is not null
    and (storage.foldername(p_logo_path))[1] is distinct from p_organization_id::text then
    raise exception 'logo path does not belong to this organization';
  end if;
  if p_compact_logo_path is not null
    and (storage.foldername(p_compact_logo_path))[1] is distinct from p_organization_id::text then
    raise exception 'compact logo path does not belong to this organization';
  end if;

  insert into public.organization_branding (
    organization_id, portal_name, logo_path, compact_logo_path,
    primary_color, secondary_color, support_email, support_phone,
    website, updated_at
  )
  values (
    p_organization_id, nullif(trim(p_portal_name), ''), p_logo_path, p_compact_logo_path,
    p_primary_color, p_secondary_color, nullif(trim(p_support_email), ''), nullif(trim(p_support_phone), ''),
    nullif(trim(p_website), ''), now()
  )
  on conflict (organization_id) do update set
    portal_name = excluded.portal_name,
    logo_path = excluded.logo_path,
    compact_logo_path = excluded.compact_logo_path,
    primary_color = excluded.primary_color,
    secondary_color = excluded.secondary_color,
    support_email = excluded.support_email,
    support_phone = excluded.support_phone,
    website = excluded.website,
    updated_at = now()
  returning * into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_update_organization_branding(
  uuid, text, text, text, text, text, text, text, text
) from public;
grant execute on function public.admin_update_organization_branding(
  uuid, text, text, text, text, text, text, text, text
) to authenticated;
revoke execute on function public.admin_update_organization_branding(
  uuid, text, text, text, text, text, text, text, text
) from anon;
