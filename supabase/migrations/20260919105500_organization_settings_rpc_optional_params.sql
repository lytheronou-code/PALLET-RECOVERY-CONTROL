-- Supabase's TypeScript generator infers a plain PL/pgSQL text parameter
-- as a required, non-nullable `string` -- it has no way to know the
-- function body treats a NULL input as meaningful ("leave this field
-- unchanged" / "clear this field"). Every other optional RPC parameter in
-- this codebase (see update_document_state, record_recovery_event) is
-- declared with a SQL DEFAULT so the generator marks it optional; these
-- three functions were written without that, so the generated Args type
-- (string, not string | undefined) didn't match how the application
-- actually calls them. CREATE OR REPLACE with added defaults keeps the
-- exact same signature (same parameter types/order/count), so this is a
-- safe redefinition, not a breaking one -- existing callers that always
-- passed every argument keep working identically.
create or replace function public.admin_update_organization_company(
  p_organization_id uuid,
  p_legal_name text default null,
  p_trading_name text default null,
  p_country_code text default null,
  p_tax_id text default null,
  p_vat_id text default null,
  p_registration_number text default null,
  p_address_line_1 text default null,
  p_address_line_2 text default null,
  p_city text default null,
  p_region text default null,
  p_postal_code text default null,
  p_website text default null,
  p_support_email text default null,
  p_support_phone text default null
)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.organizations;
  v_country_code text := upper(nullif(trim(p_country_code), ''));
begin
  if not exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
      and m.role = 'admin'
  ) then
    raise exception 'insufficient privileges';
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
    support_phone = nullif(trim(p_support_phone), '')
  where id = p_organization_id
  returning * into v_result;

  if v_result.id is null then
    raise exception 'organization not found';
  end if;

  return v_result;
end;
$$;

create or replace function public.admin_update_organization_localization(
  p_organization_id uuid,
  p_default_locale text default null,
  p_default_currency text default null,
  p_timezone text default null
)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.organizations;
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

  if p_default_locale is null or p_default_locale not in ('en', 'it') then
    raise exception 'unsupported locale';
  end if;

  if v_currency is null or v_currency <> any (array[
    'EUR','USD','GBP','CHF','SEK','NOK','DKK','PLN','CZK','HUF','RON',
    'CAD','AUD','NZD','JPY','CNY','INR','BRL','MXN','ZAR','AED','SAR',
    'SGD','HKD','TRY'
  ]) then
    raise exception 'unsupported currency';
  end if;

  if p_timezone is null or not exists (
    select 1 from pg_timezone_names where name = p_timezone
  ) then
    raise exception 'unknown timezone';
  end if;

  update public.organizations set
    default_locale = p_default_locale,
    default_currency = v_currency,
    timezone = p_timezone
  where id = p_organization_id
  returning * into v_result;

  if v_result.id is null then
    raise exception 'organization not found';
  end if;

  return v_result;
end;
$$;

create or replace function public.admin_update_organization_branding(
  p_organization_id uuid,
  p_portal_name text default null,
  p_logo_path text default null,
  p_compact_logo_path text default null,
  p_primary_color text default null,
  p_secondary_color text default null,
  p_support_email text default null,
  p_support_phone text default null,
  p_website text default null,
  p_welcome_message_it text default null,
  p_welcome_message_en text default null
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
