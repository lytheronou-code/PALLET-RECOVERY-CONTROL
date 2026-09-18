import "server-only";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_PAGE_SIZE, pageCountFor, rangeFor, type PaginatedResult } from "@/lib/pagination";
import { sanitizeOrSearchTerm } from "@/lib/supabase/filter";

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
  assigneeUserId: string | null;
  assigneeName: string | null;
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
  assignee_user_id: string | null;
  counterparties: { legal_name: string } | null;
  pallet_types: { code: string } | null;
  profiles: { email: string; display_name: string | null } | null;
};

const SELECT_CASE_LIST_ROW =
  "id, reference, quantity_claimed, quantity_recovered, unit_value_snapshot, due_date, priority, status, assignee_user_id, counterparties(legal_name), pallet_types(code), profiles(email, display_name)";

function mapCaseListRow(row: CaseJoinRow): RecoveryCaseListItem {
  return {
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
    assigneeUserId: row.assignee_user_id,
    assigneeName: row.profiles?.display_name || row.profiles?.email || null,
  };
}

export async function listRecoveryCasesPage(
  organizationId: string,
  options: {
    statuses?: string[];
    search?: string;
    assigneeUserId?: string;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<PaginatedResult<RecoveryCaseListItem>> {
  const supabase = await createClient();
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const page = options.page ?? 1;
  const { from, to } = rangeFor(page, pageSize);

  let query = supabase
    .from("recovery_cases")
    .select(SELECT_CASE_LIST_ROW, { count: "exact" })
    .eq("organization_id", organizationId)
    .order("due_date", { ascending: true, nullsFirst: false })
    .range(from, to);

  if (options.statuses?.length) query = query.in("status", options.statuses);
  if (options.assigneeUserId) query = query.eq("assignee_user_id", options.assigneeUserId);
  if (options.search) {
    const term = sanitizeOrSearchTerm(options.search);
    if (term) query = query.ilike("reference", `%${term}%`);
  }

  const { data, error, count } = await query;
  const total = count ?? 0;
  const items = (error || !data ? [] : (data as unknown as CaseJoinRow[])).map(mapCaseListRow);

  return { items, total, page, pageSize, pageCount: pageCountFor(total, pageSize) };
}

export type RecoveryCaseDetail = {
  id: string;
  reference: string;
  counterpartyId: string;
  counterpartyName: string;
  palletTypeId: string;
  palletTypeCode: string;
  voucherId: string | null;
  siteId: string | null;
  siteName: string | null;
  openedAt: string;
  dueDate: string | null;
  quantityClaimed: number;
  quantityRecovered: number;
  unitValueSnapshot: number;
  priority: string;
  status: string;
  notes: string | null;
  assigneeUserId: string | null;
  assigneeName: string | null;
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
      "id, reference, counterparty_id, pallet_type_id, voucher_id, site_id, opened_at, due_date, quantity_claimed, quantity_recovered, unit_value_snapshot, priority, status, notes, assignee_user_id, counterparties(legal_name), pallet_types(code), sites(name), profiles(email, display_name)",
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
    site_id: string | null;
    opened_at: string;
    due_date: string | null;
    quantity_claimed: number;
    quantity_recovered: number;
    unit_value_snapshot: number;
    priority: string;
    status: string;
    notes: string | null;
    assignee_user_id: string | null;
    counterparties: { legal_name: string } | null;
    pallet_types: { code: string } | null;
    sites: { name: string } | null;
    profiles: { email: string; display_name: string | null } | null;
  };

  return {
    id: row.id,
    reference: row.reference,
    counterpartyId: row.counterparty_id,
    counterpartyName: row.counterparties?.legal_name ?? "—",
    palletTypeId: row.pallet_type_id,
    palletTypeCode: row.pallet_types?.code ?? "—",
    voucherId: row.voucher_id,
    siteId: row.site_id,
    siteName: row.sites?.name ?? null,
    openedAt: row.opened_at,
    dueDate: row.due_date,
    quantityClaimed: row.quantity_claimed,
    quantityRecovered: row.quantity_recovered,
    unitValueSnapshot: row.unit_value_snapshot,
    priority: row.priority,
    status: row.status,
    notes: row.notes,
    assigneeUserId: row.assignee_user_id,
    assigneeName: row.profiles?.display_name || row.profiles?.email || null,
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
