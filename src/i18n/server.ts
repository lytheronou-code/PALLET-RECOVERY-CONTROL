import "server-only";
import { resolveLocale, resolveLocaleAndOrgSettings } from "@/i18n/resolve";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator, type Translator } from "@/i18n/translator";
import { createFormatters, type Formatters } from "@/lib/format";
import type { Locale } from "@/i18n/locale";

export async function getT(organizationId?: string | null): Promise<{ locale: Locale; t: Translator }> {
  const locale = await resolveLocale(organizationId);
  return { locale, t: createTranslator(getDictionary(locale)) };
}

/**
 * The single call operational pages should use: resolves locale + org
 * currency/timezone in one round trip and returns translator + formatters
 * bound to that context, so a page never has to thread locale/currency
 * through props by hand. currency/timeZone are also returned raw (not just
 * baked into the formatters) for the handful of interactive "use client"
 * table components that need to build their own createFormatters() locally
 * -- a bound formatter function cannot cross the server/client boundary as
 * a prop, but these three primitive strings can.
 */
export async function getPageContext(
  organizationId?: string | null,
): Promise<{ locale: Locale; t: Translator; currency: string; timeZone: string } & Formatters> {
  const { locale, org } = await resolveLocaleAndOrgSettings(organizationId);
  const t = createTranslator(getDictionary(locale));
  const formatters = createFormatters(locale, org.defaultCurrency, org.timezone);
  return { locale, t, currency: org.defaultCurrency, timeZone: org.timezone, ...formatters };
}
