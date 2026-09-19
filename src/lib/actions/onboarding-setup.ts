"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireMembership } from "@/lib/data/organization";
import { counterpartySchema } from "@/lib/validation/master-data";
import { getT } from "@/i18n/server";
import type { FormState } from "@/lib/actions/form-state";

// No hardcoded operational logic tied to these brand names -- a preset is
// just a starting row in the organization's own, fully editable
// pallet_types table (Settings > Pallet types already lets an admin
// rename/reprice/deactivate it like any other row). unit_value starts at
// 0 rather than a fabricated price: this app has no basis for guessing
// what a EUR-pallet is worth to a UK or US organization, in their own
// base currency, and a wrong number would be worse than an obvious
// placeholder the admin must fill in before the type is used for real.
export const PALLET_TYPE_PRESETS = [
  { code: "EPAL", description: "EPAL / EUR pallet" },
  { code: "CHEP", description: "CHEP pallet" },
  { code: "LPR", description: "LPR pallet" },
  { code: "GENERIC", description: "Generic pallet" },
] as const;

export async function applyPalletTypePresetAction(presetCode: string): Promise<{ error?: string }> {
  const membership = await requireMembership();
  const preset = PALLET_TYPE_PRESETS.find((p) => p.code === presetCode);
  if (!preset) {
    return { error: "unknown preset" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("pallet_types").insert({
    organization_id: membership.organizationId,
    code: preset.code,
    description: preset.description,
    unit_value: 0,
  });

  if (error && error.code !== "23505") {
    return { error: error.message };
  }

  revalidatePath("/onboarding/setup");
  revalidatePath("/pallet-types");
  return {};
}

// A deliberately trimmed-down subset of counterpartySchema's full form
// (legal name + country only) -- this is the guided-onboarding "add your
// first customer" nudge, not the real Counterparties form; the full
// record can be completed any time from Counterparties.
export async function createFirstCustomerAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const membership = await requireMembership();
  const { t } = await getT(membership.organizationId);

  const parsed = counterpartySchema.pick({ legalName: true, countryCode: true }).safeParse({
    legalName: formData.get("legalName"),
    countryCode: formData.get("countryCode") || "IT",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("common.errors.generic") };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("counterparties").insert({
    organization_id: membership.organizationId,
    legal_name: parsed.data.legalName,
    country_code: parsed.data.countryCode,
    counterparty_type: "customer",
  });

  if (error) {
    return { error: t("common.errors.duplicate") };
  }

  revalidatePath("/onboarding/setup");
  revalidatePath("/counterparties");
  return { message: t("common.actions.save") };
}
