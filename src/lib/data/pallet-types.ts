import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type PalletType = Tables<"pallet_types">;

// Unbounded on purpose, including for the /pallet-types list view: pallet
// types are physical-standard master data (EPAL EUR1/EUR2, CP1-9, ...), a
// handful to a few dozen per organization by the nature of the domain, not
// a transactional table that grows without bound like movements/vouchers/
// recovery_cases. Pagination here would be premature complexity for data
// that structurally cannot reach list-page scale.
export async function listPalletTypes(
  organizationId: string,
  options: { includeInactive?: boolean } = {},
): Promise<PalletType[]> {
  const supabase = await createClient();
  let query = supabase
    .from("pallet_types")
    .select("*")
    .eq("organization_id", organizationId)
    .order("code", { ascending: true });

  if (!options.includeInactive) {
    query = query.eq("active", true);
  }

  const { data, error } = await query;
  return error || !data ? [] : data;
}

export async function getPalletType(
  organizationId: string,
  id: string,
): Promise<PalletType | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pallet_types")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();

  return error ? null : data;
}
