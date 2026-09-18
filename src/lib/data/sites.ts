import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import { DEFAULT_PAGE_SIZE, pageCountFor, rangeFor, type PaginatedResult } from "@/lib/pagination";
import { sanitizeOrSearchTerm } from "@/lib/supabase/filter";

export type Site = Tables<"sites">;

export type SiteListItem = Site & { counterpartyName: string | null };

type SiteRow = Site & { counterparties: { legal_name: string } | null };

function mapSiteRow(row: SiteRow): SiteListItem {
  const { counterparties, ...site } = row;
  return { ...site, counterpartyName: counterparties?.legal_name ?? null };
}

export async function listSitesPage(
  organizationId: string,
  options: { includeInactive?: boolean; search?: string; page?: number; pageSize?: number } = {},
): Promise<PaginatedResult<SiteListItem>> {
  const supabase = await createClient();
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const page = options.page ?? 1;
  const { from, to } = rangeFor(page, pageSize);

  let query = supabase
    .from("sites")
    .select("*, counterparties(legal_name)", { count: "exact" })
    .eq("organization_id", organizationId)
    .order("name", { ascending: true })
    .range(from, to);

  if (!options.includeInactive) query = query.eq("active", true);
  if (options.search) {
    const term = sanitizeOrSearchTerm(options.search);
    if (term) query = query.or(`name.ilike.%${term}%,code.ilike.%${term}%,city.ilike.%${term}%`);
  }

  const { data, error, count } = await query;
  const total = count ?? 0;
  return {
    items: error || !data ? [] : (data as unknown as SiteRow[]).map(mapSiteRow),
    total,
    page,
    pageSize,
    pageCount: pageCountFor(total, pageSize),
  };
}

// Unbounded on purpose: used to populate <select> pickers, which need every
// active site rather than a page of them.
export async function listActiveSitesForPicker(organizationId: string): Promise<Site[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sites")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .order("name", { ascending: true });

  return error || !data ? [] : data;
}

export async function getSite(organizationId: string, id: string): Promise<Site | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sites")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();

  return error ? null : data;
}
