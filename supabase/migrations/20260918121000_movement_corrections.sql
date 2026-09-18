-- The movement ledger is immutable (no UPDATE policy on pallet_movements,
-- enforced since the enterprise-hardening migration). A wrong imported row
-- can therefore only be fixed by inserting new, linked rows: a reversal
-- (opposite direction, same quantity, same counterparty/pallet type) and,
-- optionally, a corrected replacement -- never by editing history.
--
-- correction_of_movement_id points at the original row being corrected;
-- it is nullable (ordinary movements don't reference anything) and
-- tenant-scoped via the same composite-FK pattern as the rest of the
-- schema, and self-referential so it must resolve to another row in
-- pallet_movements. No new write policy is needed: corrections are plain
-- INSERTs and already go through operators_insert_movements.

alter table public.pallet_movements add column correction_of_movement_id uuid;
alter table public.pallet_movements add column correction_reason text;

-- Needed so the self-referencing correction link can be tenant-scoped.
alter table public.pallet_movements
  add constraint pallet_movements_org_id_key unique (organization_id, id);

alter table public.pallet_movements
  add constraint pallet_movements_org_correction_fk
  foreign key (organization_id, correction_of_movement_id)
  references public.pallet_movements (organization_id, id);

create index idx_movements_org_correction
  on public.pallet_movements(organization_id, correction_of_movement_id);
