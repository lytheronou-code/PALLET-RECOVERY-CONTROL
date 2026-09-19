-- Threat model:
-- profiles' only SELECT policy (org_members_read_profiles) grants access
-- via a shared organization_members row: reader and target must both be
-- members of the same organization. A pure Client Portal user (a row in
-- client_portal_memberships, never in organization_members) has zero
-- organization_members rows, so that EXISTS check is false even for their
-- OWN profile -- confirmed live: a portal-only user reading
-- `select ... from profiles where id = auth.uid()` under RLS sees 0 rows.
--
-- That silently breaks per-user locale preference for Client Portal users:
-- resolveLocale()/resolveLocaleAndOrgSettings() read profiles.preferred_locale
-- for the signed-in user and, finding nothing, fall through to the
-- organization's default_locale every time -- their own saved preference
-- is invisible to their own session. It also blocks any other legitimate
-- "read my own profile" use (e.g. display_name) for portal-only users.
--
-- Fix: add a self-read policy scoped strictly to id = auth.uid(). This is
-- additive only (Postgres OR's multiple permissive policies for the same
-- command) and does not widen access to anyone else's data -- a user
-- reading their own row is always safe and mirrors the existing
-- self_update_profile UPDATE policy, which already has no org dependency.

create policy self_read_profile
on public.profiles
for select
to authenticated
using (id = auth.uid());
