"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireMembership } from "@/lib/data/organization";
import { buildAddRecoveryEventSchema, buildCreateRecoveryCaseSchema } from "@/lib/validation/recovery-case";
import { mapKeyedError } from "@/lib/errors/friendly";
import { getT } from "@/i18n/server";
import type { TranslationKey } from "@/i18n/translator";
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
  const { t } = await getT(membership.organizationId);
  const parsed = buildCreateRecoveryCaseSchema(t).safeParse({
    counterpartyId: formData.get("counterpartyId"),
    palletTypeId: formData.get("palletTypeId"),
    voucherId: formData.get("voucherId"),
    siteId: formData.get("siteId"),
    quantityClaimed: formData.get("quantityClaimed"),
    dueDate: formData.get("dueDate"),
    priority: formData.get("priority"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("common.errors.generic") };
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

  if (palletTypeError || !palletType) return { error: t("recoveryCases.errors.palletTypeNotFound") };
  if (counterpartyError || !counterparty) return { error: t("recoveryCases.errors.counterpartyNotFound") };

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

    if (voucherError || !voucher) return { error: t("recoveryCases.errors.voucherNotFound") };

    if (
      voucher.counterparty_id !== parsed.data.counterpartyId ||
      voucher.pallet_type_id !== parsed.data.palletTypeId
    ) {
      return { error: t("recoveryCases.errors.voucherCounterpartyOrPalletTypeMismatch") };
    }

    if (voucher.status === "closed" || voucher.status === "cancelled") {
      return { error: t("recoveryCases.errors.voucherClosedOrCancelled") };
    }

    const voucherOutstanding = voucher.quantity - voucher.recovered_quantity;
    if (parsed.data.quantityClaimed > voucherOutstanding) {
      return { error: t("recoveryCases.errors.quantityExceedsVoucherOutstanding", { outstanding: voucherOutstanding }) };
    }

    if ((activeCases ?? 0) > 0) {
      return { error: t("recoveryCases.errors.activeCaseAlreadyLinked") };
    }
  }

  const { data: created, error } = await supabase
    .from("recovery_cases")
    .insert({
      organization_id: membership.organizationId,
      counterparty_id: parsed.data.counterpartyId,
      pallet_type_id: parsed.data.palletTypeId,
      voucher_id: parsed.data.voucherId || null,
      site_id: parsed.data.siteId || null,
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
    const createRules: ReadonlyArray<readonly [string, TranslationKey]> = [
      ["recovery case quantity exceeds voucher outstanding quantity", "recoveryCases.errors.quantityExceedsVoucherResidual"],
      ["site must belong to the same counterparty", "recoveryCases.errors.siteDifferentCounterparty"],
    ];
    return { error: mapKeyedError(error?.message, createRules, "recoveryCases.errors.createFailed", t) };
  }

  revalidateRecoveryViews(created.id);
  redirect("/recovery-cases/" + created.id);
}

const RPC_ERROR_RULES: ReadonlyArray<readonly [string, TranslationKey]> = [
  ["quantity must be a positive integer", "common.validation.mustBePositive"],
  ["would exceed claimed quantity", "recoveryCases.errors.recoveredExceedsClaimed"],
  ["voucher recovered quantity", "recoveryCases.errors.recoveryExceedsVoucherResidual"],
  ["full_recovery quantity must equal remaining quantity", "recoveryCases.errors.fullRecoveryMustCoverRemaining"],
  ["closed recovery case only accepts note events", "recoveryCases.errors.closedCaseOnlyNotes"],
  ["recovery case not found or not accessible", "recoveryCases.errors.caseNotFound"],
  ["update blocked", "common.errors.forbidden"],
];

export async function assignRecoveryCaseAction(
  caseId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const membership = await requireMembership();
  const { t } = await getT(membership.organizationId);
  const raw = formData.get("assigneeUserId");
  const assigneeUserId = typeof raw === "string" && raw.length > 0 ? raw : null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("recovery_cases")
    .update({ assignee_user_id: assigneeUserId })
    .eq("organization_id", membership.organizationId)
    .eq("id", caseId);

  if (error) {
    const assignRules: ReadonlyArray<readonly [string, TranslationKey]> = [
      ["assignee must be a member of the organization", "recoveryCases.errors.assigneeNotMember"],
    ];
    return { error: mapKeyedError(error.message, assignRules, "recoveryCases.errors.assignFailed", t) };
  }

  revalidateRecoveryViews(caseId);
  return { message: assigneeUserId ? t("recoveryCases.errors.assigned") : t("recoveryCases.errors.unassigned") };
}

export async function addRecoveryEventAction(
  caseId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const membership = await requireMembership();
  const { t } = await getT(membership.organizationId);
  const parsed = buildAddRecoveryEventSchema(t).safeParse({
    eventType: formData.get("eventType"),
    quantity: formData.get("quantity") || undefined,
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("common.errors.generic") };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_recovery_event", {
    p_case_id: caseId,
    p_event_type: parsed.data.eventType,
    p_quantity: parsed.data.quantity ?? undefined,
    p_notes: parsed.data.notes || undefined,
  });

  if (error) return { error: mapKeyedError(error.message, RPC_ERROR_RULES, "recoveryCases.errors.eventFailed", t) };

  revalidateRecoveryViews(caseId);
  return { message: t("recoveryCases.errors.eventRecorded") };
}
