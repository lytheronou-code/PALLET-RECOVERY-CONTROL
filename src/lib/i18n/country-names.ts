// Locale-aware country display names, resolved from the platform's own
// ICU data (Intl.DisplayNames) rather than a hand-maintained per-locale
// name table -- the same stored country_code renders as "Germany" for an
// EN viewer and "Germania" for an IT viewer, and every future locale
// (de/fr/es/pt/...) gets correct names for all 249 codes for free, with
// no translation work. Isomorphic (no "server-only"): CountrySelect is a
// client component (it's always rendered from a "use client" form), so
// this must run in the browser; Intl.DisplayNames is available in every
// evergreen browser and in Node, so the same function also works from a
// Server Component if one is ever added.
import { isOfficialIsoCountryCode, isProductExtensionCountryCode } from "@/lib/countries";
import type { Locale } from "@/i18n/locale";

// XK (Kosovo) is not an officially assigned ISO 3166-1 code, so CLDR
// support for it varies across ICU builds/versions -- an explicit,
// deterministic fallback here means its label never depends on runtime
// ICU data the way every real ISO code's label does.
const PRODUCT_EXTENSION_NAMES: Record<string, Record<Locale, string>> = {
  XK: { en: "Kosovo", it: "Kosovo" },
};

const displayNamesCache = new Map<Locale, Intl.DisplayNames>();

function getDisplayNames(locale: Locale): Intl.DisplayNames | undefined {
  let instance = displayNamesCache.get(locale);
  if (!instance) {
    try {
      instance = new Intl.DisplayNames([locale], { type: "region" });
      displayNamesCache.set(locale, instance);
    } catch {
      return undefined;
    }
  }
  return instance;
}

/**
 * Resolves a stored alpha-2 country_code to a localized display name for
 * the given viewer locale. Deterministic and never throws: an explicit
 * fallback for the one non-ISO product extension (XK), then ICU via
 * Intl.DisplayNames for every official code, then the raw code itself if
 * ICU cannot resolve it (unknown code, or an environment without region
 * display-name data) -- always a string, never an error surfaced to the UI.
 */
export function getCountryDisplayName(code: string | null | undefined, locale: Locale): string {
  if (!code) return "—";
  const upper = code.toUpperCase();

  if (isProductExtensionCountryCode(upper)) {
    return PRODUCT_EXTENSION_NAMES[upper]?.[locale] ?? upper;
  }

  if (isOfficialIsoCountryCode(upper)) {
    try {
      const resolved = getDisplayNames(locale)?.of(upper);
      if (resolved && resolved !== upper) return resolved;
    } catch {
      // fall through to the raw-code fallback below
    }
  }

  return upper;
}

export type CountryOption = { code: string; name: string };

/**
 * All supported country codes (official ISO + the XK extension) as
 * {code, name} options localized for the viewer, sorted by the
 * DISPLAYED name (locale collation) so the select list reads naturally
 * in every language rather than in a fixed alpha-2-code order. The
 * stable option value stays the alpha-2 code regardless of sort order.
 */
export function getLocalizedCountryOptions(codes: readonly string[], locale: Locale): CountryOption[] {
  const collator = new Intl.Collator(locale);
  return codes
    .map((code) => ({ code, name: getCountryDisplayName(code, locale) }))
    .sort((a, b) => collator.compare(a.name, b.name));
}
