create or replace function public.audit_recovery_case_created()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
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

revoke all on function public.audit_recovery_case_created() from public;
revoke execute on function public.audit_recovery_case_created() from anon;
revoke execute on function public.audit_recovery_case_created() from authenticated;

drop trigger if exists trg_audit_recovery_case_created on public.recovery_cases;
create trigger trg_audit_recovery_case_created
after insert on public.recovery_cases
for each row
execute function public.audit_recovery_case_created();
