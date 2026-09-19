import "server-only";
import { SUPPORTED_LOCALES, type Locale } from "@/i18n/locale";
import type { Translator } from "@/i18n/translator";
import { buildLocaleNames } from "@/lib/i18n/locale-names";

export function buildWelcomeMessageLabels(t: Translator): Record<Locale, string> {
  const localeNames = buildLocaleNames(t);
  return Object.fromEntries(
    SUPPORTED_LOCALES.map((locale) => [locale, t("settings.branding.welcomeMessageFor", { language: localeNames[locale] })]),
  ) as Record<Locale, string>;
}
