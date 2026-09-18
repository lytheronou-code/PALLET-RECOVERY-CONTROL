create index if not exists idx_movements_org_counterparty on public.pallet_movements(organization_id, counterparty_id);
create index if not exists idx_movements_org_pallet_type on public.pallet_movements(organization_id, pallet_type_id);
create index if not exists idx_movements_org_source_batch on public.pallet_movements(organization_id, source_batch_id);

create index if not exists idx_recovery_cases_org_counterparty on public.recovery_cases(organization_id, counterparty_id);
create index if not exists idx_recovery_cases_org_pallet_type on public.recovery_cases(organization_id, pallet_type_id);
create index if not exists idx_recovery_cases_org_voucher on public.recovery_cases(organization_id, voucher_id);

create index if not exists idx_recovery_events_org_case on public.recovery_events(organization_id, recovery_case_id);

create index if not exists idx_vouchers_org_counterparty on public.vouchers(organization_id, counterparty_id);
create index if not exists idx_vouchers_org_pallet_type on public.vouchers(organization_id, pallet_type_id);
create index if not exists idx_vouchers_org_source_batch on public.vouchers(organization_id, source_batch_id);
