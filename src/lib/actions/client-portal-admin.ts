"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireMembership } from "@/lib/data/organization";
import { mapKeyedError } from "@/lib/errors/friendly";
import { getT } from "@/i18n/server";
import type { Translator, TranslationKey } from "@/i18n/translator";
import type { FormState } from "@/lib/actions/form-state";

function buildGrantSchema(t: Translator) {
  return z.object({
    email: z.string().trim().email(t("common.validation.invalidEmail")),
  });
}

// admin_grant_client_portal_access does its own admin/operator
// authorization check server-side (SECURITY DEFINER) -- requireMembership()
// here only ensures there's a session/org context to revalidate against,
// it is not the security boundary.
export async function grantClientPortalAccessAction(
  counterpartyId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const membership = await requireMembership();
  const { t } = await getT(membership.organizationId);

  const parsed = buildGrantSchema(t).safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("common.validation.invalidEmail") };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_grant_client_portal_access", {
    p_counterparty_id: counterpartyId,
    p_email: parsed.data.email,
  });

  if (error) {
    const grantRules: ReadonlyArray<readonly [string, TranslationKey]> = [
      ["no account found", "clientPortalAccess.errors.noAccountFound"],
      ["insufficient privileges", "clientPortalAccess.errors.adminOnly"],
      ["already has an active portal membership", "clientPortalAccess.errors.alreadyActiveElsewhere"],
    ];
    return { error: mapKeyedError(error.message, grantRules, "clientPortalAccess.errors.grantFailed", t) };
  }

  revalidatePath("/counterparties/" + counterpartyId);
  return { message: t("clientPortalAccess.errors.granted") };
}

// Returns an explicit result (never void): a blocked RLS update or a
// single-active-membership conflict must never look like success in the
// UI. RLS itself is admin-only (see the migration), so a non-admin
// caller's UPDATE matches zero rows rather than erroring -- .select()
// + checking for a returned row is what surfaces that as a real failure.
export async function setClientPortalMembershipActiveAction(
  membershipId: string,
  active: boolean,
  counterpartyId: string,
): Promise<{ error?: string }> {
  const membership = await requireMembership();
  const { t } = await getT(membership.organizationId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_portal_memberships")
    .update({ active })
    .eq("id", membershipId)
    .select("id")
    .maybeSingle();

  revalidatePath("/counterparties/" + counterpartyId);

  if (error) {
    const updateRules: ReadonlyArray<readonly [string, TranslationKey]> = [
      ["client_portal_memberships_one_active_per_user", "clientPortalAccess.errors.alreadyActiveElsewhere"],
    ];
    return { error: mapKeyedError(error.message, updateRules, "documents.errors.operationFailed", t) };
  }

  if (!data) {
    return { error: t("clientPortalAccess.errors.adminOnly") };
  }

  return {};
}
