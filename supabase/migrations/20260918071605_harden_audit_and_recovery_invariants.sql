
-- Enterprise integrity hardening: preserve operational history and make
-- recovery/voucher state transitions authoritative at database level.

-- 1) A linked recovery case must refer to the exact voucher context.
alter table public.vouchers
  add constraint vouchers_org_id_counterparty_pallet_key
  unique (organization_id, id, counterparty_id, pallet_type_id);

alter table public.recovery_cases
  drop constraint if exists recovery_cases_org_voucher_fk;

alter table public.recovery_cases
  drop constraint if exists recovery_cases_voucher_id_fkey;

alter table public.recovery_cases
  add constraint recovery_cases_org_voucher_context_fk
  foreign key (organization_id, voucher_id, counterparty_id, pallet_type_id)
  references public.vouchers (organization_id, id, counterparty_id, pallet_type_id)
  on delete restrict;

create index if not exists idx_recovery_cases_org_voucher_context
  on public.recovery_cases(organization_id, voucher_id, counterparty_id, pallet_type_id);

create unique index if not exists uq_recovery_cases_one_active_per_voucher
  on public.recovery_cases(organization_id, voucher_id)
  where voucher_id is not null
    and status in ('open','contacted','scheduled','partial','disputed');

-- 2) New recovery cases always start clean and snapshot pallet value server-side.
create or replace function public.validate_recovery_case_insert()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_unit_value numeric(12,2);
  v_voucher public.vouchers;
begin
  if new.status <> 'open' or new.quantity_recovered <> 0 then
    raise exception 'new recovery case must start open with zero recovered quantity';
  end if;

  select unit_value into v_unit_value
  from public.pallet_types
  where id = new.pallet_type_id
    and organization_id = new.organization_id;

  if not found then
    raise exception 'pallet type not found in organization';
  end if;

  new.unit_value_snapshot := v_unit_value;

  if new.assignee_user_id is not null and not exists (
    select 1
    from public.organization_members m
    where m.organization_id = new.organization_id
      and m.user_id = new.assignee_user_id
  ) then
    raise exception 'assignee must be a member of the organization';
  end if;

  if new.voucher_id is not null then
    select * into v_voucher
    from public.vouchers
    where id = new.voucher_id
      and organization_id = new.organization_id;

    if not found then
      raise exception 'linked voucher not found in organization';
    end if;

    if v_voucher.counterparty_id <> new.counterparty_id
       or v_voucher.pallet_type_id <> new.pallet_type_id then
      raise exception 'recovery case must match voucher counterparty and pallet type';
    end if;

    if v_voucher.status in ('closed','cancelled') then
      raise exception 'closed or cancelled voucher cannot open a recovery case';
    end if;

    if new.quantity_claimed > (v_voucher.quantity - v_voucher.recovered_quantity) then
      raise exception 'recovery case quantity exceeds voucher outstanding quantity';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_recovery_case_insert on public.recovery_cases;
create trigger trg_validate_recovery_case_insert
before insert on public.recovery_cases
for each row execute function public.validate_recovery_case_insert();

-- 3) Case identity/value is immutable after creation; state transitions go through RPC.
create or replace function public.guard_recovery_case_update()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.organization_id is distinct from old.organization_id
     or new.counterparty_id is distinct from old.counterparty_id
     or new.pallet_type_id is distinct from old.pallet_type_id
     or new.voucher_id is distinct from old.voucher_id
     or new.reference is distinct from old.reference
     or new.opened_at is distinct from old.opened_at
     or new.quantity_claimed is distinct from old.quantity_claimed
     or new.unit_value_snapshot is distinct from old.unit_value_snapshot then
    raise exception 'recovery case identity and value snapshot are immutable';
  end if;

  if new.assignee_user_id is distinct from old.assignee_user_id
     and new.assignee_user_id is not null
     and not exists (
       select 1
       from public.organization_members m
       where m.organization_id = new.organization_id
         and m.user_id = new.assignee_user_id
     ) then
    raise exception 'assignee must be a member of the organization';
  end if;

  if (
    new.quantity_recovered is distinct from old.quantity_recovered
    or new.status is distinct from old.status
  ) and coalesce(current_setting('app.allow_recovery_state_update', true), '') <> 'on' then
    raise exception 'recovery quantity/status must be changed through record_recovery_event';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_recovery_case_update on public.recovery_cases;
create trigger trg_guard_recovery_case_update
before update on public.recovery_cases
for each row execute function public.guard_recovery_case_update();

