import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type PalletType = Tables<"pallet_types">;

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
