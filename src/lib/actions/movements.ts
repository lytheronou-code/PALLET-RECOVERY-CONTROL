"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireMembership } from "@/lib/data/organization";
import { buildCorrectMovementSchema } from "@/lib/validation/movement-correction";
import { mapKeyedError } from "@/lib/errors/friendly";
import { getT } from "@/i18n/server";
import type { TranslationKey } from "@/i18n/translator";
import type { FormState } from "@/lib/actions/form-state";

const RPC_ERROR_RULES: ReadonlyArray<readonly [string, TranslationKey]> = [
  ["movement not found or not accessible", "movements.errors.originalMovementNotFound"],
  ["already been corrected", "movements.errors.alreadyCorrected"],
  ["correction reason of at least 3 characters", "movements.validation.reasonTooShort"],
  ["quantity must be a positive integer", "common.validation.mustBePositive"],
  ["direction must be inbound or outbound", "movements.errors.invalidDirection"],
  ["must belong to the same counterparty", "movements.errors.siteDifferentCounterparty"],
  ["movement corrections must be created through", "common.errors.forbidden"],
  ["row-level security policy", "common.errors.forbidden"],
];

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
  const membership = await requireMembership();
  const { t } = await getT(membership.organizationId);
  const parsed = buildCorrectMovementSchema(t).safeParse({
    reason: formData.get("reason"),
    reversalOnly: formData.get("reversalOnly") === "on",
    movementDate: formData.get("movementDate") || undefined,
    quantity: formData.get("quantity") || undefined,
    direction: formData.get("direction") || undefined,
    documentType: formData.get("documentType"),
    documentNumber: formData.get("documentNumber"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("common.errors.generic") };
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
    return { error: mapKeyedError(error.message, RPC_ERROR_RULES, "movements.errors.correctionFailed", t) };
  }

  revalidatePath("/movements");
  revalidatePath("/reconciliation");
  revalidatePath("/dashboard");
  return { message: parsed.data.reversalOnly ? t("movements.errors.reversedMessage") : t("movements.errors.correctedMessage") };
}