-- 4) Voucher recovery counters are controlled by the recovery RPC.
create or replace function public.guard_voucher_mutation()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_active_case_outstanding integer;
begin
  if tg_op = 'INSERT' then
    if new.recovered_quantity <> 0 or new.status <> 'open' then
      raise exception 'new voucher must start open with zero recovered quantity';
    end if;
    return new;
  end if;

  if new.organization_id is distinct from old.organization_id
     or new.counterparty_id is distinct from old.counterparty_id
     or new.pallet_type_id is distinct from old.pallet_type_id
     or new.source_batch_id is distinct from old.source_batch_id then
    raise exception 'voucher organization, counterparty, pallet type and source batch are immutable';
  end if;

  if new.recovered_quantity is distinct from old.recovered_quantity
     and coalesce(current_setting('app.allow_voucher_recovery_update', true), '') <> 'on' then
    raise exception 'voucher recovered quantity must be changed through recovery workflow';
  end if;

  if new.quantity is distinct from old.quantity then
    select coalesce(sum(quantity_claimed - quantity_recovered), 0)::integer
      into v_active_case_outstanding
    from public.recovery_cases
    where organization_id = new.organization_id
      and voucher_id = new.id
      and status in ('open','contacted','scheduled','partial','disputed');

    if v_active_case_outstanding > (new.quantity - new.recovered_quantity) then
      raise exception 'voucher quantity cannot be lower than outstanding linked recovery commitments';
    end if;
  end if;

  if new.status = 'open' and new.recovered_quantity <> 0 then
    raise exception 'open voucher must have zero recovered quantity';
  end if;

  if new.status = 'partial'
     and not (new.recovered_quantity > 0 and new.recovered_quantity < new.quantity) then
    raise exception 'partial voucher requires recovered quantity between zero and total quantity';
  end if;

  if new.status = 'closed' and new.recovered_quantity <> new.quantity then
    raise exception 'closed voucher requires full recovered quantity';
  end if;

  if new.status = 'cancelled' then
    if new.recovered_quantity <> 0 then
      raise exception 'voucher with recoveries cannot be cancelled';
    end if;
    if exists (
      select 1 from public.recovery_cases c
      where c.organization_id = new.organization_id
        and c.voucher_id = new.id
    ) then
      raise exception 'voucher linked to recovery cases cannot be cancelled';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_voucher_mutation on public.vouchers;
create trigger trg_guard_voucher_mutation
before insert or update on public.vouchers
for each row execute function public.guard_voucher_mutation();

-- 5) Recovery events are append-only and can only be inserted by the audited workflow.
drop policy if exists operators_insert_recovery_events on public.recovery_events;
drop policy if exists operators_update_recovery_events on public.recovery_events;
drop policy if exists admins_delete_recovery_events on public.recovery_events;

create policy operators_insert_recovery_events
on public.recovery_events
for insert
to authenticated
with check (
  coalesce(current_setting('app.allow_recovery_event_insert', true), '') = 'on'
  and exists (
    select 1 from public.organization_members m
    where m.organization_id = recovery_events.organization_id
      and m.user_id = (select auth.uid())
      and m.role in ('admin','operator')
  )
);

-- Pallet movements are an immutable ledger. Corrections must be additive/reversal based.
drop policy if exists operators_update_movements on public.pallet_movements;

-- No authenticated hard-delete of operational/master history.
drop policy if exists admins_delete_counterparties on public.counterparties;
drop policy if exists admins_delete_pallet_types on public.pallet_types;
drop policy if exists admins_delete_import_batches on public.import_batches;
drop policy if exists admins_delete_movements on public.pallet_movements;
drop policy if exists admins_delete_vouchers on public.vouchers;
drop policy if exists admins_delete_recovery_cases on public.recovery_cases;

-- 6) Audit trigger explicitly authorizes its own event insert.
create or replace function public.audit_recovery_case_created()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform set_config('app.allow_recovery_event_insert', 'on', true);

  insert into public.recovery_events (
    organization_id,
    recovery_case_id,
    event_type,
    actor_user_id,
    occurred_at
  )
  values (
    new.organization_id,
    new.id,
    'created',
    auth.uid(),
    now()
  );

  return new;
end;
$$;

