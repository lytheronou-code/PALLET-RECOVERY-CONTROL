-- Premium V4 M2: currency and timezone foundation for locale-aware
-- formatting (src/lib/formatting.ts). Multi-currency accounting is
-- explicitly out of scope -- one organization has exactly one base
-- operational currency, no FX conversion. Format-level constraints only;
-- the authoritative "is this a currency/timezone we actually support"
-- check lives in application code (src/lib/currencies.ts and, for
-- timezones, a pg_timezone_names lookup inside the settings RPC added in
-- Milestone 4) because that list is expected to grow over time without a
-- migration, and pg_timezone_names cannot be referenced from a CHECK
-- constraint (not immutable).
--
-- Defaults mirror the locale_persistence migration's reasoning: no
-- organization row exists yet in this database, so 'EUR'/'UTC' are picked
-- as neutral, internationally unambiguous defaults for a brand-new tenant,
-- not because of any Italian-tenant assumption.

alter table public.organizations
  add column default_currency text not null default 'EUR'
    check (default_currency ~ '^[A-Z]{3}$'),
  add column timezone text not null default 'UTC'
    check (length(timezone) > 0);
