// English stays the canonical technical/DB/code language. This list is the
// only place a new locale needs to be added to the type system -- dictionary
// keys, the resolver, and the switcher all derive from it.
export const SUPPORTED_LOCALES = ["en", "it"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

// Lives here (not resolve.ts, which is server-only) so pure client
// components -- e.g. the root/route error boundaries, which Next.js
// instantiates as plain client components with no server-resolved props --
// can also read it without pulling "server-only" into a client bundle.
export const LOCALE_COOKIE = "prc_locale";

export function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function coerceLocale(value: string | null | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
