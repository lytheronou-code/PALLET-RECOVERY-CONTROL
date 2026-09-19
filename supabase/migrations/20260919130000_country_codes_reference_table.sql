-- Independent-review correction: country validation was a ~197-entry
-- curated subset (not the real ISO 3166-1 alpha-2 standard) enforced by
-- an array literal duplicated inside admin_update_organization_company,
-- with counterparties/sites having NO database-level country validation
-- at all (Zod only). This replaces both with one canonical reference
-- table that every table's country_code can be validated against --
-- "a small reference table... may be cleaner than maintaining a
-- 249-element array inside multiple function bodies."
--
-- This is read-only global reference data, not tenant data: RLS is
-- enabled with a SELECT policy for any authenticated user (every
-- organization needs to validate/display country codes) and
-- deliberately NO insert/update/delete policy, so no authenticated
-- user -- including an org admin -- can mutate it via PostgREST/RPC;
-- only a migration (running with elevated privileges) can.
create table public.country_codes (
  code text primary key check (code = upper(code) and length(code) = 2),
  is_iso boolean not null,
  enabled boolean not null default true
);

alter table public.country_codes enable row level security;

create policy read_country_codes
on public.country_codes
for select
to authenticated
using (true);

-- 249 officially assigned ISO 3166-1 alpha-2 codes (is_iso = true) --
-- kept in exact sync with src/lib/countries.ts's OFFICIAL_ISO_COUNTRY_CODES
-- (see countries.test.ts for the enforced TS/SQL parity check) -- plus
-- the one documented non-ISO product extension, XK/Kosovo (is_iso =
-- false; see src/lib/countries.ts for the rationale).
insert into public.country_codes (code, is_iso)
select code, true from unnest(array[
  'AD','AE','AF','AG','AI','AL','AM','AO','AQ','AR','AS','AT','AU','AW','AX','AZ',
  'BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR','BS','BT','BV','BW','BY','BZ',
  'CA','CC','CD','CF','CG','CH','CI','CK','CL','CM','CN','CO','CR','CU','CV','CW','CX','CY','CZ',
  'DE','DJ','DK','DM','DO','DZ',
  'EC','EE','EG','EH','ER','ES','ET',
  'FI','FJ','FK','FM','FO','FR',
  'GA','GB','GD','GE','GF','GG','GH','GI','GL','GM','GN','GP','GQ','GR','GS','GT','GU','GW','GY',
  'HK','HM','HN','HR','HT','HU',
  'ID','IE','IL','IM','IN','IO','IQ','IR','IS','IT',
  'JE','JM','JO','JP',
  'KE','KG','KH','KI','KM','KN','KP','KR','KW','KY','KZ',
  'LA','LB','LC','LI','LK','LR','LS','LT','LU','LV','LY',
  'MA','MC','MD','ME','MF','MG','MH','MK','ML','MM','MN','MO','MP','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ',
  'NA','NC','NE','NF','NG','NI','NL','NO','NP','NR','NU','NZ',
  'OM',
  'PA','PE','PF','PG','PH','PK','PL','PM','PN','PR','PS','PT','PW','PY',
  'QA',
  'RE','RO','RS','RU','RW',
  'SA','SB','SC','SD','SE','SG','SH','SI','SJ','SK','SL','SM','SN','SO','SR','SS','ST','SV','SX','SY','SZ',
  'TC','TD','TF','TG','TH','TJ','TK','TL','TM','TN','TO','TR','TT','TV','TW','TZ',
  'UA','UG','UM','US','UY','UZ',
  'VA','VC','VE','VG','VI','VN','VU',
  'WF','WS',
  'YE','YT',
  'ZA','ZM','ZW'
]) as code;

insert into public.country_codes (code, is_iso) values ('XK', false);

-- Defense in depth for organizations (writes only ever go through
-- admin_update_organization_company below, which now validates against
-- this same table) and the actual primary enforcement for
-- counterparties/sites, which write via direct table insert/update from
-- Server Actions with no RPC in front of them. NULL remains allowed
-- (organizations/sites country_code is nullable) -- a foreign key only
-- constrains non-null values.
alter table public.organizations
  add constraint organizations_country_code_fkey
  foreign key (country_code) references public.country_codes (code);

alter table public.counterparties
  add constraint counterparties_country_code_fkey
  foreign key (country_code) references public.country_codes (code);

alter table public.sites
  add constraint sites_country_code_fkey
  foreign key (country_code) references public.country_codes (code);

-- Re-create admin_update_organization_company without the embedded
-- country array: validates against country_codes instead, same
-- 'unsupported country code' exception text as before (mapped to a
-- friendly message client-side already, see src/lib/errors/friendly.ts),
-- so no caller-visible behavior change for a rejected code -- only the
-- accepted set widens from ~197 to the full 250 (249 ISO + XK).
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

  if v_country_code is not null and not exists (
    select 1 from public.country_codes where code = v_country_code
  ) then
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
