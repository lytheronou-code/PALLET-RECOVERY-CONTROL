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

  select * into v_case from public.recovery_cases where id = p_case_id for update;
  if not found then raise exception 'recovery case not found or not accessible'; end if;

  if v_case.status in ('recovered', 'closed_unrecovered', 'cancelled') and p_event_type <> 'note' then
    raise exception 'closed recovery case only accepts note events';
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
    if p_event_type = 'full_recovery' and v_new_recovered <> v_case.quantity_claimed then
      raise exception 'full_recovery quantity must equal remaining quantity';
    end if;

    if v_case.voucher_id is not null then
      select * into v_voucher
      from public.vouchers
      where id = v_case.voucher_id and organization_id = v_case.organization_id
      for update;

      if not found then raise exception 'linked voucher not found or not accessible'; end if;

      v_voucher_recovered := v_voucher.recovered_quantity + p_quantity;
      if v_voucher_recovered > v_voucher.quantity then
        raise exception 'voucher recovered quantity (%) would exceed voucher quantity (%)', v_voucher_recovered, v_voucher.quantity;
      end if;

      update public.vouchers
      set recovered_quantity = v_voucher_recovered,
          status = case when v_voucher_recovered = v_voucher.quantity then 'closed' else 'partial' end
      where id = v_voucher.id;
    end if;

    v_new_status := case when v_new_recovered = v_case.quantity_claimed then 'recovered' else 'partial' end;
  elsif p_event_type = 'contact_attempt' then
    if v_case.status = 'open' then v_new_status := 'contacted'; end if;
  elsif p_event_type = 'scheduled' then
    v_new_status := 'scheduled';
  elsif p_event_type = 'dispute' then
    v_new_status := 'disputed';
    if v_case.voucher_id is not null then
      update public.vouchers
      set status = 'disputed'
      where id = v_case.voucher_id and organization_id = v_case.organization_id and status <> 'closed';
    end if;
  elsif p_event_type = 'closed' then
    v_new_status := 'closed_unrecovered';
  end if;

  update public.recovery_cases
  set quantity_recovered = v_new_recovered, status = v_new_status, updated_at = now()
  where id = p_case_id
  returning * into v_case;

  if not found then raise exception 'update blocked: insufficient permissions for this organization'; end if;

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
