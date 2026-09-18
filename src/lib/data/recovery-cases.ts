import "server-only";
import { createClient } from "@/lib/supabase/server";

export type RecoveryCaseListItem = {
  id: string;
  reference: string;
  counterpartyName: string;
  palletTypeCode: string;
  quantityClaimed: number;
  quantityRecovered: number;
  outstandingQuantity: number;
  outstandingValue: number;
  dueDate: string | null;
  priority: string;
  status: string;
};

type CaseJoinRow = {
  id: string;
  reference: string;
  quantity_claimed: number;
  quantity_recovered: number;
  unit_value_snapshot: number;
  due_date: string | null;
  priority: string;
  status: string;
  counterparties: { legal_name: string } | null;
  pallet_types: { code: string } | null;
};

export async function listRecoveryCases(
  organizationId: string,
  filters: { statuses?: string[] } = {},
): Promise<RecoveryCaseListItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("recovery_cases")
    .select(
      "id, reference, quantity_claimed, quantity_recovered, unit_value_snapshot, due_date, priority, status, counterparties(legal_name), pallet_types(code)",
    )
    .eq("organization_id", organizationId)
    .order("due_date", { ascending: true, nullsFirst: false });

  if (filters.statuses && filters.statuses.length > 0) {
    query = query.in("status", filters.statuses);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return (data as unknown as CaseJoinRow[]).map((row) => ({
    id: row.id,
    reference: row.reference,
    counterpartyName: row.counterparties?.legal_name ?? "—",
    palletTypeCode: row.pallet_types?.code ?? "—",
    quantityClaimed: row.quantity_claimed,
    quantityRecovered: row.quantity_recovered,
    outstandingQuantity: row.quantity_claimed - row.quantity_recovered,
    outstandingValue: (row.quantity_claimed - row.quantity_recovered) * row.unit_value_snapshot,
    dueDate: row.due_date,
    priority: row.priority,
    status: row.status,
  }));
}

export type RecoveryCaseDetail = {
  id: string;
  reference: string;
  counterpartyId: string;
  counterpartyName: string;
  palletTypeId: string;
  palletTypeCode: string;
  voucherId: string | null;
  openedAt: string;
  dueDate: string | null;
  quantityClaimed: number;
  quantityRecovered: number;
  unitValueSnapshot: number;
  priority: string;
  status: string;
  notes: string | null;
};

export type RecoveryEventItem = {
  id: string;
  eventType: string;
  quantity: number | null;
  notes: string | null;
  occurredAt: string;
};

export async function getRecoveryCase(
  organizationId: string,
  id: string,
): Promise<RecoveryCaseDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recovery_cases")
    .select(
      "id, reference, counterparty_id, pallet_type_id, voucher_id, opened_at, due_date, quantity_claimed, quantity_recovered, unit_value_snapshot, priority, status, notes, counterparties(legal_name), pallet_types(code)",
    )
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as unknown as {
    id: string;
    reference: string;
    counterparty_id: string;
    pallet_type_id: string;
    voucher_id: string | null;
    opened_at: string;
    due_date: string | null;
    quantity_claimed: number;
    quantity_recovered: number;
    unit_value_snapshot: number;
    priority: string;
    status: string;
    notes: string | null;
    counterparties: { legal_name: string } | null;
    pallet_types: { code: string } | null;
  };

  return {
    id: row.id,
    reference: row.reference,
    counterpartyId: row.counterparty_id,
    counterpartyName: row.counterparties?.legal_name ?? "—",
    palletTypeId: row.pallet_type_id,
    palletTypeCode: row.pallet_types?.code ?? "—",
    voucherId: row.voucher_id,
    openedAt: row.opened_at,
    dueDate: row.due_date,
    quantityClaimed: row.quantity_claimed,
    quantityRecovered: row.quantity_recovered,
    unitValueSnapshot: row.unit_value_snapshot,
    priority: row.priority,
    status: row.status,
    notes: row.notes,
  };
}

export async function listRecoveryEvents(
  organizationId: string,
  caseId: string,
): Promise<RecoveryEventItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recovery_events")
    .select("id, event_type, quantity, notes, occurred_at")
    .eq("organization_id", organizationId)
    .eq("recovery_case_id", caseId)
    .order("occurred_at", { ascending: true });

  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    eventType: row.event_type,
    quantity: row.quantity,
    notes: row.notes,
    occurredAt: row.occurred_at,
  }));
}
