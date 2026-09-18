"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireMembership } from "@/lib/data/organization";
import { palletTypeSchema } from "@/lib/validation/master-data";
import type { FormState } from "@/lib/actions/form-state";

function parsePalletTypeForm(formData: FormData) {
  return palletTypeSchema.safeParse({
    code: formData.get("code"),
    description: formData.get("description"),
    unitValue: formData.get("unitValue"),
  });
}

export async function createPalletTypeAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const membership = await requireMembership();
  const parsed = parsePalletTypeForm(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("pallet_types").insert({
    organization_id: membership.organizationId,
    code: parsed.data.code,
    description: parsed.data.description,
    unit_value: parsed.data.unitValue,
  });

  if (error) {
    return {
      error: error.code === "23505" ? "Codice già esistente" : "Impossibile creare il tipo pallet.",
    };
  }

  revalidatePath("/pallet-types");
  redirect("/pallet-types");
}

// Updating unit_value only affects future recovery cases: existing cases keep
// their unit_value_snapshot captured at case-open time (see CLAUDE.md).
export async function updatePalletTypeAction(
  id: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const membership = await requireMembership();
  const parsed = parsePalletTypeForm(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("pallet_types")
    .update({
      code: parsed.data.code,
      description: parsed.data.description,
      unit_value: parsed.data.unitValue,
    })
    .eq("id", id)
    .eq("organization_id", membership.organizationId);

  if (error) {
    return {
      error: error.code === "23505" ? "Codice già esistente" : "Impossibile aggiornare il tipo pallet.",
    };
  }

  revalidatePath("/pallet-types");
  redirect("/pallet-types");
}

export async function setPalletTypeActiveAction(id: string, active: boolean): Promise<void> {
  const membership = await requireMembership();
  const supabase = await createClient();
  await supabase
    .from("pallet_types")
    .update({ active })
    .eq("id", id)
    .eq("organization_id", membership.organizationId);

  revalidatePath("/pallet-types");
}
