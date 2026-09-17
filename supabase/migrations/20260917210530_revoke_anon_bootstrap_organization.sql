-- Supabase's default privileges on the public schema grant EXECUTE on newly
-- created functions to anon/authenticated/service_role automatically. The prior
-- migration's `revoke all ... from public` only revoked the implicit PUBLIC grant,
-- not the role-specific default-privilege grant already applied to `anon`.
-- bootstrap_organization must never be callable without a signed-in user
-- (it relies on auth.uid() for authorization), so revoke anon explicitly.
revoke execute on function public.bootstrap_organization(text) from anon;
