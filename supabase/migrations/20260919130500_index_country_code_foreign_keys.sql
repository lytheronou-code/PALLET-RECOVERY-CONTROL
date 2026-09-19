-- Performance Advisor: the three country_code foreign keys added in
-- 20260919130000_country_codes_reference_table.sql have no covering
-- index. Cheap, low-cardinality (250 values) btree indexes close the
-- finding.
create index idx_organizations_country_code on public.organizations (country_code);
create index idx_counterparties_country_code on public.counterparties (country_code);
create index idx_sites_country_code on public.sites (country_code);
