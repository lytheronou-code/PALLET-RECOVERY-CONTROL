"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireMembership } from "@/lib/data/organization";
import { addRecoveryEventSchema, createRecoveryCaseSchema } from "@/lib/validation/recovery-case";
import type { FormState } from "@/lib/actions/form-state";

const ACTIVE_CASE_STATUSES = ["open", "contacted", "scheduled", "partial", "disputed"];

function generateReference(): string {
  const today = new Date();
  const datePart =
    String(today.getFullYear()) +
    String(today.getMonth() + 1).padStart(2, "0") +
    String(today.getDate()).padStart(2, "0");
  const shortId = crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
  return "RC-" + datePart + "-" + shortId;
}

function revalidateRecoveryViews(caseId?: string) {
  revalidatePath("/recovery-cases");
  revalidatePath("/dashboard");
  revalidatePath("/reconciliation");
  revalidatePath("/vouchers");
  if (caseId) revalidatePath("/recovery-cases/" + caseId);
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
  const [{ data: palletType, error: palletTypeError }, { data: counterparty, error: counterpartyError }] =
    await Promise.all([
      supabase
        .from("pallet_types")
        .select("unit_value")
        .eq("organization_id", membership.organizationId)
        .eq("id", parsed.data.palletTypeId)
        .maybeSingle(),
      supabase
        .from("counterparties")
        .select("id")
        .eq("organization_id", membership.organizationId)
        .eq("id", parsed.data.counterpartyId)
        .maybeSingle(),
    ]);

  if (palletTypeError || !palletType) return { error: "Tipo pallet non trovato." };
  if (counterpartyError || !counterparty) return { error: "Controparte non trovata." };

  if (parsed.data.voucherId) {
    const [{ data: voucher, error: voucherError }, { count: activeCases }] = await Promise.all([
      supabase
        .from("vouchers")
        .select("id, counterparty_id, pallet_type_id, quantity, recovered_quantity, status")
        .eq("organization_id", membership.organizationId)
        .eq("id", parsed.data.voucherId)
        .maybeSingle(),
      supabase
        .from("recovery_cases")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", membership.organizationId)
        .eq("voucher_id", parsed.data.voucherId)
        .in("status", ACTIVE_CASE_STATUSES),
    ]);

    if (voucherError || !voucher) return { error: "Buono non trovato." };

    if (
      voucher.counterparty_id !== parsed.data.counterpartyId ||
      voucher.pallet_type_id !== parsed.data.palletTypeId
    ) {
      return { error: "Il buono selezionato non appartiene alla stessa controparte e allo stesso tipo pallet." };
    }

    if (voucher.status === "closed" || voucher.status === "cancelled") {
      return { error: "Il buono è chiuso o annullato e non può generare una nuova pratica." };
    }

    const voucherOutstanding = voucher.quantity - voucher.recovered_quantity;
    if (parsed.data.quantityClaimed > voucherOutstanding) {
      return { error: "La quantità supera il residuo del buono (" + voucherOutstanding + " pallet)." };
    }

    if ((activeCases ?? 0) > 0) {
      return { error: "Esiste già una pratica attiva collegata a questo buono." };
    }
  }

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
    if (error?.message.includes("recovery case quantity exceeds voucher outstanding quantity")) {
      return { error: "La quantità richiesta supera il residuo disponibile del buono." };
    }
    return { error: "Impossibile creare la pratica. Verifica dati e permessi." };
  }

  revalidateRecoveryViews(created.id);
  redirect("/recovery-cases/" + created.id);
}

const RPC_ERROR_MESSAGES: Record<string, string> = {
  "quantity must be a positive integer": "Inserisci una quantità intera positiva.",
  "would exceed claimed quantity": "La quantità recuperata supererebbe quella richiesta.",
  "voucher recovered quantity": "Il recupero supererebbe il residuo del buono collegato.",
  "full_recovery quantity must equal remaining quantity": "Il recupero completo deve coprire tutto il residuo.",
  "closed recovery case only accepts note events": "La pratica è chiusa; puoi aggiungere solo una nota.",
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

  if (error) return { error: mapRpcError(error.message) };

  revalidateRecoveryViews(caseId);
  return { message: "Evento registrato." };
}
