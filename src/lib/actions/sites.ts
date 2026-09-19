"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireMembership } from "@/lib/data/organization";
import { listActiveSitesForCounterparty } from "@/lib/data/sites";
import { siteSchema } from "@/lib/validation/master-data";
import { mapDatabaseError } from "@/lib/errors/friendly";
import { getT } from "@/i18n/server";
import type { FormState } from "@/lib/actions/form-state";

// Called directly from client components (not bound to a form) whenever
// the counterparty selection changes in the voucher/recovery-case forms,
// so the site picker only ever offers that counterparty's own sites
// instead of every site in the organization. requireMembership() ignores
// whatever the client claims and resolves the org from the session, so a
// caller cannot probe another organization's sites by passing an
// arbitrary counterpartyId -- listActiveSitesForCounterparty additionally
// scopes by organization_id, so a counterpartyId from another tenant just
// returns an empty list.
export async function listSitesForCounterpartyAction(
  counterpartyId: string,
): Promise<{ id: string; name: string }[]> {
  const membership = await requireMembership();
  if (!counterpartyId) return [];
  const sites = await listActiveSitesForCounterparty(membership.organizationId, counterpartyId);
  return sites.map((site) => ({ id: site.id, name: site.name }));
}

function parseSiteForm(formData: FormData) {
  return siteSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    counterpartyId: formData.get("counterpartyId"),
    addressLine: formData.get("addressLine"),
    addressLine2: formData.get("addressLine2"),
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
    address_line_2: parsed.data.addressLine2 || null,
    postal_code: parsed.data.postalCode || null,
    city: parsed.data.city || null,
    province: parsed.data.province || null,
    country_code: parsed.data.countryCode,
  });

  if (error) {
    const { t } = await getT(membership.organizationId);
    return { error: mapDatabaseError(error, t) };
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
      address_line_2: parsed.data.addressLine2 || null,
      postal_code: parsed.data.postalCode || null,
      city: parsed.data.city || null,
      province: parsed.data.province || null,
      country_code: parsed.data.countryCode,
    })
    .eq("id", id)
    .eq("organization_id", membership.organizationId);

  if (error) {
    const { t } = await getT(membership.organizationId);
    return { error: mapDatabaseError(error, t) };
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
