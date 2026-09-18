-- Independent review finding: sites.organization_id + site_id FKs on
-- vouchers/recovery_cases/pallet_movements only proved the site belongs to
-- the same tenant, not to the same counterparty as the row referencing it.
-- A voucher for Counterparty A could carry a site_id belonging to
-- Counterparty B in the same organization, silently corrupting
-- location-level reporting and, eventually, recovery routing.
--
-- Decision on the three tables (documented so the rule is never
-- ambiguous, per the review's explicit request):
--
-- - vouchers, recovery_cases: site_id must belong to the SAME counterparty
--   as the row (site.counterparty_id = row.counterparty_id). Both are
--   customer-facing records -- a voucher/case's site is "where this
--   counterparty's pallets are", so an organization-owned depot
--   (site.counterparty_id is null) is never a valid choice here. That is
--   reserved for future recovery planning, not customer location tracking.
-- - pallet_movements: a movement can legitimately touch the
--   organization's own depot in transit (goods arriving at/leaving the
--   org's warehouse before redistribution), so site.counterparty_id is
--   null is explicitly ALLOWED here. But when the site IS tied to a
--   counterparty, it must still match the movement's own counterparty_id
--   -- the same cross-counterparty leak is just as wrong on a movement.
--
-- A composite FK cannot express "match this other row's counterparty_id
-- through a third table", so this is a trigger, not a constraint.
create or replace function public.validate_voucher_recovery_site_match()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_site_counterparty_id uuid;
  v_site_found boolean;
begin
  if new.site_id is null then
    return new;
  end if;

  select counterparty_id, true into v_site_counterparty_id, v_site_found
  from public.sites
  where id = new.site_id and organization_id = new.organization_id;

  if not v_site_found then
    raise exception 'site not found in this organization';
  end if;

  if v_site_counterparty_id is null or v_site_counterparty_id is distinct from new.counterparty_id then
    raise exception 'site must belong to the same counterparty as this record';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_voucher_site_match on public.vouchers;
create trigger trg_validate_voucher_site_match
before insert or update of site_id, counterparty_id on public.vouchers
for each row execute function public.validate_voucher_recovery_site_match();

drop trigger if exists trg_validate_recovery_case_site_match on public.recovery_cases;
create trigger trg_validate_recovery_case_site_match
before insert or update of site_id, counterparty_id on public.recovery_cases
for each row execute function public.validate_voucher_recovery_site_match();

-- Movements: same check, but a null site.counterparty_id (an
-- organization-owned depot) is explicitly allowed.
create or replace function public.validate_movement_site_match()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_site_counterparty_id uuid;
  v_site_found boolean;
begin
  if new.site_id is null then
    return new;
  end if;

  select counterparty_id, true into v_site_counterparty_id, v_site_found
  from public.sites
  where id = new.site_id and organization_id = new.organization_id;

  if not v_site_found then
    raise exception 'site not found in this organization';
  end if;

  if v_site_counterparty_id is not null and v_site_counterparty_id is distinct from new.counterparty_id then
    raise exception 'site must belong to the same counterparty as this movement, or be an organization-owned depot';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_movement_site_match on public.pallet_movements;
create trigger trg_validate_movement_site_match
before insert on public.pallet_movements
for each row execute function public.validate_movement_site_match();
