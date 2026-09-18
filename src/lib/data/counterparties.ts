import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type Counterparty = Tables<"counterparties">;

export type CounterpartyCaseSummary = {
  id: string;
  reference: string;
  status: string;
  priority: string;
  dueDate: string | null;
  palletTypeCode: string;
  outstandingQuantity: number;
  outstandingValue: number;
};

export type CounterpartyVoucherSummary = {
  id: string;
  voucherNumber: string;
  status: string;
  recoveryDueDate: string | null;
  palletTypeCode: string;
  quantity: number;
  recoveredQuantity: number;
};

export type CounterpartyMovementSummary = {
  id: string;
  movementDate: string;
  direction: string;
  quantity: number;
  palletTypeCode: string;
  documentNumber: string | null;
};

export type CounterpartyOverview = {
  counterparty: Counterparty;
  openExposure: number;
  openCases: number;
  openVouchers: number;
  recoveredPallets: number;
  cases: CounterpartyCaseSummary[];
  vouchers: CounterpartyVoucherSummary[];
  movements: CounterpartyMovementSummary[];
};

const ACTIVE_CASE_STATUSES = ["open", "contacted", "scheduled", "partial", "disputed"];

export async function listCounterparties(
  organizationId: string,
  options: { includeInactive?: boolean } = {},
): Promise<Counterparty[]> {
  const supabase = await createClient();
  let query = supabase
    .from("counterparties")
    .select("*")
    .eq("organization_id", organizationId)
    .order("legal_name", { ascending: true });

  if (!options.includeInactive) query = query.eq("active", true);

  const { data, error } = await query;
  return error || !data ? [] : data;
}

export async function getCounterparty(organizationId: string, id: string): Promise<Counterparty | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("counterparties")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();

  return error ? null : data;
}

export async function getCounterpartyOverview(
  organizationId: string,
  id: string,
): Promise<CounterpartyOverview | null> {
  const supabase = await createClient();

  const [counterpartyResult, casesResult, vouchersResult, movementsResult] = await Promise.all([
    supabase
      .from("counterparties")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("recovery_cases")
      .select("id, reference, status, priority, due_date, quantity_claimed, quantity_recovered, unit_value_snapshot, pallet_types(code)")
      .eq("organization_id", organizationId)
      .eq("counterparty_id", id)
      .order("opened_at", { ascending: false }),
    supabase
      .from("vouchers")
      .select("id, voucher_number, status, recovery_due_date, quantity, recovered_quantity, pallet_types(code)")
      .eq("organization_id", organizationId)
      .eq("counterparty_id", id)
      .order("issue_date", { ascending: false }),
    supabase
      .from("pallet_movements")
      .select("id, movement_date, direction, quantity, document_number, pallet_types(code)")
      .eq("organization_id", organizationId)
      .eq("counterparty_id", id)
      .order("movement_date", { ascending: false })
      .limit(12),
  ]);

  if (counterpartyResult.error || !counterpartyResult.data) return null;

  type CaseRow = {
    id: string; reference: string; status: string; priority: string; due_date: string | null;
    quantity_claimed: number; quantity_recovered: number; unit_value_snapshot: number;
    pallet_types: { code: string } | null;
  };
  type VoucherRow = {
    id: string; voucher_number: string; status: string; recovery_due_date: string | null;
    quantity: number; recovered_quantity: number; pallet_types: { code: string } | null;
  };
  type MovementRow = {
    id: string; movement_date: string; direction: string; quantity: number;
    document_number: string | null; pallet_types: { code: string } | null;
  };

  const allCases = (casesResult.data ?? []) as unknown as CaseRow[];
  const allVouchers = (vouchersResult.data ?? []) as unknown as VoucherRow[];
  const movementRows = (movementsResult.data ?? []) as unknown as MovementRow[];

  let openExposure = 0;
  let openCases = 0;
  let recoveredPallets = 0;

  for (const item of allCases) {
    recoveredPallets += item.quantity_recovered;
    if (ACTIVE_CASE_STATUSES.includes(item.status)) {
      openCases += 1;
      openExposure += Math.max(0, item.quantity_claimed - item.quantity_recovered) * item.unit_value_snapshot;
    }
  }

  const openVouchers = allVouchers.filter((item) => ["open", "partial", "disputed"].includes(item.status)).length;

  return {
    counterparty: counterpartyResult.data,
    openExposure,
    openCases,
    openVouchers,
    recoveredPallets,
    cases: allCases.slice(0, 12).map((item) => ({
      id: item.id,
      reference: item.reference,
      status: item.status,
      priority: item.priority,
      dueDate: item.due_date,
      palletTypeCode: item.pallet_types?.code ?? "—",
      outstandingQuantity: Math.max(0, item.quantity_claimed - item.quantity_recovered),
      outstandingValue: Math.max(0, item.quantity_claimed - item.quantity_recovered) * item.unit_value_snapshot,
    })),
    vouchers: allVouchers.slice(0, 12).map((item) => ({
      id: item.id,
      voucherNumber: item.voucher_number,
      status: item.status,
      recoveryDueDate: item.recovery_due_date,
      palletTypeCode: item.pallet_types?.code ?? "—",
      quantity: item.quantity,
      recoveredQuantity: item.recovered_quantity,
    })),
    movements: movementRows.map((item) => ({
      id: item.id,
      movementDate: item.movement_date,
      direction: item.direction,
      quantity: item.quantity,
      palletTypeCode: item.pallet_types?.code ?? "—",
      documentNumber: item.document_number,
    })),
  };
}
