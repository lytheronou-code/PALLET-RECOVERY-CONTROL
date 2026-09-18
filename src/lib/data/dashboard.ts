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

export type AgeingSlice = {
  label: string;
  count: number;
  value: number;
};

export type DashboardInsights = {
  openCases: number;
  recoveryRate: number;
  overdueExposure: number;
  openVouchers: number;
  voucherDueSoon: number;
  voucherOverdue: number;
  ageing: AgeingSlice[];
};

const CLOSED_STATUSES = ["closed_unrecovered", "cancelled"];
const ACTIONABLE_STATUSES = ["open", "contacted", "scheduled", "partial", "disputed"];

type CaseRow = {
  id: string;
  reference: string;
  status: string;
  priority: string;
  opened_at?: string;
  due_date: string | null;
  quantity_claimed: number;
  quantity_recovered: number;
  unit_value_snapshot: number;
  counterparty_id: string;
  counterparties: { legal_name: string } | null;
  pallet_types: { code: string } | null;
};

function dateOnly(value: string): Date {
  return new Date(value + "T00:00:00");
}

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
      const dueDate = dateOnly(row.due_date);
      if (dueDate < today) {
        overdueCases += 1;
      } else if (dueDate <= dueSoonCutoff) {
        casesDueSoon += 1;
      }
    }
  }

  return { openPallets, openExposure, recoveredPallets, recoveredValue, casesDueSoon, overdueCases };
}

export async function getDashboardInsights(organizationId: string): Promise<DashboardInsights> {
  const supabase = await createClient();
  const [{ data: cases }, { data: vouchers }] = await Promise.all([
    supabase
      .from("recovery_cases")
      .select("status, opened_at, due_date, quantity_claimed, quantity_recovered, unit_value_snapshot")
      .eq("organization_id", organizationId),
    supabase
      .from("vouchers")
      .select("status, recovery_due_date, quantity, recovered_quantity")
      .eq("organization_id", organizationId),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueSoonCutoff = new Date(today);
  dueSoonCutoff.setDate(dueSoonCutoff.getDate() + 7);

  let totalClaimed = 0;
  let totalRecovered = 0;
  let openCases = 0;
  let overdueExposure = 0;

  const ageingMap = new Map<string, AgeingSlice>([
    ["0-30", { label: "0–30 gg", count: 0, value: 0 }],
    ["31-60", { label: "31–60 gg", count: 0, value: 0 }],
    ["61-90", { label: "61–90 gg", count: 0, value: 0 }],
    ["90+", { label: "90+ gg", count: 0, value: 0 }],
  ]);

  for (const row of cases ?? []) {
    if (row.status !== "cancelled") {
      totalClaimed += row.quantity_claimed;
      totalRecovered += row.quantity_recovered;
    }

    if (!ACTIONABLE_STATUSES.includes(row.status)) continue;

    openCases += 1;
    const outstanding = row.quantity_claimed - row.quantity_recovered;
    const exposure = outstanding * row.unit_value_snapshot;

    if (row.due_date && dateOnly(row.due_date) < today) {
      overdueExposure += exposure;
    }

    const opened = dateOnly(row.opened_at);
    const ageDays = Math.max(0, Math.floor((today.getTime() - opened.getTime()) / 86400000));
    const bucket = ageDays <= 30 ? "0-30" : ageDays <= 60 ? "31-60" : ageDays <= 90 ? "61-90" : "90+";
    const slice = ageingMap.get(bucket);
    if (slice) {
      slice.count += 1;
      slice.value += exposure;
    }
  }

  let openVouchers = 0;
  let voucherDueSoon = 0;
  let voucherOverdue = 0;

  for (const voucher of vouchers ?? []) {
    if (!["open", "partial", "disputed"].includes(voucher.status)) continue;
    openVouchers += 1;
    if (!voucher.recovery_due_date) continue;
    const due = dateOnly(voucher.recovery_due_date);
    if (due < today) voucherOverdue += 1;
    else if (due <= dueSoonCutoff) voucherDueSoon += 1;
  }

  return {
    openCases,
    recoveryRate: totalClaimed > 0 ? Math.round((totalRecovered / totalClaimed) * 100) : 0,
    overdueExposure,
    openVouchers,
    voucherDueSoon,
    voucherOverdue,
    ageing: Array.from(ageingMap.values()),
  };
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
    .in("status", ACTIONABLE_STATUSES);

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