-- 7) Recovery RPC is the only state transition path for case/voucher recovery state.
create or replace function public.record_recovery_event(
  p_case_id uuid,
  p_event_type text,
  p_quantity integer default null,
  p_notes text default null,
  p_occurred_at timestamptz default now()
)
returns public.recovery_cases
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_case public.recovery_cases;
  v_new_recovered integer;
  v_new_status text;
  v_voucher public.vouchers;
  v_voucher_recovered integer;
begin
  if p_event_type not in (
    'contact_attempt', 'response', 'scheduled', 'pickup',
    'partial_recovery', 'full_recovery', 'dispute', 'note', 'closed'
  ) then
    raise exception 'invalid event_type: %', p_event_type;
  end if;

  select * into v_case
  from public.recovery_cases
  where id = p_case_id
  for update;

  if not found then
    raise exception 'recovery case not found or not accessible';
  end if;

  if v_case.status in ('recovered', 'closed_unrecovered', 'cancelled')
     and p_event_type <> 'note' then
    raise exception 'closed recovery case only accepts note events';
  end if;

  perform set_config('app.allow_recovery_state_update', 'on', true);
  perform set_config('app.allow_voucher_recovery_update', 'on', true);
  perform set_config('app.allow_recovery_event_insert', 'on', true);

  v_new_recovered := v_case.quantity_recovered;
  v_new_status := v_case.status;

  if p_event_type in ('partial_recovery', 'full_recovery') then
    if p_quantity is null or p_quantity <= 0 then
      raise exception 'quantity must be a positive integer for % events', p_event_type;
    end if;

    v_new_recovered := v_case.quantity_recovered + p_quantity;
    if v_new_recovered > v_case.quantity_claimed then
      raise exception 'recovered quantity (%) would exceed claimed quantity (%)', v_new_recovered, v_case.quantity_claimed;
    end if;

    if p_event_type = 'full_recovery' and v_new_recovered <> v_case.quantity_claimed then
      raise exception 'full_recovery quantity must equal remaining quantity';
    end if;

    if v_case.voucher_id is not null then
      select * into v_voucher
      from public.vouchers
      where id = v_case.voucher_id
        and organization_id = v_case.organization_id
      for update;

      if not found then
        raise exception 'linked voucher not found or not accessible';
      end if;

      v_voucher_recovered := v_voucher.recovered_quantity + p_quantity;
      if v_voucher_recovered > v_voucher.quantity then
        raise exception 'voucher recovered quantity (%) would exceed voucher quantity (%)', v_voucher_recovered, v_voucher.quantity;
      end if;

      update public.vouchers
      set recovered_quantity = v_voucher_recovered,
          status = case when v_voucher_recovered = v_voucher.quantity then 'closed' else 'partial' end
      where id = v_voucher.id;
    end if;

    v_new_status := case
      when v_new_recovered = v_case.quantity_claimed then 'recovered'
      else 'partial'
    end;
  elsif p_event_type = 'contact_attempt' then
    if v_case.status = 'open' then v_new_status := 'contacted'; end if;
  elsif p_event_type = 'scheduled' then
    v_new_status := 'scheduled';
  elsif p_event_type = 'dispute' then
    v_new_status := 'disputed';
    if v_case.voucher_id is not null then
      update public.vouchers
      set status = 'disputed'
      where id = v_case.voucher_id
        and organization_id = v_case.organization_id
        and status <> 'closed';
    end if;
  elsif p_event_type = 'closed' then
    v_new_status := 'closed_unrecovered';
  end if;

  update public.recovery_cases
  set quantity_recovered = v_new_recovered,
      status = v_new_status,
      updated_at = now()
  where id = p_case_id
  returning * into v_case;

  if not found then
    raise exception 'update blocked: insufficient permissions for this organization';
  end if;

  insert into public.recovery_events (
    organization_id, recovery_case_id, event_type, quantity, notes, actor_user_id, occurred_at
  )
  values (
    v_case.organization_id, p_case_id, p_event_type, p_quantity, p_notes, auth.uid(), p_occurred_at
  );

  return v_case;
end;
$$;

revoke all on function public.record_recovery_event(uuid, text, integer, text, timestamptz) from public;
revoke execute on function public.record_recovery_event(uuid, text, integer, text, timestamptz) from anon;
grant execute on function public.record_recovery_event(uuid, text, integer, text, timestamptz) to authenticated;

revoke all on function public.validate_recovery_case_insert() from public, anon, authenticated;
revoke all on function public.guard_recovery_case_update() from public, anon, authenticated;
revoke all on function public.guard_voucher_mutation() from public, anon, authenticated;
