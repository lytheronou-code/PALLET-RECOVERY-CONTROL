"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireMembership } from "@/lib/data/organization";
import { isSupportedCountry } from "@/lib/countries";
import { isSupportedCurrency } from "@/lib/currencies";
import { isLocale } from "@/i18n/locale";
import { getT } from "@/i18n/server";
import type { FormState } from "@/lib/actions/form-state";

// undefined (not null): the generated RPC Args type marks every optional
// column as `p_x?: string` (SQL DEFAULT NULL, not a nullable parameter
// type) -- passing undefined omits the key so Postgres applies its own
// DEFAULT NULL, which nullif(trim(p_x), '') then treats as "clear this
// field", same effective behavior as passing null explicitly would be if
// the generated type allowed it.
function stringOrUndefined(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

// Only an organization admin may reach the RPC that actually mutates
// anything here (enforced again, authoritatively, inside
// admin_update_organization_company/_localization themselves) -- this
// repeats the check purely so an operator gets a translated, friendly
// denial instead of a raw Postgres exception surfacing through the form.
export async function updateOrganizationCompanyAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const membership = await requireMembership();
  const { t } = await getT(membership.organizationId);

  if (membership.role !== "admin") {
    return { error: t("common.errors.forbidden") };
  }

  const countryCode = stringOrUndefined(formData.get("countryCode"))?.toUpperCase();
  if (countryCode && !isSupportedCountry(countryCode)) {
    return { error: t("common.validation.invalidCountry") };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_organization_company", {
    p_organization_id: membership.organizationId,
    p_legal_name: stringOrUndefined(formData.get("legalName")),
    p_trading_name: stringOrUndefined(formData.get("tradingName")),
    p_country_code: countryCode,
    p_tax_id: stringOrUndefined(formData.get("taxId")),
    p_vat_id: stringOrUndefined(formData.get("vatId")),
    p_registration_number: stringOrUndefined(formData.get("registrationNumber")),
    p_address_line_1: stringOrUndefined(formData.get("addressLine1")),
    p_address_line_2: stringOrUndefined(formData.get("addressLine2")),
    p_city: stringOrUndefined(formData.get("city")),
    p_region: stringOrUndefined(formData.get("region")),
    p_postal_code: stringOrUndefined(formData.get("postalCode")),
    p_website: stringOrUndefined(formData.get("website")),
    p_support_email: stringOrUndefined(formData.get("supportEmail")),
    p_support_phone: stringOrUndefined(formData.get("supportPhone")),
  });

  if (error) {
    return { error: t("common.errors.generic") };
  }

  revalidatePath("/settings");
  return { message: t("common.actions.save") };
}

export async function updateOrganizationLocalizationAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const membership = await requireMembership();
  const { t } = await getT(membership.organizationId);

  if (membership.role !== "admin") {
    return { error: t("common.errors.forbidden") };
  }

  const locale = stringOrUndefined(formData.get("defaultLocale"));
  if (!locale || !isLocale(locale)) {
    return { error: t("common.validation.invalidLocale") };
  }

  const currency = stringOrUndefined(formData.get("defaultCurrency"))?.toUpperCase();
  if (!currency || !isSupportedCurrency(currency)) {
    return { error: t("common.validation.invalidCurrency") };
  }

  const timezone = stringOrUndefined(formData.get("timezone"));
  if (!timezone) {
    return { error: t("common.validation.invalidTimezone") };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_organization_localization", {
    p_organization_id: membership.organizationId,
    p_default_locale: locale,
    p_default_currency: currency,
    p_timezone: timezone,
  });

  if (error) {
    // The one field this form validates only server-side (there's no
    // lightweight client-side IANA name list to check against up front),
    // so an unrecognized timezone reaches here as an RPC error rather
    // than one of the guard clauses above.
    return {
      error: error.message.includes("timezone") ? t("common.validation.invalidTimezone") : t("common.errors.generic"),
    };
  }

  revalidatePath("/settings");
  return { message: t("common.actions.save") };
}
