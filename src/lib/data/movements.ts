import "server-only";
import { createClient } from "@/lib/supabase/server";

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
  palletTypeCode: string;
  notes: string | null;
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
  notes: string | null;
  counterparties: { legal_name: string } | null;
  pallet_types: { code: string } | null;
};

export async function listMovements(
  organizationId: string,
  options: { direction?: "inbound" | "outbound"; limit?: number } = {},
): Promise<MovementListItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("pallet_movements")
    .select(
      "id, movement_date, direction, quantity, document_type, document_number, voucher_number, counterparty_id, notes, counterparties(legal_name), pallet_types(code)",
    )
    .eq("organization_id", organizationId)
    .order("movement_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 250);

  if (options.direction) query = query.eq("direction", options.direction);

  const { data, error } = await query;
  if (error || !data) return [];

  return (data as unknown as MovementRow[]).map((row) => ({
    id: row.id,
    movementDate: row.movement_date,
    direction: row.direction,
    quantity: row.quantity,
    documentType: row.document_type,
    documentNumber: row.document_number,
    voucherNumber: row.voucher_number,
    counterpartyId: row.counterparty_id,
    counterpartyName: row.counterparties?.legal_name ?? "—",
    palletTypeCode: row.pallet_types?.code ?? "—",
    notes: row.notes,
  }));
}
