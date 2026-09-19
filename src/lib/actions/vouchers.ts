"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireMembership } from "@/lib/data/organization";
import { buildVoucherEditSchema, buildVoucherSchema } from "@/lib/validation/voucher";
import { mapKeyedError } from "@/lib/errors/friendly";
import { getT } from "@/i18n/server";
import type { TranslationKey } from "@/i18n/translator";
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
  const { t } = await getT(membership.organizationId);
  const parsed = buildVoucherSchema(t).safeParse({
    counterpartyId: formData.get("counterpartyId"),
    palletTypeId: formData.get("palletTypeId"),
    siteId: formData.get("siteId"),
    voucherNumber: formData.get("voucherNumber"),
    issueDate: formData.get("issueDate"),
    recoveryDueDate: formData.get("recoveryDueDate"),
    quantity: formData.get("quantity"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? t("common.errors.generic") };

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

  if (!counterparty) return { error: t("vouchers.errors.counterpartyNotFoundOrInactive") };
  if (!palletType) return { error: t("vouchers.errors.palletTypeNotFoundOrInactive") };

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
    const createRules: ReadonlyArray<readonly [string, TranslationKey]> = [
      ["site must belong to the same counterparty", "vouchers.errors.siteDifferentCounterparty"],
    ];
    if (error.code === "23505") return { error: t("vouchers.errors.duplicateNumber") };
    return { error: mapKeyedError(error.message, createRules, "vouchers.errors.createFailed", t) };
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
  const { t } = await getT(membership.organizationId);
  const parsed = buildVoucherEditSchema(t).safeParse({
    voucherNumber: formData.get("voucherNumber"),
    issueDate: formData.get("issueDate"),
    recoveryDueDate: formData.get("recoveryDueDate"),
    quantity: formData.get("quantity"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? t("common.errors.generic") };

  const supabase = await createClient();
  const { data: voucher } = await supabase
    .from("vouchers")
    .select("recovered_quantity, quantity, status")
    .eq("organization_id", membership.organizationId)
    .eq("id", id)
    .maybeSingle();

  if (!voucher) return { error: t("vouchers.errors.notFound") };
  if (voucher.status === "cancelled") return { error: t("vouchers.errors.cancelledCannotEdit") };
  if (parsed.data.quantity < voucher.recovered_quantity) {
    return { error: t("vouchers.errors.quantityBelowRecovered") };
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
        error: t("vouchers.errors.newQuantityBelowCommitted", { residual: newResidual, committed: committedOutstanding }),
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
    const updateRules: ReadonlyArray<readonly [string, TranslationKey]> = [
      ["outstanding linked recovery commitments", "vouchers.errors.quantityBelowActiveCommitments"],
    ];
    if (error.code === "23505") return { error: t("vouchers.errors.duplicateNumber") };
    return { error: mapKeyedError(error.message, updateRules, "vouchers.errors.updateFailed", t) };
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
  const { t } = await getT(membership.organizationId);
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

  if (!voucher) return { error: t("vouchers.errors.notFound") };
  if (voucher.status === "cancelled") return { message: t("vouchers.errors.alreadyCancelled") };
  if (voucher.recovered_quantity > 0) return { error: t("vouchers.errors.cannotCancelWithRecoveries") };
  if ((linkedCases ?? 0) > 0) return { error: t("vouchers.errors.cannotCancelLinkedToCase") };

  const { error } = await supabase
    .from("vouchers")
    .update({ status: "cancelled" })
    .eq("organization_id", membership.organizationId)
    .eq("id", id);

  if (error) return { error: t("vouchers.errors.cancelFailed") };

  revalidateVoucherViews(id);
  return { message: t("vouchers.errors.cancelled") };
}
