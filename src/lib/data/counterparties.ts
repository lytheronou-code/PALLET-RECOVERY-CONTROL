import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type Counterparty = Tables<"counterparties">;

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

  if (!options.includeInactive) {
    query = query.eq("active", true);
  }

  const { data, error } = await query;
  return error || !data ? [] : data;
}

export async function getCounterparty(
  organizationId: string,
  id: string,
): Promise<Counterparty | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("counterparties")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();

  return error ? null : data;
}
