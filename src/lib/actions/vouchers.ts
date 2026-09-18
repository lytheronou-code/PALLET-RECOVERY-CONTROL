"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireMembership } from "@/lib/data/organization";
import { voucherEditSchema, voucherSchema } from "@/lib/validation/voucher";
import type { FormState } from "@/lib/actions/form-state";

const ACTIVE_CASE_STATUSES = ["open", "contacted", "scheduled", "partial", "disputed"];

function revalidateVoucherViews(id?: string) {
  revalidatePath("/vouchers");
  revalidatePath("/dashboard");
  revalidatePath("/reconciliation");
  if (id) revalidatePath("/vouchers/" + id);
}

export async function createVoucherAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const membership = await requireMembership();
  const parsed = voucherSchema.safeParse({
    counterpartyId: formData.get("counterpartyId"),
    palletTypeId: formData.get("palletTypeId"),
    siteId: formData.get("siteId"),
    voucherNumber: formData.get("voucherNumber"),
    issueDate: formData.get("issueDate"),
    recoveryDueDate: formData.get("recoveryDueDate"),
    quantity: formData.get("quantity"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };

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
    site_id: parsed.data.siteId || null,
    voucher_number: parsed.data.voucherNumber,
    issue_date: parsed.data.issueDate,
    recovery_due_date: parsed.data.recoveryDueDate || null,
    quantity: parsed.data.quantity,
    notes: parsed.data.notes || null,
  });

  if (error) {
    if (error.code === "23505") return { error: "Esiste già un buono con questo numero." };
    if (error.message.includes("site must belong to the same counterparty")) {
      return { error: "Il sito selezionato non appartiene alla controparte scelta." };
    }
    return { error: "Impossibile creare il buono." };
  }

  revalidateVoucherViews();
  redirect("/vouchers");
}

export async function updateVoucherAction(
  id: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const membership = await requireMembership();
  const parsed = voucherEditSchema.safeParse({
    voucherNumber: formData.get("voucherNumber"),
    issueDate: formData.get("issueDate"),
    recoveryDueDate: formData.get("recoveryDueDate"),
    quantity: formData.get("quantity"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  const supabase = await createClient();
  const { data: voucher } = await supabase
    .from("vouchers")
    .select("recovered_quantity, quantity, status")
    .eq("organization_id", membership.organizationId)
    .eq("id", id)
    .maybeSingle();

  if (!voucher) return { error: "Buono non trovato." };
  if (voucher.status === "cancelled") return { error: "Un buono annullato non può essere modificato." };
  if (parsed.data.quantity < voucher.recovered_quantity) {
    return { error: "La quantità non può essere inferiore a quanto già recuperato." };
  }

  if (parsed.data.quantity !== voucher.quantity) {
    const { data: activeCases } = await supabase
      .from("recovery_cases")
      .select("quantity_claimed, quantity_recovered")
      .eq("organization_id", membership.organizationId)
      .eq("voucher_id", id)
      .in("status", ACTIVE_CASE_STATUSES);

    const committedOutstanding = (activeCases ?? []).reduce(
      (sum, item) => sum + (item.quantity_claimed - item.quantity_recovered),
      0,
    );
    const newResidual = parsed.data.quantity - voucher.recovered_quantity;

    if (committedOutstanding > newResidual) {
      return {
        error:
          "La nuova quantità lascerebbe solo " +
          newResidual +
          " pallet residui, ma le pratiche attive ne impegnano " +
          committedOutstanding +
          ".",
      };
    }
  }

  const nextStatus =
    voucher.status === "disputed"
      ? "disputed"
      : parsed.data.quantity === voucher.recovered_quantity
        ? "closed"
        : voucher.recovered_quantity > 0
          ? "partial"
          : "open";

  const { error } = await supabase
    .from("vouchers")
    .update({
      voucher_number: parsed.data.voucherNumber,
      issue_date: parsed.data.issueDate,
      recovery_due_date: parsed.data.recoveryDueDate || null,
      quantity: parsed.data.quantity,
      notes: parsed.data.notes || null,
      status: nextStatus,
    })
    .eq("organization_id", membership.organizationId)
    .eq("id", id);

  if (error) {
    const message = error.message.includes("outstanding linked recovery commitments")
      ? "La quantità non può essere inferiore agli impegni delle pratiche attive."
      : error.code === "23505"
        ? "Esiste già un buono con questo numero."
        : "Impossibile aggiornare il buono.";
    return { error: message };
  }

  revalidateVoucherViews(id);
  redirect("/vouchers/" + id);
}

export async function cancelVoucherAction(
  id: string,
  _prevState: FormState,
  _formData: FormData,
): Promise<FormState> {
  const membership = await requireMembership();
  const supabase = await createClient();

  const [{ data: voucher }, { count: linkedCases }] = await Promise.all([
    supabase
      .from("vouchers")
      .select("recovered_quantity, status")
      .eq("organization_id", membership.organizationId)
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("recovery_cases")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", membership.organizationId)
      .eq("voucher_id", id),
  ]);

  if (!voucher) return { error: "Buono non trovato." };
  if (voucher.status === "cancelled") return { message: "Buono già annullato." };
  if (voucher.recovered_quantity > 0) return { error: "Non puoi annullare un buono con recuperi già registrati." };
  if ((linkedCases ?? 0) > 0) return { error: "Non puoi annullare un buono collegato a una pratica di recupero." };

  const { error } = await supabase
    .from("vouchers")
    .update({ status: "cancelled" })
    .eq("organization_id", membership.organizationId)
    .eq("id", id);

  if (error) return { error: "Impossibile annullare il buono." };

  revalidateVoucherViews(id);
  return { message: "Buono annullato." };
}
