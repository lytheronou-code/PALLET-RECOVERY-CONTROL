import "server-only";
import { SUPPORTED_LOCALES, type Locale } from "@/i18n/locale";
import type { Translator, TranslationKey } from "@/i18n/translator";

// The only place a new locale needs a dictionary lookup added for the
// branding form's welcome-message labels -- dot-paths are static string
// literals, so this map (not a runtime string template) is what lets
// buildWelcomeMessageLabels() below stay a plain SUPPORTED_LOCALES.map()
// with no per-locale branching.
const LANGUAGE_NAME_KEY: Record<Locale, TranslationKey> = {
  en: "settings.branding.languageNames.en",
  it: "settings.branding.languageNames.it",
};

export function buildWelcomeMessageLabels(t: Translator): Record<Locale, string> {
  return Object.fromEntries(
    SUPPORTED_LOCALES.map((locale) => [
      locale,
      t("settings.branding.welcomeMessageFor", { language: t(LANGUAGE_NAME_KEY[locale]) }),
    ]),
  ) as Record<Locale, string>;
}
