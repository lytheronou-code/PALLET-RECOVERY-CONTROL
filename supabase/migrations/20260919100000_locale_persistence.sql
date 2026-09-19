-- Premium V4 M1: locale persistence foundation.
--
-- Resolution hierarchy implemented in src/i18n/resolve.ts:
--   profiles.preferred_locale (explicit per-user choice, nullable = "not set")
--   -> organizations.default_locale (per-tenant default)
--   -> 'en' (hard fallback)
--
-- profiles.preferred_locale is nullable rather than defaulted: a null value
-- means "this user has never chosen a language", which must fall through to
-- the organization's default rather than pin the user to whatever the
-- column's default happened to be at signup time. A non-null default would
-- silently break that inheritance for every future user.
--
-- organizations.default_locale defaults to 'en': there is no existing
-- organization row in this database yet (verified before writing this
-- migration), so there is no real Italian-tenant data to preserve or
-- default toward, and the product strategy explicitly requires this app to
-- be architected as a generic international SaaS rather than assume an
-- Italian/ESSEGI tenant. 'en' is the neutral, defensible default for a new
-- tenant created by any future signup; an Italian pilot customer sets it to
-- 'it' once during onboarding (Milestone 6) like any other tenant.
--
-- Both columns are constrained to the currently supported locale set. This
-- mirrors src/i18n/locale.ts's SUPPORTED_LOCALES at the DB boundary so a
-- forged/invalid locale value can never be persisted, even by a direct
-- RPC/API call that bypasses the UI. Extending to a third locale later is a
-- single additive migration (drop + recreate this check constraint) plus a
-- new dictionary file -- no data migration required.

alter table public.organizations
  add column default_locale text not null default 'en'
    check (default_locale in ('en', 'it'));

alter table public.profiles
  add column preferred_locale text
    check (preferred_locale is null or preferred_locale in ('en', 'it'));
