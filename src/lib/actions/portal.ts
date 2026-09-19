"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePortalContext } from "@/lib/data/portal";
import { getT } from "@/i18n/server";

// portal_get_document_storage_path re-verifies (at call time, not list
// time) that this document still belongs to the caller's own
// client-portal counterparty, is visibility='client' and status='active'
// -- it raises otherwise, so a stale/forged id never reaches
// createSignedUrl. The signed URL itself is additionally gated by the
// client_portal_read_documents_storage Storage RLS policy (the same
// membership + visibility/status check, independent of this RPC).
export async function getPortalSignedDocumentUrlAction(documentId: string): Promise<{ url: string } | { error: string }> {
  const context = await requirePortalContext();
  const { t } = await getT(context.organizationId);
  const supabase = await createClient();

  const { data: storagePath, error: pathError } = await supabase.rpc("portal_get_document_storage_path", {
    p_document_id: documentId,
  });

  if (pathError || !storagePath) {
    return { error: t("common.errors.notFound") };
  }

  const { data, error } = await supabase.storage.from("documents").createSignedUrl(storagePath, 60);
  if (error || !data) {
    return { error: t("documents.errors.downloadLinkFailed") };
  }

  return { url: data.signedUrl };
}
