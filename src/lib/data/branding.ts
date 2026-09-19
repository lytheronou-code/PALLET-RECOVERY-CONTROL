import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import { SUPPORTED_LOCALES, type Locale } from "@/i18n/locale";

export type OrganizationBranding = Tables<"organization_branding">;
export type OrganizationBrandingLocalization = Tables<"organization_branding_localizations">;

// Pure fallback-chain logic lives in src/lib/branding/welcome-message.ts
// (no server-only import, so it stays directly unit-testable); re-exported
// here so call sites that already import the I/O helpers above don't need
// a second import for it.
export { resolveWelcomeMessage } from "@/lib/branding/welcome-message";

// RLS (org_members_read_branding / portal_members_read_branding) is the
// real authorization boundary here -- the organizationId filter is
// defense in depth, not the only thing standing between a caller and
// another tenant's row.
export async function getOrganizationBranding(organizationId: string): Promise<OrganizationBranding | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_branding")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();
  return error ? null : data;
}

// Signed URLs (never public URLs) even though a logo has no confidentiality
// requirement of its own -- the bucket itself is private, so this is the
// only way to serve the image at all, and it keeps branding-assets under
// the same "nothing is public" posture as the rest of Storage in this
// project. A longer TTL than documents' 60s is fine here (logos are
// rendered on every page load, not opened on demand) and just reduces how
// often a fresh URL has to be minted.
export async function getBrandingImageUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("branding-assets").createSignedUrl(path, 3600);
  return error || !data ? null : data.signedUrl;
}

// All locales this org has configured a welcome message for, keyed by
// locale -- one row read, not one query per locale. RLS
// (org_members_read_branding_localizations /
// portal_members_read_branding_localizations) is the real tenant
// boundary, same as getOrganizationBranding above.
export async function getOrganizationBrandingLocalizations(
  organizationId: string,
): Promise<Partial<Record<Locale, string>>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_branding_localizations")
    .select("locale, welcome_message")
    .eq("organization_id", organizationId);
  if (error || !data) return {};
  const result: Partial<Record<Locale, string>> = {};
  for (const row of data) {
    if ((SUPPORTED_LOCALES as readonly string[]).includes(row.locale) && row.welcome_message) {
      result[row.locale as Locale] = row.welcome_message;
    }
  }
  return result;
}
