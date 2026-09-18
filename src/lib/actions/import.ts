"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireMembership } from "@/lib/data/organization";
import { movementImportPayloadSchema, voucherImportPayloadSchema } from "@/lib/validation/import";
import { buildLookupKey, validateMovementRows, type MovementLookups } from "@/lib/csv/movement-import";
import { validateVoucherRows, type VoucherLookups } from "@/lib/csv/voucher-import";
import { buildSiteLookup } from "@/lib/csv/site-lookup";

export type ImportActionState = {
  error?: string;
};

const INSERT_CHUNK_SIZE = 500;

export async function commitMovementImportAction(
  _prevState: ImportActionState,
  formData: FormData,
): Promise<ImportActionState> {
  const membership = await requireMembership();
  const supabase = await createClient();

  const rawPayload = formData.get("payload");
  if (typeof rawPayload !== "string") {
    return { error: "Payload di import mancante." };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawPayload);
  } catch {
    return { error: "Payload di import non valido." };
  }

  const parsed = movementImportPayloadSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Payload di import non valido." };
  }
  const { filename, headers, rows, mapping } = parsed.data;

  if (rows.length === 0) {
    return { error: "Il file non contiene righe da importare." };
  }

  // Re-validate from scratch server-side with fresh lookups: never trust the
  // client's computed validity, only the raw parsed rows.
  const [{ data: counterparties }, { data: palletTypes }, { data: sites }] = await Promise.all([
    supabase
      .from("counterparties")
      .select("id, code, legal_name")
      .eq("organization_id", membership.organizationId),
    supabase.from("pallet_types").select("id, code").eq("organization_id", membership.organizationId),
    supabase.from("sites").select("id, code, name, counterparty_id").eq("organization_id", membership.organizationId).eq("active", true),
  ]);

  const lookups: MovementLookups = {
    counterpartyIdByKey: new Map(),
    palletTypeIdByKey: new Map(),
    siteLookup: buildSiteLookup(
      (sites ?? []).map((s) => ({ id: s.id, code: s.code, name: s.name, counterpartyId: s.counterparty_id })),
    ),
  };
  for (const cp of counterparties ?? []) {
    if (cp.code) lookups.counterpartyIdByKey.set(buildLookupKey(cp.code), cp.id);
    lookups.counterpartyIdByKey.set(buildLookupKey(cp.legal_name), cp.id);
  }
  for (const pt of palletTypes ?? []) {
    lookups.palletTypeIdByKey.set(buildLookupKey(pt.code), pt.id);
  }

  const results = validateMovementRows(headers, rows, mapping, lookups);
  const validMovements = results.filter((r) => r.valid).map((r) => r.movement);
  const rowsValid = validMovements.length;
  const rowsInvalid = results.length - rowsValid;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .insert({
      organization_id: membership.organizationId,
      source_type: "movements",
      filename,
      status: "processing",
      rows_total: rows.length,
      rows_valid: 0,
      rows_invalid: 0,
      imported_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (batchError || !batch) {
    return { error: "Impossibile creare il batch di import." };
  }

  let insertedCount = 0;
  for (let i = 0; i < validMovements.length; i += INSERT_CHUNK_SIZE) {
    const chunk = validMovements.slice(i, i + INSERT_CHUNK_SIZE).map((movement) => ({
      ...movement,
      organization_id: membership.organizationId,
      source_batch_id: batch.id,
      created_by: user?.id ?? null,
    }));

    const { error: insertError } = await supabase.from("pallet_movements").insert(chunk);
    if (insertError) {
      // Earlier chunks in this loop already committed; reflect that instead
      // of claiming the batch made no changes.
      await supabase
        .from("import_batches")
        .update({
          status: "failed",
          rows_valid: insertedCount,
          rows_invalid: rows.length - insertedCount,
          completed_at: new Date().toISOString(),
        })
        .eq("id", batch.id);
      return {
        error: `Import interrotto dopo aver salvato ${insertedCount} righe. Controlla il batch #${batch.id} prima di reimportare il resto.`,
      };
    }
    insertedCount += chunk.length;
  }

  await supabase
    .from("import_batches")
    .update({
      status: "completed",
      rows_valid: rowsValid,
      rows_invalid: rowsInvalid,
      completed_at: new Date().toISOString(),
    })
    .eq("id", batch.id);

  revalidatePath("/import");
  redirect(`/import/${batch.id}`);
}

export async function commitVoucherImportAction(
  _prevState: ImportActionState,
  formData: FormData,
): Promise<ImportActionState> {
  const membership = await requireMembership();
  const supabase = await createClient();

  const rawPayload = formData.get("payload");
  if (typeof rawPayload !== "string") {
    return { error: "Payload di import mancante." };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawPayload);
  } catch {
    return { error: "Payload di import non valido." };
  }

  const parsed = voucherImportPayloadSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Payload di import non valido." };
  }
  const { filename, headers, rows, mapping } = parsed.data;

  if (rows.length === 0) {
    return { error: "Il file non contiene righe da importare." };
  }

  // Re-validate from scratch server-side with fresh lookups: never trust the
  // client's computed validity, only the raw parsed rows.
  const [{ data: counterparties }, { data: palletTypes }, { data: existingVouchers }, { data: sites }] =
    await Promise.all([
      supabase
        .from("counterparties")
        .select("id, code, legal_name")
        .eq("organization_id", membership.organizationId),
      supabase.from("pallet_types").select("id, code").eq("organization_id", membership.organizationId),
      supabase.from("vouchers").select("voucher_number").eq("organization_id", membership.organizationId),
      supabase
        .from("sites")
        .select("id, code, name, counterparty_id")
        .eq("organization_id", membership.organizationId)
        .eq("active", true),
    ]);

  const lookups: VoucherLookups = {
    counterpartyIdByKey: new Map(),
    palletTypeIdByKey: new Map(),
    existingVoucherNumbers: new Set(),
    siteLookup: buildSiteLookup(
      (sites ?? []).map((s) => ({ id: s.id, code: s.code, name: s.name, counterpartyId: s.counterparty_id })),
    ),
  };
  for (const cp of counterparties ?? []) {
    if (cp.code) lookups.counterpartyIdByKey.set(buildLookupKey(cp.code), cp.id);
    lookups.counterpartyIdByKey.set(buildLookupKey(cp.legal_name), cp.id);
  }
  for (const pt of palletTypes ?? []) {
    lookups.palletTypeIdByKey.set(buildLookupKey(pt.code), pt.id);
  }
  for (const v of existingVouchers ?? []) {
    lookups.existingVoucherNumbers.add(buildLookupKey(v.voucher_number));
  }

  const results = validateVoucherRows(headers, rows, mapping, lookups);
  const validVouchers = results.filter((r) => r.valid).map((r) => r.voucher);
  const rowsValid = validVouchers.length;
  const rowsInvalid = results.length - rowsValid;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .insert({
      organization_id: membership.organizationId,
      source_type: "vouchers",
      filename,
      status: "processing",
      rows_total: rows.length,
      rows_valid: 0,
      rows_invalid: 0,
      imported_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (batchError || !batch) {
    return { error: "Impossibile creare il batch di import." };
  }

  let insertedCount = 0;
  for (let i = 0; i < validVouchers.length; i += INSERT_CHUNK_SIZE) {
    const chunk = validVouchers.slice(i, i + INSERT_CHUNK_SIZE).map((voucher) => ({
      ...voucher,
      organization_id: membership.organizationId,
      source_batch_id: batch.id,
    }));

    const { error: insertError } = await supabase.from("vouchers").insert(chunk);
    if (insertError) {
      // Earlier chunks in this loop already committed; reflect that instead
      // of claiming the batch made no changes.
      await supabase
        .from("import_batches")
        .update({
          status: "failed",
          rows_valid: insertedCount,
          rows_invalid: rows.length - insertedCount,
          completed_at: new Date().toISOString(),
        })
        .eq("id", batch.id);
      return {
        error: `Import interrotto dopo aver salvato ${insertedCount} righe. Controlla il batch #${batch.id} prima di reimportare il resto.`,
      };
    }
    insertedCount += chunk.length;
  }

  await supabase
    .from("import_batches")
    .update({
      status: "completed",
      rows_valid: rowsValid,
      rows_invalid: rowsInvalid,
      completed_at: new Date().toISOString(),
    })
    .eq("id", batch.id);

  revalidatePath("/vouchers");
  revalidatePath("/import/vouchers");
  redirect(`/import/${batch.id}`);
}
