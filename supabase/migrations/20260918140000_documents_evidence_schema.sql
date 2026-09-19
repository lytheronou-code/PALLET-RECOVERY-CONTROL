-- Premium V3 M1: documents/evidence.
--
-- recovery_events never needed a tenant-scoped composite FK pointing AT it
-- before (only away from it, to recovery_cases); documents.recovery_event_id
-- is the first such reference, so the (organization_id, id) uniqueness the
-- pattern requires doesn't exist yet.
alter table public.recovery_events add constraint recovery_events_org_id_key unique (organization_id, id);

-- Every document always carries organization_id AND counterparty_id, even
-- when also linked to a more specific entity (movement/voucher/recovery
-- case/recovery event/site). This avoids ambiguous ownership: authorization
-- never has to walk through an optional link to find out which counterparty
-- a document belongs to, and it is what makes the future client-portal
-- visibility model (M2) tractable -- a client is always authorized by
-- counterparty_id, never by chasing through recovery_case_id -> counterparty.
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  counterparty_id uuid not null,
  site_id uuid,
  movement_id uuid,
  voucher_id uuid,
  recovery_case_id uuid,
  recovery_event_id uuid,
  document_type text not null check (document_type in (
    'ddt', 'voucher', 'voucher_scan', 'pickup_proof', 'delivery_proof',
    'pallet_photo', 'dispute_evidence', 'settlement_document', 'other'
  )),
  -- Deterministic, never-trusted-as-authorization path:
  -- {organization_id}/{counterparty_id}/{entity}/{entity_id}/{uuid}-{safe_filename}
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null check (mime_type in (
    'application/pdf', 'image/jpeg', 'image/png', 'image/webp'
  )),
  file_size bigint not null check (file_size > 0 and file_size <= 15728640),
  -- Audit evidence must not silently disappear: "deleting" a document is
  -- marking it superseded, never a physical delete (see the storage RLS
  -- migration -- there is intentionally no DELETE policy on storage.objects
  -- or on this table for any authenticated role in V1).
  status text not null default 'active' check (status in ('active', 'superseded')),
  -- Internal by default; an operator must explicitly mark a document
  -- shareable before the M2 client portal can ever see it.
  visibility text not null default 'internal' check (visibility in ('internal', 'client')),
  uploaded_by uuid references public.profiles(id),
  uploaded_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Needed so document_events can carry a tenant-scoped composite FK to it.
alter table public.documents add constraint documents_org_id_key unique (organization_id, id);

alter table public.documents
  add constraint documents_org_counterparty_fk
  foreign key (organization_id, counterparty_id)
  references public.counterparties (organization_id, id);

alter table public.documents
  add constraint documents_org_site_fk
  foreign key (organization_id, site_id)
  references public.sites (organization_id, id);

alter table public.documents
  add constraint documents_org_movement_fk
  foreign key (organization_id, movement_id)
  references public.pallet_movements (organization_id, id);

alter table public.documents
  add constraint documents_org_voucher_fk
  foreign key (organization_id, voucher_id)
  references public.vouchers (organization_id, id);

alter table public.documents
  add constraint documents_org_recovery_case_fk
  foreign key (organization_id, recovery_case_id)
  references public.recovery_cases (organization_id, id);

alter table public.documents
  add constraint documents_org_recovery_event_fk
  foreign key (organization_id, recovery_event_id)
  references public.recovery_events (organization_id, id);

create index idx_documents_org_counterparty on public.documents(organization_id, counterparty_id);
create index idx_documents_org_recovery_case on public.documents(organization_id, recovery_case_id);
create index idx_documents_org_voucher on public.documents(organization_id, voucher_id);
create index idx_documents_org_movement on public.documents(organization_id, movement_id);
create index idx_documents_org_visibility on public.documents(organization_id, visibility);

