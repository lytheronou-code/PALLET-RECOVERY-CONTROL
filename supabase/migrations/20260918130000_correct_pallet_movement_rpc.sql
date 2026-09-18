-- Independent review finding: correctMovementAction previously inserted the
-- reversal and the corrected replacement as two separate Supabase calls
-- from the application layer. If the reversal succeeded and the
-- replacement insert failed (network blip, validation surprise), the
-- ledger was left with a dangling reversal and no replacement -- a
-- partially corrected state with no way to recover except a second manual
-- correction. It also had no protection against the same original
-- movement being corrected twice (two operators racing on the same bad
-- row), which would corrupt reconciliation by double-reversing it.
--
-- Fix: move the whole correction workflow into a single RPC that runs as
-- one Postgres transaction (atomic by construction: PL/pgSQL functions
-- execute inside the caller's transaction, so any exception rolls back
-- every insert made so far) and uses `select ... for update` to lock the
-- original row for the duration of the check-then-insert, which serializes
-- concurrent correction attempts against the *same* movement (they queue
-- on the lock; the second one re-reads post-commit state and sees the
-- correction that already happened).
--
-- correction_type distinguishes the two rows a correction can produce.
-- Every correction produces exactly one 'reversal' row; a non-reversal-only
-- correction additionally produces exactly one 'replacement' row. A
-- partial unique index on (correction_of_movement_id) where
-- correction_type = 'reversal' is the actual, DB-level double-correction
-- guard -- not just the RPC's own check -- so it also closes off a caller
-- who has plain INSERT privilege on pallet_movements and tries to forge a
-- second correction by inserting rows directly instead of going through
-- the RPC (see the guard_pallet_movement_correction_insert trigger below,
-- which is the first line of defense; the unique index is the backstop
-- that holds even if two RPC calls somehow both cleared that gate).
alter table public.pallet_movements
  add column correction_type text
  check (correction_type in ('reversal', 'replacement'));

alter table public.pallet_movements
  add constraint pallet_movements_correction_type_consistency
  check (
    (correction_of_movement_id is null and correction_type is null)
    or (correction_of_movement_id is not null and correction_type is not null)
  );

create unique index pallet_movements_one_reversal_per_original
  on public.pallet_movements (correction_of_movement_id)
  where correction_type = 'reversal';

-- Direct INSERTs with correction_of_movement_id set must go through
-- correct_pallet_movement(), which sets this session-local flag for the
-- duration of its own inserts (same pattern as
-- app.allow_recovery_state_update / app.allow_recovery_event_insert in
-- the enterprise-hardening migration). Ordinary, non-correction movement
-- inserts (correction_of_movement_id is null) are completely unaffected.
create or replace function public.guard_pallet_movement_correction_insert()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.correction_of_movement_id is not null
     and coalesce(current_setting('app.allow_movement_correction', true), '') <> 'on' then
    raise exception 'movement corrections must be created through correct_pallet_movement';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_pallet_movement_correction_insert on public.pallet_movements;
create trigger trg_guard_pallet_movement_correction_insert
before insert on public.pallet_movements
for each row execute function public.guard_pallet_movement_correction_insert();

-- SECURITY INVOKER, same as record_recovery_event: it relies entirely on
-- the caller's own RLS (operators_insert_movements requires admin/operator
-- role, so a viewer's call fails exactly as a direct insert would). This
-- function adds atomicity and the double-correction guard, not privilege.
create or replace function public.correct_pallet_movement(
  p_movement_id uuid,
  p_reason text,
  p_reversal_only boolean default false,
  p_movement_date date default null,
  p_direction text default null,
  p_quantity integer default null,
  p_document_type text default null,
  p_document_number text default null
)
returns table (reversal_id uuid, replacement_id uuid)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_original public.pallet_movements;
  v_reversal_id uuid;
  v_replacement_id uuid;
  v_already_corrected boolean;
begin
  if p_reason is null or length(trim(p_reason)) < 3 then
    raise exception 'a correction reason of at least 3 characters is required';
  end if;

  -- Locks the original row for the rest of this transaction: a second,
  -- concurrent call for the same p_movement_id blocks here until this one
  -- commits or rolls back, then re-evaluates the check below against the
  -- now-committed state instead of a stale snapshot.
  select * into v_original
  from public.pallet_movements
  where id = p_movement_id
  for update;

  if not found then
    raise exception 'movement not found or not accessible';
  end if;

  select exists (
    select 1 from public.pallet_movements
    where correction_of_movement_id = p_movement_id
      and correction_type = 'reversal'
  ) into v_already_corrected;

  if v_already_corrected then
    raise exception 'movement % has already been corrected', p_movement_id;
  end if;

  perform set_config('app.allow_movement_correction', 'on', true);

  insert into public.pallet_movements (
    organization_id, counterparty_id, pallet_type_id, site_id,
    movement_date, direction, quantity, document_type, document_number, voucher_number,
    notes, correction_of_movement_id, correction_type, correction_reason, created_by
  ) values (
    v_original.organization_id, v_original.counterparty_id, v_original.pallet_type_id, v_original.site_id,
    current_date,
    case v_original.direction when 'inbound' then 'outbound' else 'inbound' end,
    v_original.quantity, v_original.document_type, v_original.document_number, v_original.voucher_number,
    'Storno del movimento del ' || v_original.movement_date || '. Motivo: ' || p_reason,
    p_movement_id, 'reversal', p_reason, auth.uid()
  )
  returning id into v_reversal_id;

  if not p_reversal_only then
    if p_quantity is null or p_quantity <= 0 then
      raise exception 'quantity must be a positive integer';
    end if;
    if p_direction is null or p_direction not in ('inbound', 'outbound') then
      raise exception 'direction must be inbound or outbound';
    end if;

    insert into public.pallet_movements (
      organization_id, counterparty_id, pallet_type_id, site_id,
      movement_date, direction, quantity, document_type, document_number, voucher_number,
      notes, correction_of_movement_id, correction_type, correction_reason, created_by
    ) values (
      v_original.organization_id, v_original.counterparty_id, v_original.pallet_type_id, v_original.site_id,
      coalesce(p_movement_date, current_date), p_direction, p_quantity,
      coalesce(p_document_type, v_original.document_type),
      coalesce(p_document_number, v_original.document_number),
      v_original.voucher_number,
      'Sostituisce il movimento errato del ' || v_original.movement_date || '. Motivo: ' || p_reason,
      p_movement_id, 'replacement', p_reason, auth.uid()
    )
    returning id into v_replacement_id;
  end if;

  return query select v_reversal_id, v_replacement_id;
end;
$$;

revoke all on function public.correct_pallet_movement(uuid, text, boolean, date, text, integer, text, text) from public;
revoke execute on function public.correct_pallet_movement(uuid, text, boolean, date, text, integer, text, text) from anon;
grant execute on function public.correct_pallet_movement(uuid, text, boolean, date, text, integer, text, text) to authenticated;
