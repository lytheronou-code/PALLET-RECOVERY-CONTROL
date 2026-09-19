import "server-only";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isLocale, coerceLocale, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "@/i18n/locale";

export { LOCALE_COOKIE };

function parseAcceptLanguage(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;
  const primary = header.split(",")[0]?.trim().split("-")[0]?.toLowerCase();
  return coerceLocale(primary);
}

async function cookieOrHeaderLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieValue)) return cookieValue;

  const headerStore = await headers();
  return parseAcceptLanguage(headerStore.get("accept-language"));
}

export type OrgLocaleSettings = {
  defaultLocale: Locale;
  defaultCurrency: string;
  timezone: string;
};

const FALLBACK_ORG_SETTINGS: OrgLocaleSettings = {
  defaultLocale: DEFAULT_LOCALE,
  defaultCurrency: "EUR",
  timezone: "UTC",
};

/**
 * Resolution hierarchy: signed-in user's own preferred_locale -> the
 * organization's default_locale (internal operator or client portal user,
 * both scoped by organizationId) -> a locale cookie / Accept-Language
 * header for pages reached before any organization is known (login,
 * signup, onboarding before an org exists) -> 'en'.
 *
 * organizationId is optional because several call sites (login, signup,
 * auth error, onboarding pre-bootstrap) have no organization yet by
 * definition; passing it in explicitly (rather than re-deriving it here)
 * avoids resolve.ts depending on workspace.ts, which would create a import
 * cycle with the (app)/(portal) layouts that already compute it.
 */
export async function resolveLocale(organizationId?: string | null): Promise<Locale> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return cookieOrHeaderLocale();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_locale")
    .eq("id", user.id)
    .maybeSingle();

  if (isLocale(profile?.preferred_locale)) {
    return profile.preferred_locale;
  }

  if (organizationId) {
    const { data: org } = await supabase
      .from("organizations")
      .select("default_locale")
      .eq("id", organizationId)
      .maybeSingle();
    if (isLocale(org?.default_locale)) {
      return org.default_locale;
    }
  }

  return cookieOrHeaderLocale();
}

/**
 * Same hierarchy as resolveLocale(), but also returns the organization's
 * currency and timezone in the same round trip, for pages that need both
 * translated text and locale-aware number/date/money formatting (which is
 * effectively every operational page). currency/timezone have no per-user
 * override in the spec -- they are organization-level only -- so they are
 * simply read alongside default_locale rather than resolved through a
 * hierarchy of their own.
 */
export async function resolveLocaleAndOrgSettings(
  organizationId?: string | null,
): Promise<{ locale: Locale; org: OrgLocaleSettings }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const orgSettingsPromise = organizationId
    ? supabase
        .from("organizations")
        .select("default_locale, default_currency, timezone")
        .eq("id", organizationId)
        .maybeSingle()
    : Promise.resolve({ data: null } as const);

  if (!user) {
    const { data: org } = await orgSettingsPromise;
    const locale = await cookieOrHeaderLocale();
    return {
      locale,
      org: org
        ? {
            defaultLocale: coerceLocale(org.default_locale),
            defaultCurrency: org.default_currency,
            timezone: org.timezone,
          }
        : FALLBACK_ORG_SETTINGS,
    };
  }

  const [{ data: profile }, { data: org }] = await Promise.all([
    supabase.from("profiles").select("preferred_locale").eq("id", user.id).maybeSingle(),
    orgSettingsPromise,
  ]);

  const orgSettings: OrgLocaleSettings = org
    ? {
        defaultLocale: coerceLocale(org.default_locale),
        defaultCurrency: org.default_currency,
        timezone: org.timezone,
      }
    : FALLBACK_ORG_SETTINGS;

  const locale = isLocale(profile?.preferred_locale)
    ? profile.preferred_locale
    : org
      ? orgSettings.defaultLocale
      : await cookieOrHeaderLocale();

  return { locale, org: orgSettings };
}
