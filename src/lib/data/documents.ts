import "server-only";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_PAGE_SIZE, pageCountFor, rangeFor, type PaginatedResult } from "@/lib/pagination";

export type DocumentListItem = {
  id: string;
  documentType: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  status: string;
  visibility: string;
  notes: string | null;
  uploadedAt: string;
  uploadedByName: string | null;
  counterpartyId: string;
  counterpartyName: string;
};

type DocumentRow = {
  id: string;
  document_type: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  status: string;
  visibility: string;
  notes: string | null;
  uploaded_at: string;
  counterparty_id: string;
  counterparties: { legal_name: string } | null;
  profiles: { email: string; display_name: string | null } | null;
};

const SELECT_DOCUMENT_ROW =
  "id, document_type, original_filename, mime_type, file_size, status, visibility, notes, uploaded_at, counterparty_id, counterparties(legal_name), profiles(email, display_name)";

function mapDocumentRow(row: DocumentRow): DocumentListItem {
  return {
    id: row.id,
    documentType: row.document_type,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    status: row.status,
    visibility: row.visibility,
    notes: row.notes,
    uploadedAt: row.uploaded_at,
    uploadedByName: row.profiles?.display_name || row.profiles?.email || null,
    counterpartyId: row.counterparty_id,
    counterpartyName: row.counterparties?.legal_name ?? "—",
  };
}

type EntityLink =
  | { recoveryCaseId: string }
  | { voucherId: string }
  | { movementId: string }
  | { counterpartyId: string };

export async function listDocumentsForEntity(
  organizationId: string,
  link: EntityLink,
  options: { page?: number; pageSize?: number; includeSuperseded?: boolean } = {},
): Promise<PaginatedResult<DocumentListItem>> {
  const supabase = await createClient();
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const page = options.page ?? 1;
  const { from, to } = rangeFor(page, pageSize);

  let query = supabase
    .from("documents")
    .select(SELECT_DOCUMENT_ROW, { count: "exact" })
    .eq("organization_id", organizationId)
    .order("uploaded_at", { ascending: false })
    .range(from, to);

  if ("recoveryCaseId" in link) query = query.eq("recovery_case_id", link.recoveryCaseId);
  else if ("voucherId" in link) query = query.eq("voucher_id", link.voucherId);
  else if ("movementId" in link) query = query.eq("movement_id", link.movementId);
  else query = query.eq("counterparty_id", link.counterpartyId);

  if (!options.includeSuperseded) query = query.eq("status", "active");

  const { data, error, count } = await query;
  const total = count ?? 0;

  return {
    items: error || !data ? [] : (data as unknown as DocumentRow[]).map(mapDocumentRow),
    total,
    page,
    pageSize,
    pageCount: pageCountFor(total, pageSize),
  };
}

export async function listRecentDocumentsForCounterparty(
  organizationId: string,
  counterpartyId: string,
  limit = 8,
): Promise<DocumentListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select(SELECT_DOCUMENT_ROW)
    .eq("organization_id", organizationId)
    .eq("counterparty_id", counterpartyId)
    .eq("status", "active")
    .order("uploaded_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return (data as unknown as DocumentRow[]).map(mapDocumentRow);
}

export type DocumentForAuthorization = {
  id: string;
  organizationId: string;
  counterpartyId: string;
  storagePath: string;
  originalFilename: string;
  status: string;
};

export async function getDocumentForDownload(
  organizationId: string,
  id: string,
): Promise<DocumentForAuthorization | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("id, organization_id, counterparty_id, storage_path, original_filename, status")
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id,
    organizationId: data.organization_id,
    counterpartyId: data.counterparty_id,
    storagePath: data.storage_path,
    originalFilename: data.original_filename,
    status: data.status,
  };
}

export type DocumentEventItem = {
  id: string;
  eventType: string;
  notes: string | null;
  occurredAt: string;
  actorName: string | null;
};

export async function listDocumentEvents(organizationId: string, documentId: string): Promise<DocumentEventItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_events")
    .select("id, event_type, notes, occurred_at, profiles(email, display_name)")
    .eq("organization_id", organizationId)
    .eq("document_id", documentId)
    .order("occurred_at", { ascending: true });

  if (error || !data) return [];
  return (data as unknown as Array<{
    id: string;
    event_type: string;
    notes: string | null;
    occurred_at: string;
    profiles: { email: string; display_name: string | null } | null;
  }>).map((row) => ({
    id: row.id,
    eventType: row.event_type,
    notes: row.notes,
    occurredAt: row.occurred_at,
    actorName: row.profiles?.display_name || row.profiles?.email || null,
  }));
}
