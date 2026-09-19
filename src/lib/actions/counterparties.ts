"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireMembership } from "@/lib/data/organization";
import { buildCounterpartySchema } from "@/lib/validation/master-data";
import { mapDatabaseError } from "@/lib/errors/friendly";
import { getT } from "@/i18n/server";
import type { Translator } from "@/i18n/translator";
import type { FormState } from "@/lib/actions/form-state";

function parseCounterpartyForm(formData: FormData, t: Translator) {
  return buildCounterpartySchema(t).safeParse({
    legalName: formData.get("legalName"),
    tradingName: formData.get("tradingName"),
    code: formData.get("code"),
    vatNumber: formData.get("vatNumber"),
    taxId: formData.get("taxId"),
    registrationNumber: formData.get("registrationNumber"),
    counterpartyType: formData.get("counterpartyType"),
    addressLine: formData.get("addressLine"),
    addressLine2: formData.get("addressLine2"),
    postalCode: formData.get("postalCode"),
    city: formData.get("city"),
    province: formData.get("province"),
    countryCode: formData.get("countryCode") || "IT",
    email: formData.get("email"),
    phone: formData.get("phone"),
  });
}

export async function createCounterpartyAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const membership = await requireMembership();
  const { t } = await getT(membership.organizationId);
  const parsed = parseCounterpartyForm(formData, t);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("common.errors.generic") };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("counterparties").insert({
    organization_id: membership.organizationId,
    legal_name: parsed.data.legalName,
    trading_name: parsed.data.tradingName || null,
    code: parsed.data.code || null,
    vat_number: parsed.data.vatNumber || null,
    tax_id: parsed.data.taxId || null,
    registration_number: parsed.data.registrationNumber || null,
    counterparty_type: parsed.data.counterpartyType,
    address_line: parsed.data.addressLine || null,
    address_line_2: parsed.data.addressLine2 || null,
    postal_code: parsed.data.postalCode || null,
    city: parsed.data.city || null,
    province: parsed.data.province || null,
    country_code: parsed.data.countryCode,
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
  });

  if (error) {
    return { error: mapDatabaseError(error, t) };
  }

  revalidatePath("/counterparties");
  redirect("/counterparties");
}

export async function updateCounterpartyAction(
  id: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const membership = await requireMembership();
  const { t } = await getT(membership.organizationId);
  const parsed = parseCounterpartyForm(formData, t);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("common.errors.generic") };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("counterparties")
    .update({
      legal_name: parsed.data.legalName,
      trading_name: parsed.data.tradingName || null,
      code: parsed.data.code || null,
      vat_number: parsed.data.vatNumber || null,
      tax_id: parsed.data.taxId || null,
      registration_number: parsed.data.registrationNumber || null,
      counterparty_type: parsed.data.counterpartyType,
      address_line: parsed.data.addressLine || null,
      address_line_2: parsed.data.addressLine2 || null,
      postal_code: parsed.data.postalCode || null,
      city: parsed.data.city || null,
      province: parsed.data.province || null,
      country_code: parsed.data.countryCode,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
    })
    .eq("id", id)
    .eq("organization_id", membership.organizationId);

  if (error) {
    return { error: mapDatabaseError(error, t) };
  }

  revalidatePath("/counterparties");
  redirect("/counterparties");
}

export async function setCounterpartyActiveAction(id: string, active: boolean): Promise<void> {
  const membership = await requireMembership();
  const supabase = await createClient();
  await supabase
    .from("counterparties")
    .update({ active })
    .eq("id", id)
    .eq("organization_id", membership.organizationId);

  revalidatePath("/counterparties");
}
