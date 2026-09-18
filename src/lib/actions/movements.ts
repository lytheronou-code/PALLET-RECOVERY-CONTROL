"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireMembership } from "@/lib/data/organization";
import { correctMovementSchema } from "@/lib/validation/movement-correction";
import { oppositeDirection, type Direction } from "@/lib/movements/correction";
import type { FormState } from "@/lib/actions/form-state";

// The movement ledger is immutable (no UPDATE policy on pallet_movements),
// so a wrong row can only be fixed by inserting new, linked rows: a
// reversal that cancels it out, and -- unless the original should never
// have existed at all -- a corrected replacement. Both new rows are plain
// INSERTs covered by the existing operators_insert_movements policy; no
// RPC is needed here because there is no shared counter to race on (unlike
// recovery quantities), each correction only ever touches brand-new rows.
export async function correctMovementAction(
  originalMovementId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const membership = await requireMembership();
  const parsed = correctMovementSchema.safeParse({
    reason: formData.get("reason"),
    reversalOnly: formData.get("reversalOnly") === "on",
    movementDate: formData.get("movementDate") || undefined,
    quantity: formData.get("quantity") || undefined,
    direction: formData.get("direction") || undefined,
    documentType: formData.get("documentType"),
    documentNumber: formData.get("documentNumber"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const supabase = await createClient();
  const { data: original, error: originalError } = await supabase
    .from("pallet_movements")
    .select("*")
    .eq("organization_id", membership.organizationId)
    .eq("id", originalMovementId)
    .maybeSingle();

  if (originalError || !original) {
    return { error: "Movimento originale non trovato." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const reversalNote = `Storno del movimento del ${original.movement_date}. Motivo: ${parsed.data.reason}`;
  const { error: reversalError } = await supabase.from("pallet_movements").insert({
    organization_id: membership.organizationId,
    counterparty_id: original.counterparty_id,
    pallet_type_id: original.pallet_type_id,
    site_id: original.site_id,
    movement_date: new Date().toISOString().slice(0, 10),
    direction: oppositeDirection(original.direction as Direction),
    quantity: original.quantity,
    document_type: original.document_type,
    document_number: original.document_number,
    voucher_number: original.voucher_number,
    notes: reversalNote,
    correction_of_movement_id: original.id,
    correction_reason: parsed.data.reason,
    created_by: user?.id ?? null,
  });

  if (reversalError) {
    return { error: "Impossibile registrare lo storno." };
  }

  if (!parsed.data.reversalOnly) {
    const { error: replacementError } = await supabase.from("pallet_movements").insert({
      organization_id: membership.organizationId,
      counterparty_id: original.counterparty_id,
      pallet_type_id: original.pallet_type_id,
      site_id: original.site_id,
      movement_date: parsed.data.movementDate || original.movement_date,
      direction: parsed.data.direction || (original.direction as Direction),
      quantity: parsed.data.quantity ?? original.quantity,
      document_type: parsed.data.documentType || original.document_type,
      document_number: parsed.data.documentNumber || original.document_number,
      voucher_number: original.voucher_number,
      notes: `Sostituisce il movimento errato del ${original.movement_date}. Motivo: ${parsed.data.reason}`,
      correction_of_movement_id: original.id,
      correction_reason: parsed.data.reason,
      created_by: user?.id ?? null,
    });

    if (replacementError) {
      return {
        error:
          "Storno registrato ma la creazione del movimento corretto è fallita. Aggiungilo manualmente per completare la correzione.",
      };
    }
  }

  revalidatePath("/movements");
  revalidatePath("/reconciliation");
  revalidatePath("/dashboard");
  return { message: parsed.data.reversalOnly ? "Movimento stornato." : "Movimento corretto." };
}
