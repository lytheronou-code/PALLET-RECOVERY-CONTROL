import "server-only";
import { createClient } from "@/lib/supabase/server";

export type GlobalSearchResults = {
  counterparties: Array<{ id: string; legalName: string; code: string | null; city: string | null }>;
  cases: Array<{ id: string; reference: string; status: string; counterpartyName: string }>;
  vouchers: Array<{ id: string; voucherNumber: string; status: string; counterpartyName: string }>;
};

export async function globalSearch(organizationId: string, rawQuery: string): Promise<GlobalSearchResults> {
  const q = rawQuery.trim();
  if (q.length < 2) return { counterparties: [], cases: [], vouchers: [] };

  const supabase = await createClient();
  const pattern = "%" + q.replace(/[%_]/g, "\\$&") + "%";

  const [counterpartiesResult, casesResult, vouchersResult] = await Promise.all([
    supabase
      .from("counterparties")
      .select("id, legal_name, code, city")
      .eq("organization_id", organizationId)
      .ilike("legal_name", pattern)
      .order("legal_name")
      .limit(8),
    supabase
      .from("recovery_cases")
      .select("id, reference, status, counterparties(legal_name)")
      .eq("organization_id", organizationId)
      .ilike("reference", pattern)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("vouchers")
      .select("id, voucher_number, status, counterparties(legal_name)")
      .eq("organization_id", organizationId)
      .ilike("voucher_number", pattern)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  type CaseRow = { id: string; reference: string; status: string; counterparties: { legal_name: string } | null };
  type VoucherRow = { id: string; voucher_number: string; status: string; counterparties: { legal_name: string } | null };

  return {
    counterparties: (counterpartiesResult.data ?? []).map((item) => ({
      id: item.id,
      legalName: item.legal_name,
      code: item.code,
      city: item.city,
    })),
    cases: ((casesResult.data ?? []) as unknown as CaseRow[]).map((item) => ({
      id: item.id,
      reference: item.reference,
      status: item.status,
      counterpartyName: item.counterparties?.legal_name ?? "—",
    })),
    vouchers: ((vouchersResult.data ?? []) as unknown as VoucherRow[]).map((item) => ({
      id: item.id,
      voucherNumber: item.voucher_number,
      status: item.status,
      counterpartyName: item.counterparties?.legal_name ?? "—",
    })),
  };
}