-- A movement/voucher/recovery_case/recovery_event optionally linked from a
-- document must belong to the SAME counterparty as the document, or a
-- document filed "for Counterparty A" could actually reference Counterparty
-- B's recovery case -- the exact "ambiguous ownership" class of bug the
-- site/counterparty consistency trigger closed for vouchers/recovery_cases
-- in the previous pass. recovery_events has no counterparty_id of its own,
-- so it's checked transitively through its recovery_case.
create or replace function public.validate_document_counterparty_match()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_linked_counterparty_id uuid;
begin
  if new.movement_id is not null then
    select counterparty_id into v_linked_counterparty_id
    from public.pallet_movements where id = new.movement_id;
    if v_linked_counterparty_id is distinct from new.counterparty_id then
      raise exception 'linked movement belongs to a different counterparty';
    end if;
  end if;

  if new.voucher_id is not null then
    select counterparty_id into v_linked_counterparty_id
    from public.vouchers where id = new.voucher_id;
    if v_linked_counterparty_id is distinct from new.counterparty_id then
      raise exception 'linked voucher belongs to a different counterparty';
    end if;
  end if;

  if new.recovery_case_id is not null then
    select counterparty_id into v_linked_counterparty_id
    from public.recovery_cases where id = new.recovery_case_id;
    if v_linked_counterparty_id is distinct from new.counterparty_id then
      raise exception 'linked recovery case belongs to a different counterparty';
    end if;
  end if;

  if new.recovery_event_id is not null then
    select rc.counterparty_id into v_linked_counterparty_id
    from public.recovery_events re
    join public.recovery_cases rc on rc.id = re.recovery_case_id
    where re.id = new.recovery_event_id;
    if v_linked_counterparty_id is distinct from new.counterparty_id then
      raise exception 'linked recovery event belongs to a different counterparty';
    end if;
  end if;

  if new.site_id is not null then
    select counterparty_id into v_linked_counterparty_id
    from public.sites where id = new.site_id;
    if v_linked_counterparty_id is not null and v_linked_counterparty_id is distinct from new.counterparty_id then
      raise exception 'linked site belongs to a different counterparty';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_document_counterparty_match on public.documents;
create trigger trg_validate_document_counterparty_match
before insert or update of counterparty_id, site_id, movement_id, voucher_id, recovery_case_id, recovery_event_id
on public.documents
for each row execute function public.validate_document_counterparty_match();

-- Everything except status/visibility/notes is immutable after upload
-- (same "identity is immutable" pattern as recovery_cases/vouchers). Status
-- and visibility changes must go through update_document_state() so every
-- change is paired with a document_events row -- see below.
create or replace function public.guard_document_update()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.organization_id is distinct from old.organization_id
     or new.counterparty_id is distinct from old.counterparty_id
     or new.site_id is distinct from old.site_id
     or new.movement_id is distinct from old.movement_id
     or new.voucher_id is distinct from old.voucher_id
     or new.recovery_case_id is distinct from old.recovery_case_id
     or new.recovery_event_id is distinct from old.recovery_event_id
     or new.document_type is distinct from old.document_type
     or new.storage_path is distinct from old.storage_path
     or new.original_filename is distinct from old.original_filename
     or new.mime_type is distinct from old.mime_type
     or new.file_size is distinct from old.file_size
     or new.uploaded_by is distinct from old.uploaded_by
     or new.uploaded_at is distinct from old.uploaded_at then
    raise exception 'document identity and file metadata are immutable';
  end if;

  if (new.status is distinct from old.status or new.visibility is distinct from old.visibility)
     and coalesce(current_setting('app.allow_document_state_update', true), '') <> 'on' then
    raise exception 'document status/visibility must be changed through update_document_state';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_document_update on public.documents;
create trigger trg_guard_document_update
before update on public.documents
for each row execute function public.guard_document_update();

alter table public.documents enable row level security;

create policy members_read_documents
on public.documents
for select
to authenticated
using (public.is_org_member(organization_id));

create policy operators_insert_documents
on public.documents
for insert
to authenticated
with check (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = documents.organization_id
      and m.user_id = (select auth.uid())
      and m.role in ('admin', 'operator')
  )
);

create policy operators_update_documents
on public.documents
for update
to authenticated
using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = documents.organization_id
      and m.user_id = (select auth.uid())
      and m.role in ('admin', 'operator')
  )
)
with check (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = documents.organization_id
      and m.user_id = (select auth.uid())
      and m.role in ('admin', 'operator')
  )
);
-- No DELETE policy: physical deletion of a document row is never allowed
-- for any authenticated role, matching the ledger/case/voucher philosophy
-- already established (append-only history, "delete" means "superseded").

