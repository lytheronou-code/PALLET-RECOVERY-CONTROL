import "server-only";
import { createClient } from "@/lib/supabase/server";
import { reconcile, type ReconciliationResult } from "@/lib/reconciliation/engine";

export async function getReconciliation(organizationId: string): Promise<ReconciliationResult> {
  const supabase = await createClient();

  const [movementsRes, vouchersRes, counterpartiesRes, palletTypesRes] = await Promise.all([
    supabase
      .from("pallet_movements")
      .select("id, counterparty_id, pallet_type_id, direction, quantity, document_number")
      .eq("organization_id", organizationId),
    supabase
      .from("vouchers")
      .select("id, counterparty_id, pallet_type_id, quantity, recovered_quantity, status, recovery_due_date")
      .eq("organization_id", organizationId),
    supabase.from("counterparties").select("id, legal_name").eq("organization_id", organizationId),
    supabase.from("pallet_types").select("id, code, unit_value").eq("organization_id", organizationId),
  ]);

  return reconcile(
    (movementsRes.data ?? []).map((m) => ({
      id: m.id,
      counterpartyId: m.counterparty_id,
      palletTypeId: m.pallet_type_id,
      direction: m.direction as "inbound" | "outbound",
      quantity: m.quantity,
      documentNumber: m.document_number,
    })),
    (vouchersRes.data ?? []).map((v) => ({
      id: v.id,
      counterpartyId: v.counterparty_id,
      palletTypeId: v.pallet_type_id,
      quantity: v.quantity,
      recoveredQuantity: v.recovered_quantity,
      status: v.status,
      recoveryDueDate: v.recovery_due_date,
    })),
    (counterpartiesRes.data ?? []).map((c) => ({ id: c.id, legalName: c.legal_name })),
    (palletTypesRes.data ?? []).map((p) => ({ id: p.id, code: p.code, unitValue: p.unit_value })),
  );
}
