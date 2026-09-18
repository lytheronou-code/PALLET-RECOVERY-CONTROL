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

// Scoped to a single counterparty rather than the whole organization: a
// voucher/recovery-case site picker only ever needs that counterparty's
// own sites (the DB now enforces this match too, via
// validate_voucher_recovery_site_match -- see the
// site_counterparty_consistency migration), so this is bounded by a real
// customer's site count, not the organization's. Organization-owned depots
// (counterparty_id is null) are deliberately excluded: they are reserved
// for future recovery planning, not customer location selection.
export async function listActiveSitesForCounterparty(
  organizationId: string,
  counterpartyId: string,
): Promise<Site[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sites")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("counterparty_id", counterpartyId)
    .eq("active", true)
    .order("name", { ascending: true });

  return error || !data ? [] : data;
}

// Unbounded on purpose, like listCounterparties/listPalletTypes: CSV import
// needs the full site catalog (code, name, counterparty) to resolve rows
// against, the same way it resolves counterparty/pallet-type columns.
export async function listSitesForImportLookup(
  organizationId: string,
): Promise<{ id: string; code: string | null; name: string; counterpartyId: string | null }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sites")
    .select("id, code, name, counterparty_id")
    .eq("organization_id", organizationId)
    .eq("active", true);

  return error || !data
    ? []
    : data.map((row) => ({ id: row.id, code: row.code, name: row.name, counterpartyId: row.counterparty_id }));
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
