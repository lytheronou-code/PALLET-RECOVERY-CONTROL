-- Operational sites (P1): a counterparty can have multiple physical
-- locations (plants, stores, hubs, depots, pickup points). Recording
-- where exposure physically sits is required before any future
-- geography-based recovery grouping -- this migration only adds the
-- master data and optional links, no route/grouping logic.
--
-- counterparty_id is nullable (a site can be the organization's own depot,
-- not tied to any counterparty) and uses the same tenant-scoped composite
-- FK pattern as the rest of the schema: a NULL counterparty_id skips FK
-- enforcement for that row (Postgres MATCH SIMPLE default), a non-null one
-- is still checked against (organization_id, id) so a site can never be
-- attached to another tenant's counterparty.

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  counterparty_id uuid,
  code text,
  name text not null,
  address_line text,
  postal_code text,
  city text,
  province text,
  country_code text not null default 'IT',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.sites
  add constraint sites_org_counterparty_fk
  foreign key (organization_id, counterparty_id)
  references public.counterparties (organization_id, id);

-- Needed so other tables can carry a tenant-scoped composite FK to a site.
alter table public.sites
  add constraint sites_org_id_key unique (organization_id, id);

create index idx_sites_org on public.sites(organization_id);
create index idx_sites_org_counterparty on public.sites(organization_id, counterparty_id);

alter table public.sites enable row level security;

create policy members_read_sites
on public.sites
for select
to authenticated
using (public.is_org_member(organization_id));

create policy operators_insert_sites
on public.sites
for insert
to authenticated
with check (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = sites.organization_id
      and m.user_id = (select auth.uid())
      and m.role in ('admin', 'operator')
  )
);

create policy operators_update_sites
on public.sites
for update
to authenticated
using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = sites.organization_id
      and m.user_id = (select auth.uid())
      and m.role in ('admin', 'operator')
  )
)
with check (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = sites.organization_id
      and m.user_id = (select auth.uid())
      and m.role in ('admin', 'operator')
  )
);

-- Optional origin/destination link. Nullable, tenant-scoped, no backfill
-- needed for existing rows.
alter table public.pallet_movements add column site_id uuid;
alter table public.pallet_movements
  add constraint pallet_movements_org_site_fk
  foreign key (organization_id, site_id)
  references public.sites (organization_id, id);
create index idx_movements_org_site on public.pallet_movements(organization_id, site_id);

alter table public.vouchers add column site_id uuid;
alter table public.vouchers
  add constraint vouchers_org_site_fk
  foreign key (organization_id, site_id)
  references public.sites (organization_id, id);
create index idx_vouchers_org_site on public.vouchers(organization_id, site_id);

alter table public.recovery_cases add column site_id uuid;
alter table public.recovery_cases
  add constraint recovery_cases_org_site_fk
  foreign key (organization_id, site_id)
  references public.sites (organization_id, id);
create index idx_recovery_cases_org_site on public.recovery_cases(organization_id, site_id);
