-- Independent review fix (fase 4): portal_current_context() picks the
-- most-recently-created active membership when a user has more than
-- one, which silently decides which customer's data they see -- unsafe
-- and ambiguous. V1 enforces exactly one active client-portal
-- membership per user (a real multi-client workspace selector is a
-- later, deliberate feature, not an accident of this constraint's
-- absence). Historical inactive memberships are untouched -- this only
-- blocks having two ACTIVE rows at once.
create unique index client_portal_memberships_one_active_per_user
  on public.client_portal_memberships (user_id)
  where active;
