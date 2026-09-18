-- Bug found by this pass's own adversarial testing (not by the reviewer):
-- correct_pallet_movement's `select ... for update` on pallet_movements
-- never returned a row, for ANY caller including an org admin, making the
-- entire correction feature non-functional. Root cause: Postgres RLS
-- requires the executing role to satisfy an applicable UPDATE (or DELETE)
-- policy to acquire a FOR UPDATE/FOR SHARE lock via SELECT, independent of
-- the SELECT policy that already let the row through
-- (https://www.postgresql.org/docs/current/rowsecurity.html -- "SELECT
-- FOR UPDATE and FOR SHARE" requires the same additional per-command
-- policies as an actual UPDATE would). pallet_movements has zero UPDATE
-- policies for any role by design (the ledger is fully immutable), so
-- that check can never pass -- confirmed by directly comparing FOR UPDATE
-- on pallet_movements (0 rows for an org admin) against the identical
-- query on recovery_cases, which does have an admin/operator UPDATE
-- policy (1 row, as expected).
--
-- Fix: replace the row lock with a transaction-scoped advisory lock keyed
-- by the movement id (hashtextextended -> bigint). Advisory locks are not
-- subject to RLS at all, so this restores the "serialize concurrent
-- correction attempts against the same movement" property this function
-- was built for, without requiring any UPDATE privilege on an
-- intentionally immutable table. Released automatically at commit or
-- rollback, same lifetime as the row lock it replaces. The partial unique
-- index from the original migration (one 'reversal' row per
-- correction_of_movement_id) remains the independent, always-enforced
-- backstop against a forged direct INSERT bypassing this function
-- entirely -- unaffected by this fix.
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

  perform pg_advisory_xact_lock(hashtextextended(p_movement_id::text, 0));

  select * into v_original
  from public.pallet_movements
  where id = p_movement_id;

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
