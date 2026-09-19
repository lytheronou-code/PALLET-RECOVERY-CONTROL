-- Bug found by this pass's own adversarial QA (a "positive control" check
-- that a legitimate admin_update_organization_company('IT') call should
-- succeed -- it didn't): `v_country_code <> any(array[...])` is true as
-- soon as the value differs from AT LEAST ONE array element, which is
-- true for almost any input regardless of membership -- it is not the
-- SQL spelling of "not in this list". The correct check is `<> all(...)`
-- (true only when the value differs from every element, i.e. is absent
-- from the list), or equivalently `not (x = any(...))`. As shipped, every
-- call to admin_update_organization_company with a non-null country_code
-- and every call to admin_update_organization_localization with a
-- non-null currency raised "unsupported country code"/"unsupported
-- currency" regardless of the value's actual validity -- both RPCs have
-- never actually accepted a country/currency since they were created.
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

  if v_country_code is not null and v_country_code <> all (array[
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

  if v_currency is null or v_currency <> all (array[
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