-- Append-only audit trail, same shape as recovery_events: only
-- update_document_state() may insert, via the same app.allow_* session-flag
-- gate used throughout this schema.
create table public.document_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  document_id uuid not null,
  event_type text not null check (event_type in ('uploaded', 'visibility_changed', 'superseded', 'reactivated')),
  actor_user_id uuid references public.profiles(id),
  notes text,
  occurred_at timestamptz not null default now()
);

alter table public.document_events
  add constraint document_events_org_document_fk
  foreign key (organization_id, document_id)
  references public.documents (organization_id, id);

create index idx_document_events_org_document on public.document_events(organization_id, document_id);

alter table public.document_events enable row level security;

create policy members_read_document_events
on public.document_events
for select
to authenticated
using (public.is_org_member(organization_id));

create policy guarded_insert_document_events
on public.document_events
for insert
to authenticated
with check (coalesce(current_setting('app.allow_document_event_insert', true), '') = 'on');

-- Audit trigger explicitly authorizes its own event insert, same pattern
-- as audit_recovery_case_created.
create or replace function public.audit_document_uploaded()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform set_config('app.allow_document_event_insert', 'on', true);

  insert into public.document_events (organization_id, document_id, event_type, actor_user_id, occurred_at)
  values (new.organization_id, new.id, 'uploaded', auth.uid(), now());

  return new;
end;
$$;

revoke all on function public.audit_document_uploaded() from public, anon, authenticated;

drop trigger if exists trg_audit_document_uploaded on public.documents;
create trigger trg_audit_document_uploaded
after insert on public.documents
for each row execute function public.audit_document_uploaded();

-- SECURITY INVOKER, same rationale as record_recovery_event /
-- correct_pallet_movement: relies entirely on the caller's own RLS
-- (operators_update_documents requires admin/operator), this function adds
-- atomicity (status/visibility change + its audit event, or neither) and
-- the event-type mapping, not privilege.
create or replace function public.update_document_state(
  p_document_id uuid,
  p_new_status text default null,
  p_new_visibility text default null,
  p_notes text default null
)
returns public.documents
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_document public.documents;
  v_event_type text;
begin
  if p_new_status is not null and p_new_status not in ('active', 'superseded') then
    raise exception 'invalid status: %', p_new_status;
  end if;
  if p_new_visibility is not null and p_new_visibility not in ('internal', 'client') then
    raise exception 'invalid visibility: %', p_new_visibility;
  end if;
  if p_new_status is null and p_new_visibility is null then
    raise exception 'no change requested';
  end if;

  select * into v_document from public.documents where id = p_document_id;
  if not found then
    raise exception 'document not found or not accessible';
  end if;

  v_event_type := case
    when p_new_status is not null and p_new_status = 'superseded' and v_document.status <> 'superseded' then 'superseded'
    when p_new_status is not null and p_new_status = 'active' and v_document.status <> 'active' then 'reactivated'
    when p_new_visibility is not null and p_new_visibility is distinct from v_document.visibility then 'visibility_changed'
    else null
  end;

  perform set_config('app.allow_document_state_update', 'on', true);

  update public.documents
  set status = coalesce(p_new_status, status),
      visibility = coalesce(p_new_visibility, visibility),
      notes = coalesce(p_notes, notes),
      updated_at = now()
  where id = p_document_id
  returning * into v_document;

  if not found then
    raise exception 'update blocked: insufficient permissions for this organization';
  end if;

  if v_event_type is not null then
    perform set_config('app.allow_document_event_insert', 'on', true);
    insert into public.document_events (organization_id, document_id, event_type, actor_user_id, notes)
    values (v_document.organization_id, p_document_id, v_event_type, auth.uid(), p_notes);
  end if;

  return v_document;
end;
$$;

revoke all on function public.update_document_state(uuid, text, text, text) from public;
revoke execute on function public.update_document_state(uuid, text, text, text) from anon;
grant execute on function public.update_document_state(uuid, text, text, text) to authenticated;
