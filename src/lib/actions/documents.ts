"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireMembership } from "@/lib/data/organization";
import { uploadDocumentSchema } from "@/lib/validation/document";
import { buildDocumentStoragePath, validateDocumentFile, type DocumentEntity } from "@/lib/documents/storage-path";
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

const RPC_ERROR_MESSAGES: Record<string, string> = {
  "linked movement belongs to a different counterparty": "Il movimento collegato appartiene a un'altra controparte.",
  "linked voucher belongs to a different counterparty": "Il buono collegato appartiene a un'altra controparte.",
  "linked recovery case belongs to a different counterparty": "La pratica collegata appartiene a un'altra controparte.",
  "linked recovery event belongs to a different counterparty": "L'evento collegato appartiene a un'altra controparte.",
  "linked site belongs to a different counterparty": "Il sito collegato appartiene a un'altra controparte.",
  "row-level security policy": "Permessi insufficienti per questa operazione.",
};

function mapDocumentError(message: string): string {
  for (const [needle, friendly] of Object.entries(RPC_ERROR_MESSAGES)) {
    if (message.includes(needle)) return friendly;
  }
  return "Operazione non riuscita.";
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

  const parsed = uploadDocumentSchema.safeParse({
    documentType: formData.get("documentType"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Seleziona un file da caricare." };
  }

  const validation = validateDocumentFile({ type: file.type, size: file.size, name: file.name });
  if (!validation.valid) {
    return { error: validation.error };
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
    return { error: "Impossibile caricare il file. Verifica formato e dimensione." };
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
    return { error: mapDocumentError(insertError.message) };
  }

  revalidateDocumentViews(link);
  return { message: "Documento caricato." };
}

// Soft-delete only: marks the document superseded rather than removing it,
// preserving the file and its audit trail (see the documents_evidence_schema
// migration -- there is intentionally no DELETE path for documents in V1).
export async function setDocumentStatusAction(
  documentId: string,
  status: "active" | "superseded",
  link: Pick<DocumentLinkContext, "counterpartyId" | "recoveryCaseId" | "voucherId" | "movementId">,
): Promise<void> {
  await requireMembership();
  const supabase = await createClient();
  await supabase.rpc("update_document_state", { p_document_id: documentId, p_new_status: status });
  revalidateDocumentViews(link);
}

export async function setDocumentVisibilityAction(
  documentId: string,
  visibility: "internal" | "client",
  link: Pick<DocumentLinkContext, "counterpartyId" | "recoveryCaseId" | "voucherId" | "movementId">,
): Promise<void> {
  await requireMembership();
  const supabase = await createClient();
  await supabase.rpc("update_document_state", { p_document_id: documentId, p_new_visibility: visibility });
  revalidateDocumentViews(link);
}

// Called directly from client components (see listSitesForCounterpartyAction
// for the same pattern): the caller only ever gets a short-lived signed URL
// for a document their own organization membership already authorizes them
// to SELECT -- requireMembership() and the org-scoped documents lookup
// below ignore whatever the client claims.
export async function getSignedDocumentUrlAction(documentId: string): Promise<{ url: string } | { error: string }> {
  const membership = await requireMembership();
  const supabase = await createClient();

  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("organization_id", membership.organizationId)
    .eq("id", documentId)
    .maybeSingle();

  if (docError || !doc) {
    return { error: "Documento non trovato." };
  }

  const { data, error } = await supabase.storage.from("documents").createSignedUrl(doc.storage_path, 60);
  if (error || !data) {
    return { error: "Impossibile generare il link di download." };
  }

  return { url: data.signedUrl };
}
