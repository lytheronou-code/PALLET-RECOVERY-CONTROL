drop policy if exists operators_insert_recovery_events on public.recovery_events;

create policy operators_insert_recovery_events
on public.recovery_events
for insert
to authenticated
with check (
  coalesce((select current_setting('app.allow_recovery_event_insert', true)), '') = 'on'
  and exists (
    select 1
    from public.organization_members m
    where m.organization_id = recovery_events.organization_id
      and m.user_id = (select auth.uid())
      and m.role in ('admin','operator')
  )
);
