import "server-only";
import { createClient } from "@/lib/supabase/server";

export type DashboardKpis = {
  openPallets: number;
  openExposure: number;
  recoveredPallets: number;
  recoveredValue: number;
  casesDueSoon: number;
  overdueCases: number;
};

export type CounterpartyExposure = {
  counterpartyId: string;
  legalName: string;
  outstandingPallets: number;
  outstandingExposure: number;
};

export type ActionableCase = {
  id: string;
  reference: string;
  counterpartyName: string;
  palletTypeCode: string;
  status: string;
  priority: string;
  dueDate: string | null;
  outstandingPallets: number;
  outstandingExposure: number;
};

const CLOSED_STATUSES = ["closed_unrecovered", "cancelled"];
const ACTIONABLE_STATUSES = ["open", "contacted", "scheduled", "partial", "disputed"];

type CaseRow = {
  id: string;
  reference: string;
  status: string;
  priority: string;
  due_date: string | null;
  quantity_claimed: number;
  quantity_recovered: number;
  unit_value_snapshot: number;
  counterparty_id: string;
  counterparties: { legal_name: string } | null;
  pallet_types: { code: string } | null;
};

export async function getDashboardKpis(organizationId: string): Promise<DashboardKpis> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recovery_cases")
    .select("status, due_date, quantity_claimed, quantity_recovered, unit_value_snapshot")
    .eq("organization_id", organizationId);

  if (error || !data) {
    return {
      openPallets: 0,
      openExposure: 0,
      recoveredPallets: 0,
      recoveredValue: 0,
      casesDueSoon: 0,
      overdueCases: 0,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueSoonCutoff = new Date(today);
  dueSoonCutoff.setDate(dueSoonCutoff.getDate() + 7);

  let openPallets = 0;
  let openExposure = 0;
  let recoveredPallets = 0;
  let recoveredValue = 0;
  let casesDueSoon = 0;
  let overdueCases = 0;

  for (const row of data) {
    const outstanding = row.quantity_claimed - row.quantity_recovered;
    recoveredPallets += row.quantity_recovered;
    recoveredValue += row.quantity_recovered * row.unit_value_snapshot;

    if (!CLOSED_STATUSES.includes(row.status)) {
      openPallets += outstanding;
      openExposure += outstanding * row.unit_value_snapshot;
    }

    if (row.due_date && ACTIONABLE_STATUSES.includes(row.status)) {
      const dueDate = new Date(row.due_date);
      if (dueDate < today) {
        overdueCases += 1;
      } else if (dueDate <= dueSoonCutoff) {
        casesDueSoon += 1;
      }
    }
  }

  return { openPallets, openExposure, recoveredPallets, recoveredValue, casesDueSoon, overdueCases };
}

export async function getTopExposureCounterparties(
  organizationId: string,
  limit = 6,
): Promise<CounterpartyExposure[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recovery_cases")
    .select("status, quantity_claimed, quantity_recovered, unit_value_snapshot, counterparty_id, counterparties(legal_name)")
    .eq("organization_id", organizationId)
    .not("status", "in", `(${CLOSED_STATUSES.join(",")})`);

  if (error || !data) {
    return [];
  }

  const byCounterparty = new Map<string, CounterpartyExposure>();
  for (const row of data as unknown as (CaseRow & { counterparties: { legal_name: string } | null })[]) {
    const outstanding = row.quantity_claimed - row.quantity_recovered;
    const exposure = outstanding * row.unit_value_snapshot;
    const existing = byCounterparty.get(row.counterparty_id);
    if (existing) {
      existing.outstandingPallets += outstanding;
      existing.outstandingExposure += exposure;
    } else {
      byCounterparty.set(row.counterparty_id, {
        counterpartyId: row.counterparty_id,
        legalName: row.counterparties?.legal_name ?? "—",
        outstandingPallets: outstanding,
        outstandingExposure: exposure,
      });
    }
  }

  return Array.from(byCounterparty.values())
    .sort((a, b) => b.outstandingExposure - a.outstandingExposure)
    .slice(0, limit);
}

export async function getActionableCases(organizationId: string, limit = 10): Promise<ActionableCase[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recovery_cases")
    .select(
      "id, reference, status, priority, due_date, quantity_claimed, quantity_recovered, unit_value_snapshot, counterparty_id, counterparties(legal_name), pallet_types(code)",
    )
    .eq("organization_id", organizationId)
    .in("status", ACTIONABLE_STATUSES)
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return (data as unknown as CaseRow[]).map((row) => ({
    id: row.id,
    reference: row.reference,
    counterpartyName: row.counterparties?.legal_name ?? "—",
    palletTypeCode: row.pallet_types?.code ?? "—",
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    outstandingPallets: row.quantity_claimed - row.quantity_recovered,
    outstandingExposure: (row.quantity_claimed - row.quantity_recovered) * row.unit_value_snapshot,
  }));
}
