import "server-only";
import { SUPPORTED_LOCALES, type Locale } from "@/i18n/locale";
import type { Translator, TranslationKey } from "@/i18n/translator";

// The one place a new locale needs a dictionary lookup added for its
// display name -- dot-paths are static string literals, so this map (not
// a runtime string template) is what lets buildLocaleNames() below stay a
// plain SUPPORTED_LOCALES.map() with no per-locale branching. Shared by
// every caller that needs a human-readable locale name (the Localization
// settings form's language <select>, and the branding welcome-message
// per-locale field labels) instead of each keeping its own copy.
const LOCALE_NAME_KEY: Record<Locale, TranslationKey> = {
  en: "settings.localization.languageNames.en",
  it: "settings.localization.languageNames.it",
};

export function buildLocaleNames(t: Translator): Record<Locale, string> {
  return Object.fromEntries(SUPPORTED_LOCALES.map((locale) => [locale, t(LOCALE_NAME_KEY[locale])])) as Record<
    Locale,
    string
  >;
}
