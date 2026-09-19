-- Additive follow-up to 20260918140000_documents_evidence_schema.sql: closes
-- the two new findings the Performance Advisor reported after that
-- migration (unindexed foreign keys + a per-row current_setting() call in
-- an RLS policy). No behavior change, no data change.

create index if not exists idx_documents_org_site on public.documents (organization_id, site_id);
create index if not exists idx_documents_org_recovery_event on public.documents (organization_id, recovery_event_id);
create index if not exists idx_documents_uploaded_by on public.documents (uploaded_by);
create index if not exists idx_document_events_actor_user_id on public.document_events (actor_user_id);

-- Wrap current_setting() in a scalar subselect so Postgres evaluates it once
-- per statement instead of once per row (same fix pattern already applied
-- to auth.<function>() calls elsewhere in this schema).
drop policy if exists guarded_insert_document_events on public.document_events;
create policy guarded_insert_document_events on public.document_events
  for insert
  with check (
    coalesce((select current_setting('app.allow_document_event_insert', true)), '') = 'on'
  );
