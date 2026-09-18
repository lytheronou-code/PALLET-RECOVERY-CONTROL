"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireMembership } from "@/lib/data/organization";
import { correctMovementSchema } from "@/lib/validation/movement-correction";
import type { FormState } from "@/lib/actions/form-state";

const RPC_ERROR_MESSAGES: Record<string, string> = {
  "movement not found or not accessible": "Movimento originale non trovato.",
  "already been corrected": "Questo movimento è già stato corretto in precedenza.",
  "correction reason of at least 3 characters": "Il motivo della correzione deve avere almeno 3 caratteri.",
  "quantity must be a positive integer": "Inserisci una quantità intera positiva per il movimento corretto.",
  "direction must be inbound or outbound": "Seleziona una direzione valida per il movimento corretto.",
  "must belong to the same counterparty": "Il sito selezionato non appartiene alla controparte del movimento.",
  "movement corrections must be created through": "Permessi insufficienti per correggere questo movimento.",
  "row-level security policy": "Permessi insufficienti per correggere questo movimento.",
};

function mapCorrectionError(message: string): string {
  for (const [needle, friendly] of Object.entries(RPC_ERROR_MESSAGES)) {
    if (message.includes(needle)) return friendly;
  }
  return "Impossibile registrare la correzione.";
}

// The movement ledger is immutable (no UPDATE policy on pallet_movements),
// so a wrong row can only be fixed by inserting new, linked rows: a
// reversal that cancels it out, and -- unless the original should never
// have existed at all -- a corrected replacement. Both inserts, the
// original-row lock and the double-correction check now live in the
// correct_pallet_movement() RPC so they run as one atomic transaction
// instead of two independent Supabase calls from this action (see the
// correct_pallet_movement_rpc migration for the threat model this closes).
export async function correctMovementAction(
  originalMovementId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireMembership();
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
  const { error } = await supabase.rpc("correct_pallet_movement", {
    p_movement_id: originalMovementId,
    p_reason: parsed.data.reason,
    p_reversal_only: parsed.data.reversalOnly,
    p_movement_date: parsed.data.movementDate || undefined,
    p_direction: parsed.data.direction || undefined,
    p_quantity: parsed.data.quantity ?? undefined,
    p_document_type: parsed.data.documentType || undefined,
    p_document_number: parsed.data.documentNumber || undefined,
  });

  if (error) {
    return { error: mapCorrectionError(error.message) };
  }

  revalidatePath("/movements");
  revalidatePath("/reconciliation");
  revalidatePath("/dashboard");
  return { message: parsed.data.reversalOnly ? "Movimento stornato." : "Movimento corretto." };
}
