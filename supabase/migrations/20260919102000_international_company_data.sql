-- Premium V4 M3: international company data foundation.
--
-- All new columns are nullable/additive with no backfill required:
--   - organizations has no company-profile columns at all yet (verified:
--     zero existing rows in this database), so there is nothing to break
--     and nothing to migrate.
--   - counterparties/sites already store an address (address_line, city,
--     postal_code, province, country_code) with no CHECK constraint
--     tying country_code to Italy specifically -- the schema itself never
--     assumed Italy, only the UI/forms did (fixed in the same commit).
--     address_line is kept as-is (it already serves as "address line 1")
--     rather than renamed, to avoid an invasive rename across every
--     consumer (forms, CSV import/export, data layer); only the new,
--     optional address_line_2 is added.
--
-- trading_name/tax_id/registration_number are new because the existing
-- schema only had vat_number (already optional, already serves as the
-- international "vat_id" concept -- not renamed for the same reason).

alter table public.organizations
  add column legal_name text,
  add column trading_name text,
  add column country_code text,
  add column tax_id text,
  add column vat_id text,
  add column registration_number text,
  add column address_line_1 text,
  add column address_line_2 text,
  add column city text,
  add column region text,
  add column postal_code text,
  add column website text,
  add column support_email text,
  add column support_phone text;

alter table public.counterparties
  add column trading_name text,
  add column tax_id text,
  add column registration_number text,
  add column address_line_2 text;

alter table public.sites
  add column address_line_2 text;
