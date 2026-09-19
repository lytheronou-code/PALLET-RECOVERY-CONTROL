-- M2: Client Portal. Additive only -- does not alter any P1/M1 table or
-- policy. Client portal users are never added to organization_members and
-- never gain any RLS-level access to recovery_cases / pallet_movements /
-- vouchers / documents: every client-facing read goes through a dedicated
-- SECURITY DEFINER "portal_*" function that does its own membership check
-- and returns only an explicit, client-safe column list. RLS is row-level
-- only (it cannot hide a column), so granting the client role a SELECT
-- policy directly on those tables would let a client bypass the app and
-- pull internal columns (assignee_user_id, notes, ...) straight from
-- PostgREST -- these functions exist specifically to avoid that.

create table public.client_portal_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  counterparty_id uuid not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'client_viewer' check (role = 'client_viewer'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, counterparty_id, user_id),
  constraint client_portal_memberships_org_counterparty_fk
    foreign key (organization_id, counterparty_id)
    references public.counterparties (organization_id, id)
);

create index idx_client_portal_memberships_user on public.client_portal_memberships (user_id) where active;
create index idx_client_portal_memberships_org_counterparty on public.client_portal_memberships (organization_id, counterparty_id);

alter table public.client_portal_memberships enable row level security;

-- A client can only ever read their own membership row(s) (used by the
-- portal shell to resolve org/counterparty context and for routing).
create policy self_read_client_portal_membership on public.client_portal_memberships
  for select
  using (user_id = (select auth.uid()));

-- Only internal admin/operator of the SAME organization can grant/manage
-- portal access -- a client can never self-provision or self-escalate.
create policy operators_manage_client_portal_memberships on public.client_portal_memberships
  for all
  using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = client_portal_memberships.organization_id
        and m.user_id = (select auth.uid())
        and m.role in ('admin', 'operator')
    )
  )
  with check (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = client_portal_memberships.organization_id
        and m.user_id = (select auth.uid())
        and m.role in ('admin', 'operator')
    )
  );

-- SECURITY DEFINER (like is_org_member): called from RLS policies and from
-- every portal_* function below, so it must see membership rows regardless
-- of the caller's own RLS visibility.
create or replace function public.is_client_portal_member(p_organization_id uuid, p_counterparty_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.client_portal_memberships m
    where m.organization_id = p_organization_id
      and m.counterparty_id = p_counterparty_id
      and m.user_id = auth.uid()
      and m.active
  );
$$;

revoke all on function public.is_client_portal_member(uuid, uuid) from public;
grant execute on function public.is_client_portal_member(uuid, uuid) to authenticated;

-- Portal shell entry point / routing signal: which org+counterparty (if
-- any) the calling user has active client-portal access to. A user with
-- more than one active membership (not expected in V1, but not prevented
-- at the DB level either) gets the most recently granted one; the app
-- decides what to do with multiple memberships, this function just
-- reports the caller's own row(s) safely.
create or replace function public.portal_get_context()
returns table (
  organization_id uuid,
  counterparty_id uuid,
  counterparty_name text,
  role text
)
language sql
security definer
set search_path = public
stable
as $$
  select m.organization_id, m.counterparty_id, c.legal_name, m.role
  from public.client_portal_memberships m
  join public.counterparties c on c.id = m.counterparty_id and c.organization_id = m.organization_id
  where m.user_id = auth.uid()
    and m.active
  order by m.created_at desc;
$$;

revoke all on function public.portal_get_context() from public;
grant execute on function public.portal_get_context() to authenticated;

comment on table public.client_portal_memberships is
  'Grants a client (never an organization_members row) read-only access to one counterparty''s data via the portal_* SECURITY DEFINER functions. Managed by internal admin/operator only.';
