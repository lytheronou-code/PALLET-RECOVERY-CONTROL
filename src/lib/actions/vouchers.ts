"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireMembership } from "@/lib/data/organization";
import { voucherSchema } from "@/lib/validation/voucher";
import type { FormState } from "@/lib/actions/form-state";

export async function createVoucherAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const membership = await requireMembership();
  const parsed = voucherSchema.safeParse({
    counterpartyId: formData.get("counterpartyId"),
    palletTypeId: formData.get("palletTypeId"),
    voucherNumber: formData.get("voucherNumber"),
    issueDate: formData.get("issueDate"),
    recoveryDueDate: formData.get("recoveryDueDate"),
    quantity: formData.get("quantity"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const supabase = await createClient();

  const [{ data: counterparty }, { data: palletType }] = await Promise.all([
    supabase
      .from("counterparties")
      .select("id")
      .eq("organization_id", membership.organizationId)
      .eq("id", parsed.data.counterpartyId)
      .eq("active", true)
      .maybeSingle(),
    supabase
      .from("pallet_types")
      .select("id")
      .eq("organization_id", membership.organizationId)
      .eq("id", parsed.data.palletTypeId)
      .eq("active", true)
      .maybeSingle(),
  ]);

  if (!counterparty) return { error: "Controparte non trovata o non attiva." };
  if (!palletType) return { error: "Tipo pallet non trovato o non attivo." };

  const { error } = await supabase.from("vouchers").insert({
    organization_id: membership.organizationId,
    counterparty_id: parsed.data.counterpartyId,
    pallet_type_id: parsed.data.palletTypeId,
    voucher_number: parsed.data.voucherNumber,
    issue_date: parsed.data.issueDate,
    recovery_due_date: parsed.data.recoveryDueDate || null,
    quantity: parsed.data.quantity,
    notes: parsed.data.notes || null,
  });

  if (error) {
    return {
      error: error.code === "23505" ? "Esiste già un buono con questo numero." : "Impossibile creare il buono.",
    };
  }

  revalidatePath("/vouchers");
  revalidatePath("/dashboard");
  revalidatePath("/reconciliation");
  redirect("/vouchers");
}
