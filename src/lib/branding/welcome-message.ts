import type { Locale } from "@/i18n/locale";
import type { Translator } from "@/i18n/translator";

/**
 * White-label welcome-message fallback chain (independent-review DoD #3
 * and #9): viewer's own resolved locale -> that org's message in its own
 * default_locale -> a generic translated fallback, so "no branding row",
 * "no message for this locale" and "viewer locale != org default locale"
 * all render clean copy, never a blank line or a raw dictionary key.
 *
 * Deliberately pure (no Supabase/server-only import) so it can be unit
 * tested directly -- the I/O half (getOrganizationBrandingLocalizations)
 * lives in src/lib/data/branding.ts.
 */
export function resolveWelcomeMessage(
  localizations: Partial<Record<Locale, string>>,
  viewerLocale: Locale,
  orgDefaultLocale: Locale,
  t: Translator,
): string {
  return localizations[viewerLocale] ?? localizations[orgDefaultLocale] ?? t("clientPortal.defaultWelcomeMessage");
}
