alter table public.counterparties
  add constraint counterparties_org_id_id_key unique (organization_id, id);
alter table public.pallet_types
  add constraint pallet_types_org_id_id_key unique (organization_id, id);
alter table public.import_batches
  add constraint import_batches_org_id_id_key unique (organization_id, id);
alter table public.vouchers
  add constraint vouchers_org_id_id_key unique (organization_id, id);
alter table public.recovery_cases
  add constraint recovery_cases_org_id_id_key unique (organization_id, id);

alter table public.pallet_movements
  add constraint pallet_movements_org_counterparty_fk
    foreign key (organization_id, counterparty_id)
    references public.counterparties (organization_id, id),
  add constraint pallet_movements_org_pallet_type_fk
    foreign key (organization_id, pallet_type_id)
    references public.pallet_types (organization_id, id),
  add constraint pallet_movements_org_source_batch_fk
    foreign key (organization_id, source_batch_id)
    references public.import_batches (organization_id, id);

alter table public.vouchers
  add constraint vouchers_org_counterparty_fk
    foreign key (organization_id, counterparty_id)
    references public.counterparties (organization_id, id),
  add constraint vouchers_org_pallet_type_fk
    foreign key (organization_id, pallet_type_id)
    references public.pallet_types (organization_id, id),
  add constraint vouchers_org_source_batch_fk
    foreign key (organization_id, source_batch_id)
    references public.import_batches (organization_id, id);

alter table public.recovery_cases
  add constraint recovery_cases_org_counterparty_fk
    foreign key (organization_id, counterparty_id)
    references public.counterparties (organization_id, id),
  add constraint recovery_cases_org_pallet_type_fk
    foreign key (organization_id, pallet_type_id)
    references public.pallet_types (organization_id, id),
  add constraint recovery_cases_org_voucher_fk
    foreign key (organization_id, voucher_id)
    references public.vouchers (organization_id, id);

alter table public.recovery_events
  add constraint recovery_events_org_case_fk
    foreign key (organization_id, recovery_case_id)
    references public.recovery_cases (organization_id, id);
