-- Premium V4 M4/M5: admin-only mutation for organization settings and
-- branding. Both tables have no direct RLS INSERT/UPDATE policy (SELECT
-- only) -- these two SECURITY DEFINER functions are the sole write path,
-- same "one enforcement point for the admin-only rule" reasoning as
-- admin_grant_client_portal_access.
--
-- The currency/country code arrays below are the SQL-side mirror of
-- src/lib/currencies.ts / src/lib/countries.ts. They exist so a direct RPC
-- call (bypassing the UI's own dropdown, which already only offers these
-- values) cannot persist a well-formed-but-unsupported code -- the CHECK
-- constraints added earlier only validate *format* (3 letters / not
-- pg_timezone_names-checkable in a constraint), not membership in the
-- actually-supported set. Adding a new supported currency/country is a
-- two-file change (the TS list + this array); it is not migration
-- surgery, since the DB list only needs to be a superset check, and
-- re-CREATE OR REPLACE of this function is itself a plain additive
-- migration.

create or replace function public.admin_update_organization_settings(
  p_organization_id uuid,
  p_legal_name text,
  p_trading_name text,
  p_country_code text,
  p_tax_id text,
  p_vat_id text,
  p_registration_number text,
  p_address_line_1 text,
  p_address_line_2 text,
  p_city text,
  p_region text,
  p_postal_code text,
  p_website text,
  p_support_email text,
  p_support_phone text,
  p_default_locale text,
  p_default_currency text,
  p_timezone text
)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.organizations;
  v_country_code text := upper(nullif(trim(p_country_code), ''));
  v_currency text := upper(nullif(trim(p_default_currency), ''));
begin
  if not exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
      and m.role = 'admin'
  ) then
    raise exception 'insufficient privileges';
  end if;

  if p_default_locale is not null and p_default_locale not in ('en', 'it') then
    raise exception 'unsupported locale';
  end if;

  if v_currency is not null and v_currency <> any (array[
    'EUR','USD','GBP','CHF','SEK','NOK','DKK','PLN','CZK','HUF','RON',
    'CAD','AUD','NZD','JPY','CNY','INR','BRL','MXN','ZAR','AED','SAR',
    'SGD','HKD','TRY'
  ]) then
    raise exception 'unsupported currency';
  end if;

  if p_timezone is not null and not exists (
    select 1 from pg_timezone_names where name = p_timezone
  ) then
    raise exception 'unknown timezone';
  end if;

  if v_country_code is not null and v_country_code <> any (array[
    'AD','AE','AF','AG','AL','AM','AO','AR','AT','AU','AZ','BA','BB','BD',
    'BE','BF','BG','BH','BI','BJ','BN','BO','BR','BS','BT','BW','BY','BZ',
    'CA','CD','CF','CG','CH','CI','CL','CM','CN','CO','CR','CU','CV','CY',
    'CZ','DE','DJ','DK','DM','DO','DZ','EC','EE','EG','ER','ES','ET','FI',
    'FJ','FM','FR','GA','GB','GD','GE','GH','GM','GN','GQ','GR','GT','GW',
    'GY','HK','HN','HR','HT','HU','ID','IE','IL','IN','IQ','IR','IS','IT',
    'JM','JO','JP','KE','KG','KH','KI','KM','KN','KP','KR','KW','KZ','LA',
    'LB','LC','LI','LK','LR','LS','LT','LU','LV','LY','MA','MC','MD','ME',
    'MG','MH','MK','ML','MM','MN','MR','MT','MU','MV','MW','MX','MY','MZ',
    'NA','NE','NG','NI','NL','NO','NP','NR','NZ','OM','PA','PE','PG','PH',
    'PK','PL','PT','PW','PY','QA','RO','RS','RU','RW','SA','SB','SC','SD',
    'SE','SG','SI','SK','SL','SM','SN','SO','SR','SS','ST','SV','SY','SZ',
    'TD','TG','TH','TJ','TL','TM','TN','TO','TR','TT','TV','TW','TZ','UA',
    'UG','US','UY','UZ','VA','VC','VE','VN','VU','WS','XK','YE','ZA','ZM','ZW'
  ]) then
    raise exception 'unsupported country code';
  end if;

  update public.organizations set
    legal_name = nullif(trim(p_legal_name), ''),
    trading_name = nullif(trim(p_trading_name), ''),
    country_code = v_country_code,
    tax_id = nullif(trim(p_tax_id), ''),
    vat_id = nullif(trim(p_vat_id), ''),
    registration_number = nullif(trim(p_registration_number), ''),
    address_line_1 = nullif(trim(p_address_line_1), ''),
    address_line_2 = nullif(trim(p_address_line_2), ''),
    city = nullif(trim(p_city), ''),
    region = nullif(trim(p_region), ''),
    postal_code = nullif(trim(p_postal_code), ''),
    website = nullif(trim(p_website), ''),
    support_email = nullif(trim(p_support_email), ''),
    support_phone = nullif(trim(p_support_phone), ''),
    default_locale = coalesce(p_default_locale, default_locale),
    default_currency = coalesce(v_currency, default_currency),
    timezone = coalesce(p_timezone, timezone)
  where id = p_organization_id
  returning * into v_result;

  if v_result.id is null then
    raise exception 'organization not found';
  end if;

  return v_result;
end;
$$;

revoke all on function public.admin_update_organization_settings(
  uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text
) from public;
grant execute on function public.admin_update_organization_settings(
  uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text
) to authenticated;
revoke execute on function public.admin_update_organization_settings(
  uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text
) from anon;

create or replace function public.admin_update_organization_branding(
  p_organization_id uuid,
  p_portal_name text,
  p_logo_path text,
  p_compact_logo_path text,
  p_primary_color text,
  p_secondary_color text,
  p_support_email text,
  p_support_phone text,
  p_website text,
  p_welcome_message_it text,
  p_welcome_message_en text
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

  -- Adversarial scenario 7 (forged logo path): a client-supplied path must
  -- already sit under this organization's own branding-assets prefix.
  -- Cross-tenant paths are rejected here regardless of whether the caller
  -- is otherwise a legitimate admin of p_organization_id.
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
    website, welcome_message_it, welcome_message_en, updated_at
  )
  values (
    p_organization_id, nullif(trim(p_portal_name), ''), p_logo_path, p_compact_logo_path,
    p_primary_color, p_secondary_color, nullif(trim(p_support_email), ''), nullif(trim(p_support_phone), ''),
    nullif(trim(p_website), ''), nullif(trim(p_welcome_message_it), ''), nullif(trim(p_welcome_message_en), ''),
    now()
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
    welcome_message_it = excluded.welcome_message_it,
    welcome_message_en = excluded.welcome_message_en,
    updated_at = now()
  returning * into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_update_organization_branding(
  uuid, text, text, text, text, text, text, text, text, text, text
) from public;
grant execute on function public.admin_update_organization_branding(
  uuid, text, text, text, text, text, text, text, text, text, text
) to authenticated;
revoke execute on function public.admin_update_organization_branding(
  uuid, text, text, text, text, text, text, text, text, text, text
) from anon;
