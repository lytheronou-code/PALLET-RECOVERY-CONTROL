"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireMembership } from "@/lib/data/organization";
import { buildUploadDocumentSchema } from "@/lib/validation/document";
import {
  buildDocumentStoragePath,
  matchesFileSignature,
  readFileHeader,
  validateDocumentFile,
  type DocumentEntity,
} from "@/lib/documents/storage-path";
import { mapKeyedError } from "@/lib/errors/friendly";
import { getT } from "@/i18n/server";
import type { Translator, TranslationKey } from "@/i18n/translator";
import type { FormState } from "@/lib/actions/form-state";

export type DocumentLinkContext = {
  counterpartyId: string;
  entity: DocumentEntity;
  entityId: string;
  siteId?: string;
  movementId?: string;
  voucherId?: string;
  recoveryCaseId?: string;
  recoveryEventId?: string;
};

const RPC_ERROR_RULES: ReadonlyArray<readonly [string, TranslationKey]> = [
  ["linked movement belongs to a different counterparty", "documents.errors.linkedMovementDifferentCounterparty"],
  ["linked voucher belongs to a different counterparty", "documents.errors.linkedVoucherDifferentCounterparty"],
  ["linked recovery case belongs to a different counterparty", "documents.errors.linkedRecoveryCaseDifferentCounterparty"],
  ["linked recovery event belongs to a different counterparty", "documents.errors.linkedRecoveryEventDifferentCounterparty"],
  ["linked site belongs to a different counterparty", "documents.errors.linkedSiteDifferentCounterparty"],
  ["row-level security policy", "common.errors.forbidden"],
];

function mapDocumentError(message: string, t: Translator): string {
  return mapKeyedError(message, RPC_ERROR_RULES, "documents.errors.operationFailed", t);
}

function revalidateDocumentViews(link: Pick<DocumentLinkContext, "counterpartyId" | "recoveryCaseId" | "voucherId" | "movementId">) {
  if (link.recoveryCaseId) revalidatePath("/recovery-cases/" + link.recoveryCaseId);
  if (link.voucherId) revalidatePath("/vouchers/" + link.voucherId);
  if (link.movementId) revalidatePath("/movements");
  revalidatePath("/counterparties/" + link.counterpartyId);
}

// The link context (which counterparty/entity this upload attaches to) is
// bound server-side from the page's own already-authorized data (e.g. a
// recovery case detail page already knows its own counterpartyId), never
// taken from client-supplied form fields -- so a forged counterpartyId in
// the request body has no path to change what gets recorded.
export async function uploadDocumentAction(
  link: DocumentLinkContext,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const membership = await requireMembership();
  const { t } = await getT(membership.organizationId);

  const parsed = buildUploadDocumentSchema(t).safeParse({
    documentType: formData.get("documentType"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("common.errors.generic") };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: t("documents.errors.selectFileToUpload") };
  }

  const validation = validateDocumentFile({ type: file.type, size: file.size, name: file.name }, t);
  if (!validation.valid) {
    return { error: validation.error };
  }

  // Extension and declared MIME type are both just strings the uploader
  // controls -- a renamed executable can make both agree with each
  // other while being neither a PDF nor an image. Read only the leading
  // bytes (never the full file) and check them against the format's
  // real signature before ever touching Storage.
  const header = await readFileHeader(file);
  if (!matchesFileSignature(header, file.type)) {
    return { error: t("documents.errors.fileContentMismatch") };
  }

  const storagePath = buildDocumentStoragePath({
    organizationId: membership.organizationId,
    counterpartyId: link.counterpartyId,
    entity: link.entity,
    entityId: link.entityId,
    filename: file.name,
  });

  const supabase = await createClient();

  const { error: uploadError } = await supabase.storage.from("documents").upload(storagePath, file, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    return { error: t("documents.errors.uploadFailed") };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error: insertError } = await supabase.from("documents").insert({
    organization_id: membership.organizationId,
    counterparty_id: link.counterpartyId,
    site_id: link.siteId ?? null,
    movement_id: link.movementId ?? null,
    voucher_id: link.voucherId ?? null,
    recovery_case_id: link.recoveryCaseId ?? null,
    recovery_event_id: link.recoveryEventId ?? null,
    document_type: parsed.data.documentType,
    storage_path: storagePath,
    original_filename: file.name,
    mime_type: file.type,
    file_size: file.size,
    uploaded_by: user?.id ?? null,
    notes: parsed.data.notes || null,
  });

  if (insertError) {
    // The file is already in Storage but its metadata row failed to
    // commit -- remove the now-orphaned object rather than leave an
    // untracked file behind. It would also be permanently unreachable
    // anyway: the SELECT storage policy authorizes strictly through a
    // matching public.documents row, never through the raw path.
    await supabase.storage.from("documents").remove([storagePath]);
    return { error: mapDocumentError(insertError.message, t) };
  }

  revalidateDocumentViews(link);
  return { message: t("documents.errors.uploadSuccess") };
}

// Soft-delete only: marks the document superseded rather than removing it,
// preserving the file and its audit trail (see the documents_evidence_schema
// migration -- there is intentionally no DELETE path for documents in V1).
// Returns an explicit result rather than void: a failed RLS check or RPC
// error must never look like success in the UI.
export async function setDocumentStatusAction(
  documentId: string,
  status: "active" | "superseded",
  link: Pick<DocumentLinkContext, "counterpartyId" | "recoveryCaseId" | "voucherId" | "movementId">,
): Promise<{ error?: string }> {
  const membership = await requireMembership();
  const { t } = await getT(membership.organizationId);
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_document_state", { p_document_id: documentId, p_new_status: status });
  if (error) {
    return { error: mapDocumentError(error.message, t) };
  }
  revalidateDocumentViews(link);
  return {};
}

export async function setDocumentVisibilityAction(
  documentId: string,
  visibility: "internal" | "client",
  link: Pick<DocumentLinkContext, "counterpartyId" | "recoveryCaseId" | "voucherId" | "movementId">,
): Promise<{ error?: string }> {
  const membership = await requireMembership();
  const { t } = await getT(membership.organizationId);
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_document_state", {
    p_document_id: documentId,
    p_new_visibility: visibility,
  });
  if (error) {
    return { error: mapDocumentError(error.message, t) };
  }
  revalidateDocumentViews(link);
  return {};
}

// Called directly from client components (see listSitesForCounterpartyAction
// for the same pattern): the caller only ever gets a short-lived signed URL
// for a document their own organization membership already authorizes them
// to SELECT -- requireMembership() and the org-scoped documents lookup
// below ignore whatever the client claims.
export async function getSignedDocumentUrlAction(documentId: string): Promise<{ url: string } | { error: string }> {
  const membership = await requireMembership();
  const { t } = await getT(membership.organizationId);
  const supabase = await createClient();

  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("organization_id", membership.organizationId)
    .eq("id", documentId)
    .maybeSingle();

  if (docError || !doc) {
    return { error: t("common.errors.notFound") };
  }

  const { data, error } = await supabase.storage.from("documents").createSignedUrl(doc.storage_path, 60);
  if (error || !data) {
    return { error: t("documents.errors.downloadLinkFailed") };
  }

  return { url: data.signedUrl };
}
