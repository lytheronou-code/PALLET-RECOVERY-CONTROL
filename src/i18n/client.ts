import { coerceLocale, LOCALE_COOKIE, type Locale } from "@/i18n/locale";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translator";

// For the small set of pure client components that render with no
// server-resolved props at all -- Next.js route error boundaries
// (src/app/error.tsx, src/app/(app)/error.tsx) are instantiated directly by
// the framework and never receive a locale/t prop from a layout. This reads
// the same cookie the server resolver falls back to; it intentionally does
// NOT look at profiles.preferred_locale (that would require a network
// round-trip from inside a component whose whole job is to render
// instantly when something has already gone wrong).
export function getClientLocale(): Locale {
  if (typeof document === "undefined") return coerceLocale(null);
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]+)`));
  return coerceLocale(match ? decodeURIComponent(match[1]) : null);
}

export function getClientTranslator() {
  const locale = getClientLocale();
  return { locale, t: createTranslator(getDictionary(locale)) };
}
