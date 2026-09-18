import "server-only";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_PAGE_SIZE, pageCountFor, rangeFor, type PaginatedResult } from "@/lib/pagination";
import { sanitizeOrSearchTerm } from "@/lib/supabase/filter";

export type MovementListItem = {
  id: string;
  movementDate: string;
  direction: string;
  quantity: number;
  documentType: string | null;
  documentNumber: string | null;
  voucherNumber: string | null;
  counterpartyId: string;
  counterpartyName: string;
  palletTypeId: string;
  palletTypeCode: string;
  siteName: string | null;
  notes: string | null;
  correctionOfMovementId: string | null;
  correctionReason: string | null;
  isCorrected: boolean;
};

type MovementRow = {
  id: string;
  movement_date: string;
  direction: string;
  quantity: number;
  document_type: string | null;
  document_number: string | null;
  voucher_number: string | null;
  counterparty_id: string;
  pallet_type_id: string;
  notes: string | null;
  correction_of_movement_id: string | null;
  correction_reason: string | null;
  counterparties: { legal_name: string } | null;
  pallet_types: { code: string } | null;
  sites: { name: string } | null;
};

const SELECT_MOVEMENT_ROW =
  "id, movement_date, direction, quantity, document_type, document_number, voucher_number, counterparty_id, pallet_type_id, notes, correction_of_movement_id, correction_reason, counterparties(legal_name), pallet_types(code), sites(name)";

function mapMovementRow(row: MovementRow, correctedIds: Set<string>): MovementListItem {
  return {
    id: row.id,
    movementDate: row.movement_date,
    direction: row.direction,
    quantity: row.quantity,
    documentType: row.document_type,
    documentNumber: row.document_number,
    voucherNumber: row.voucher_number,
    counterpartyId: row.counterparty_id,
    counterpartyName: row.counterparties?.legal_name ?? "—",
    palletTypeId: row.pallet_type_id,
    palletTypeCode: row.pallet_types?.code ?? "—",
    siteName: row.sites?.name ?? null,
    notes: row.notes,
    correctionOfMovementId: row.correction_of_movement_id,
    correctionReason: row.correction_reason,
    isCorrected: correctedIds.has(row.id),
  };
}

export async function listMovementsPage(
  organizationId: string,
  options: {
    direction?: "inbound" | "outbound";
    search?: string;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<PaginatedResult<MovementListItem>> {
  const supabase = await createClient();
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const page = options.page ?? 1;
  const { from, to } = rangeFor(page, pageSize);

  let query = supabase
    .from("pallet_movements")
    .select(SELECT_MOVEMENT_ROW, { count: "exact" })
    .eq("organization_id", organizationId)
    .order("movement_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (options.direction) query = query.eq("direction", options.direction);
  if (options.search) {
    const term = sanitizeOrSearchTerm(options.search);
    if (term) query = query.or(`document_number.ilike.%${term}%,voucher_number.ilike.%${term}%`);
  }

  const { data, error, count } = await query;
  const total = count ?? 0;
  const rows = error || !data ? [] : (data as unknown as MovementRow[]);

  let correctedIds = new Set<string>();
  const ids = rows.map((row) => row.id);
  if (ids.length > 0) {
    const { data: corrections } = await supabase
      .from("pallet_movements")
      .select("correction_of_movement_id")
      .eq("organization_id", organizationId)
      .in("correction_of_movement_id", ids);
    correctedIds = new Set((corrections ?? []).map((row) => row.correction_of_movement_id).filter((id): id is string => Boolean(id)));
  }

  return {
    items: rows.map((row) => mapMovementRow(row, correctedIds)),
    total,
    page,
    pageSize,
    pageCount: pageCountFor(total, pageSize),
  };
}

export async function getMovement(organizationId: string, id: string): Promise<MovementListItem | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pallet_movements")
    .select(SELECT_MOVEMENT_ROW)
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return mapMovementRow(data as unknown as MovementRow, new Set());
}
