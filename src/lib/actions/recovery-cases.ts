"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireMembership } from "@/lib/data/organization";
import { addRecoveryEventSchema, createRecoveryCaseSchema } from "@/lib/validation/recovery-case";
import type { FormState } from "@/lib/actions/form-state";

function generateReference(): string {
  const today = new Date();
  const datePart = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const shortId = crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
  return `RC-${datePart}-${shortId}`;
}

export async function createRecoveryCaseAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const membership = await requireMembership();
  const parsed = createRecoveryCaseSchema.safeParse({
    counterpartyId: formData.get("counterpartyId"),
    palletTypeId: formData.get("palletTypeId"),
    voucherId: formData.get("voucherId"),
    quantityClaimed: formData.get("quantityClaimed"),
    dueDate: formData.get("dueDate"),
    priority: formData.get("priority"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const supabase = await createClient();
  const { data: palletType, error: palletTypeError } = await supabase
    .from("pallet_types")
    .select("unit_value")
    .eq("organization_id", membership.organizationId)
    .eq("id", parsed.data.palletTypeId)
    .maybeSingle();

  if (palletTypeError || !palletType) {
    return { error: "Tipo pallet non trovato." };
  }

  // counterparty_id/voucher_id foreign keys are validated across the whole
  // table regardless of RLS, so without this check a crafted request could
  // link a case to another organization's counterparty/voucher row even
  // though the insert itself stays scoped to this organization_id.
  const { data: counterparty, error: counterpartyError } = await supabase
    .from("counterparties")
    .select("id")
    .eq("organization_id", membership.organizationId)
    .eq("id", parsed.data.counterpartyId)
    .maybeSingle();

  if (counterpartyError || !counterparty) {
    return { error: "Controparte non trovata." };
  }

  if (parsed.data.voucherId) {
    const { data: voucher, error: voucherError } = await supabase
      .from("vouchers")
      .select("id")
      .eq("organization_id", membership.organizationId)
      .eq("id", parsed.data.voucherId)
      .maybeSingle();

    if (voucherError || !voucher) {
      return { error: "Buono non trovato." };
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: created, error } = await supabase
    .from("recovery_cases")
    .insert({
      organization_id: membership.organizationId,
      counterparty_id: parsed.data.counterpartyId,
      pallet_type_id: parsed.data.palletTypeId,
      voucher_id: parsed.data.voucherId || null,
      reference: generateReference(),
      due_date: parsed.data.dueDate || null,
      quantity_claimed: parsed.data.quantityClaimed,
      unit_value_snapshot: palletType.unit_value,
      priority: parsed.data.priority,
      notes: parsed.data.notes || null,
    })
    .select("id")
    .single();

  if (error || !created) {
    return { error: "Impossibile creare la pratica. Verifica i permessi." };
  }

  await supabase.from("recovery_events").insert({
    organization_id: membership.organizationId,
    recovery_case_id: created.id,
    event_type: "created",
    actor_user_id: user?.id ?? null,
  });

  revalidatePath("/recovery-cases");
  redirect(`/recovery-cases/${created.id}`);
}

const RPC_ERROR_MESSAGES: Record<string, string> = {
  "quantity must be a positive integer": "Inserisci una quantità intera positiva.",
  "would exceed claimed quantity": "La quantità recuperata supererebbe quella richiesta.",
  "recovery case not found or not accessible": "Pratica non trovata.",
  "update blocked": "Permessi insufficienti per aggiornare questa pratica.",
};

function mapRpcError(message: string): string {
  for (const [needle, friendly] of Object.entries(RPC_ERROR_MESSAGES)) {
    if (message.includes(needle)) return friendly;
  }
  return "Impossibile registrare l'evento.";
}

export async function addRecoveryEventAction(
  caseId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireMembership();
  const parsed = addRecoveryEventSchema.safeParse({
    eventType: formData.get("eventType"),
    quantity: formData.get("quantity") || undefined,
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_recovery_event", {
    p_case_id: caseId,
    p_event_type: parsed.data.eventType,
    p_quantity: parsed.data.quantity ?? undefined,
    p_notes: parsed.data.notes || undefined,
  });

  if (error) {
    return { error: mapRpcError(error.message) };
  }

  revalidatePath(`/recovery-cases/${caseId}`);
  revalidatePath("/recovery-cases");
  revalidatePath("/dashboard");
  return { message: "Evento registrato." };
}
