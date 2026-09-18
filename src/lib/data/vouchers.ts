import "server-only";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_PAGE_SIZE, pageCountFor, rangeFor, type PaginatedResult } from "@/lib/pagination";
import { sanitizeOrSearchTerm } from "@/lib/supabase/filter";

export type VoucherListItem = {
  id: string;
  voucherNumber: string;
  counterpartyId: string;
  counterpartyName: string;
  palletTypeId: string;
  palletTypeCode: string;
  issueDate: string;
  recoveryDueDate: string | null;
  quantity: number;
  recoveredQuantity: number;
  outstandingQuantity: number;
  status: string;
  notes: string | null;
};

export type VoucherDetail = VoucherListItem & {
  palletTypeDescription: string;
  unitValue: number;
  recoveryCases: Array<{
    id: string;
    reference: string;
    status: string;
    priority: string;
    quantityClaimed: number;
    quantityRecovered: number;
    dueDate: string | null;
  }>;
};

type VoucherRow = {
  id: string;
  voucher_number: string;
  counterparty_id: string;
  pallet_type_id: string;
  issue_date: string;
  recovery_due_date: string | null;
  quantity: number;
  recovered_quantity: number;
  status: string;
  notes: string | null;
  counterparties: { legal_name: string } | null;
  pallet_types: { code: string; description?: string; unit_value?: number } | null;
};

export async function listVouchers(
  organizationId: string,
  options: { statuses?: string[] } = {},
): Promise<VoucherListItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("vouchers")
    .select(
      "id, voucher_number, counterparty_id, pallet_type_id, issue_date, recovery_due_date, quantity, recovered_quantity, status, notes, counterparties(legal_name), pallet_types(code)",
    )
    .eq("organization_id", organizationId)
    .order("recovery_due_date", { ascending: true, nullsFirst: false })
    .order("issue_date", { ascending: false });

  if (options.statuses?.length) query = query.in("status", options.statuses);

  const { data, error } = await query;
  if (error || !data) return [];

  return (data as unknown as VoucherRow[]).map((row) => ({
    id: row.id,
    voucherNumber: row.voucher_number,
    counterpartyId: row.counterparty_id,
    counterpartyName: row.counterparties?.legal_name ?? "—",
    palletTypeId: row.pallet_type_id,
    palletTypeCode: row.pallet_types?.code ?? "—",
    issueDate: row.issue_date,
    recoveryDueDate: row.recovery_due_date,
    quantity: row.quantity,
    recoveredQuantity: row.recovered_quantity,
    outstandingQuantity: Math.max(0, row.quantity - row.recovered_quantity),
    status: row.status,
    notes: row.notes,
  }));
}

export async function listVouchersPage(
  organizationId: string,
  options: { statuses?: string[]; search?: string; page?: number; pageSize?: number } = {},
): Promise<PaginatedResult<VoucherListItem>> {
  const supabase = await createClient();
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const page = options.page ?? 1;
  const { from, to } = rangeFor(page, pageSize);

  let query = supabase
    .from("vouchers")
    .select(
      "id, voucher_number, counterparty_id, pallet_type_id, issue_date, recovery_due_date, quantity, recovered_quantity, status, notes, counterparties(legal_name), pallet_types(code)",
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .order("recovery_due_date", { ascending: true, nullsFirst: false })
    .order("issue_date", { ascending: false })
    .range(from, to);

  if (options.statuses?.length) query = query.in("status", options.statuses);
  if (options.search) {
    const term = sanitizeOrSearchTerm(options.search);
    if (term) query = query.ilike("voucher_number", `%${term}%`);
  }

  const { data, error, count } = await query;
  const total = count ?? 0;

  const items = (error || !data ? [] : (data as unknown as VoucherRow[])).map((row) => ({
    id: row.id,
    voucherNumber: row.voucher_number,
    counterpartyId: row.counterparty_id,
    counterpartyName: row.counterparties?.legal_name ?? "—",
    palletTypeId: row.pallet_type_id,
    palletTypeCode: row.pallet_types?.code ?? "—",
    issueDate: row.issue_date,
    recoveryDueDate: row.recovery_due_date,
    quantity: row.quantity,
    recoveredQuantity: row.recovered_quantity,
    outstandingQuantity: Math.max(0, row.quantity - row.recovered_quantity),
    status: row.status,
    notes: row.notes,
  }));

  return { items, total, page, pageSize, pageCount: pageCountFor(total, pageSize) };
}

// Used to pre-flag duplicate voucher numbers during CSV import before any
// insert is attempted, rather than relying solely on the DB unique
// constraint to reject them one at a time.
export async function listVoucherNumbers(organizationId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vouchers")
    .select("voucher_number")
    .eq("organization_id", organizationId);

  return error || !data ? [] : data.map((row) => row.voucher_number);
}

export async function getVoucherDetail(organizationId: string, id: string): Promise<VoucherDetail | null> {
  const supabase = await createClient();
  const [voucherResult, casesResult] = await Promise.all([
    supabase
      .from("vouchers")
      .select(
        "id, voucher_number, counterparty_id, pallet_type_id, issue_date, recovery_due_date, quantity, recovered_quantity, status, notes, counterparties(legal_name), pallet_types(code, description, unit_value)",
      )
      .eq("organization_id", organizationId)
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("recovery_cases")
      .select("id, reference, status, priority, quantity_claimed, quantity_recovered, due_date")
      .eq("organization_id", organizationId)
      .eq("voucher_id", id)
      .order("opened_at", { ascending: false }),
  ]);

  if (voucherResult.error || !voucherResult.data) return null;
  const row = voucherResult.data as unknown as VoucherRow;
  const cases = casesResult.data ?? [];

  return {
    id: row.id,
    voucherNumber: row.voucher_number,
    counterpartyId: row.counterparty_id,
    counterpartyName: row.counterparties?.legal_name ?? "—",
    palletTypeId: row.pallet_type_id,
    palletTypeCode: row.pallet_types?.code ?? "—",
    palletTypeDescription: row.pallet_types?.description ?? "—",
    unitValue: Number(row.pallet_types?.unit_value ?? 0),
    issueDate: row.issue_date,
    recoveryDueDate: row.recovery_due_date,
    quantity: row.quantity,
    recoveredQuantity: row.recovered_quantity,
    outstandingQuantity: Math.max(0, row.quantity - row.recovered_quantity),
    status: row.status,
    notes: row.notes,
    recoveryCases: cases.map((item) => ({
      id: item.id,
      reference: item.reference,
      status: item.status,
      priority: item.priority,
      quantityClaimed: item.quantity_claimed,
      quantityRecovered: item.quantity_recovered,
      dueDate: item.due_date,
    })),
  };
}
