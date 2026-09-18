"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireMembership } from "@/lib/data/organization";
import { siteSchema } from "@/lib/validation/master-data";
import type { FormState } from "@/lib/actions/form-state";

function parseSiteForm(formData: FormData) {
  return siteSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    counterpartyId: formData.get("counterpartyId"),
    addressLine: formData.get("addressLine"),
    postalCode: formData.get("postalCode"),
    city: formData.get("city"),
    province: formData.get("province"),
    countryCode: formData.get("countryCode") || "IT",
  });
}

export async function createSiteAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const membership = await requireMembership();
  const parsed = parseSiteForm(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("sites").insert({
    organization_id: membership.organizationId,
    name: parsed.data.name,
    code: parsed.data.code || null,
    counterparty_id: parsed.data.counterpartyId || null,
    address_line: parsed.data.addressLine || null,
    postal_code: parsed.data.postalCode || null,
    city: parsed.data.city || null,
    province: parsed.data.province || null,
    country_code: parsed.data.countryCode,
  });

  if (error) {
    return { error: "Impossibile creare il sito. Verifica i permessi." };
  }

  revalidatePath("/sites");
  redirect("/sites");
}

export async function updateSiteAction(
  id: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const membership = await requireMembership();
  const parsed = parseSiteForm(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("sites")
    .update({
      name: parsed.data.name,
      code: parsed.data.code || null,
      counterparty_id: parsed.data.counterpartyId || null,
      address_line: parsed.data.addressLine || null,
      postal_code: parsed.data.postalCode || null,
      city: parsed.data.city || null,
      province: parsed.data.province || null,
      country_code: parsed.data.countryCode,
    })
    .eq("id", id)
    .eq("organization_id", membership.organizationId);

  if (error) {
    return { error: "Impossibile aggiornare il sito. Verifica i permessi." };
  }

  revalidatePath("/sites");
  redirect("/sites");
}

export async function setSiteActiveAction(id: string, active: boolean): Promise<void> {
  const membership = await requireMembership();
  const supabase = await createClient();
  await supabase
    .from("sites")
    .update({ active })
    .eq("id", id)
    .eq("organization_id", membership.organizationId);

  revalidatePath("/sites");
}
