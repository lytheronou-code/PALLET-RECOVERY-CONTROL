import "server-only";
import { resolveLocale } from "@/i18n/resolve";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator, type Translator } from "@/i18n/translator";
import type { Locale } from "@/i18n/locale";

export async function getT(organizationId?: string | null): Promise<{ locale: Locale; t: Translator }> {
  const locale = await resolveLocale(organizationId);
  return { locale, t: createTranslator(getDictionary(locale)) };
}
