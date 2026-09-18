import "server-only";
import { createClient } from "@/lib/supabase/server";
import { buildExposureReport, type ExposureReport } from "@/lib/reporting/exposure-report";

export async function getExposureReport(
  organizationId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<ExposureReport> {
  const supabase = await createClient();

  const [casesRes, eventsRes] = await Promise.all([
    supabase
      .from("recovery_cases")
      .select("id, counterparty_id, opened_at, quantity_claimed, quantity_recovered, unit_value_snapshot, status, counterparties(legal_name)")
      .eq("organization_id", organizationId),
    supabase
      .from("recovery_events")
      .select("recovery_case_id, event_type, quantity, occurred_at")
      .eq("organization_id", organizationId),
  ]);

  const cases = ((casesRes.data ?? []) as unknown as {
    id: string;
    counterparty_id: string;
    opened_at: string;
    quantity_claimed: number;
    quantity_recovered: number;
    unit_value_snapshot: number;
    status: string;
    counterparties: { legal_name: string } | null;
  }[]).map((row) => ({
    id: row.id,
    counterpartyId: row.counterparty_id,
    counterpartyName: row.counterparties?.legal_name ?? "—",
    openedAt: row.opened_at,
    quantityClaimed: row.quantity_claimed,
    quantityRecovered: row.quantity_recovered,
    unitValueSnapshot: row.unit_value_snapshot,
    status: row.status,
  }));

  const events = (eventsRes.data ?? []).map((row) => ({
    caseId: row.recovery_case_id,
    eventType: row.event_type,
    quantity: row.quantity,
    occurredAt: row.occurred_at,
  }));

  return buildExposureReport(cases, events, periodStart, periodEnd);
}
