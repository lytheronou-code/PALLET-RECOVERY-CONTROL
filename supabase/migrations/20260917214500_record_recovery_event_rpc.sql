-- Threat model / why this needs to be a transaction:
-- Partial/full recovery events increment recovery_cases.quantity_recovered
-- based on its *current* value. Two concurrent recovery events on the same
-- case (e.g. two operators logging a pickup at the same time) computed and
-- written from the app layer as separate SELECT-then-UPDATE calls could
-- race: both read quantity_recovered=0, both compute new_recovered=5, and
-- the second UPDATE silently clobbers the first instead of summing them
-- (lost update / double counting risk called out in CLAUDE.md's M7 spec).
-- `SELECT ... FOR UPDATE` inside a single RPC call serializes concurrent
-- callers on the same case row, and the whole function body runs as one
-- Postgres transaction, so the case update and its audit event either both
-- land or neither does.
--
-- This is SECURITY INVOKER (not DEFINER): it relies entirely on the
-- existing RLS policies for recovery_cases/recovery_events, so a viewer
-- can still read/lock the row but the UPDATE/INSERT are blocked by RLS
-- exactly as they would be for a direct table write — this function adds
-- atomicity, not privilege.
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
begin
  if p_event_type not in (
    'contact_attempt', 'response', 'scheduled', 'pickup',
    'partial_recovery', 'full_recovery', 'dispute', 'note', 'closed'
  ) then
    raise exception 'invalid event_type: %', p_event_type;
  end if;

  select * into v_case from public.recovery_cases where id = p_case_id for update;
  if not found then
    raise exception 'recovery case not found or not accessible';
  end if;

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

    v_new_status := case when v_new_recovered = v_case.quantity_claimed then 'recovered' else 'partial' end;
  elsif p_event_type = 'contact_attempt' then
    if v_case.status = 'open' then
      v_new_status := 'contacted';
    end if;
  elsif p_event_type = 'scheduled' then
    v_new_status := 'scheduled';
  elsif p_event_type = 'dispute' then
    v_new_status := 'disputed';
  elsif p_event_type = 'closed' then
    v_new_status := 'closed_unrecovered';
  end if;
  -- 'response', 'pickup' and 'note' are logged without changing status.

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
  values (v_case.organization_id, p_case_id, p_event_type, p_quantity, p_notes, auth.uid(), p_occurred_at);

  return v_case;
end;
$$;

revoke all on function public.record_recovery_event(uuid, text, integer, text, timestamptz) from public;
revoke execute on function public.record_recovery_event(uuid, text, integer, text, timestamptz) from anon;
grant execute on function public.record_recovery_event(uuid, text, integer, text, timestamptz) to authenticated;
