import type { Translator } from "@/i18n/translator";

// Shared by movement and voucher CSV import: resolves an optional "site"
// column value against the counterparty already resolved for that row.
// Independent review requirement: site resolution must never silently
// fall back to null when a value was supplied, must prefer code over
// name, and must distinguish "unknown anywhere" from "exists, but for a
// different counterparty" from "ambiguous" (multiple sites share the
// same code/name for that counterparty -- sites.code/name have no unique
// constraint, so this is a real possibility, not a defensive-only check).
// Organization-owned depots (counterparty_id is null) are excluded from
// resolution entirely, same rule as the interactive site picker and the
// validate_voucher_recovery_site_match DB trigger.
function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

export type SiteRecord = {
  id: string;
  code: string | null;
  name: string;
  counterpartyId: string | null;
};

export type SiteLookup = {
  byCounterpartyAndCode: Map<string, Map<string, string[]>>;
  byCounterpartyAndName: Map<string, Map<string, string[]>>;
  allCodeKeys: Set<string>;
  allNameKeys: Set<string>;
};

function addToNestedMap(
  map: Map<string, Map<string, string[]>>,
  counterpartyId: string,
  key: string,
  siteId: string,
): void {
  let inner = map.get(counterpartyId);
  if (!inner) {
    inner = new Map();
    map.set(counterpartyId, inner);
  }
  const existing = inner.get(key);
  if (existing) existing.push(siteId);
  else inner.set(key, [siteId]);
}

export function buildSiteLookup(sites: SiteRecord[]): SiteLookup {
  const byCounterpartyAndCode = new Map<string, Map<string, string[]>>();
  const byCounterpartyAndName = new Map<string, Map<string, string[]>>();
  const allCodeKeys = new Set<string>();
  const allNameKeys = new Set<string>();

  for (const site of sites) {
    if (!site.counterpartyId) continue;

    const nameKey = normalizeKey(site.name);
    allNameKeys.add(nameKey);
    addToNestedMap(byCounterpartyAndName, site.counterpartyId, nameKey, site.id);

    if (site.code) {
      const codeKey = normalizeKey(site.code);
      allCodeKeys.add(codeKey);
      addToNestedMap(byCounterpartyAndCode, site.counterpartyId, codeKey, site.id);
    }
  }

  return { byCounterpartyAndCode, byCounterpartyAndName, allCodeKeys, allNameKeys };
}

export type SiteResolution =
  | { status: "empty" }
  | { status: "resolved"; siteId: string }
  | { status: "error"; message: string };

export function resolveSite(
  counterpartyId: string | undefined,
  rawValue: string,
  lookup: SiteLookup,
  t: Translator,
): SiteResolution {
  if (!rawValue) return { status: "empty" };
  if (!counterpartyId) {
    return { status: "error", message: t("bulkImport.rowErrors.siteIndicatedButCounterpartyUnresolved", { value: rawValue }) };
  }

  const key = normalizeKey(rawValue);

  const byCode = lookup.byCounterpartyAndCode.get(counterpartyId)?.get(key);
  if (byCode) {
    if (byCode.length > 1) {
      return { status: "error", message: t("bulkImport.rowErrors.siteAmbiguous", { value: rawValue }) };
    }
    return { status: "resolved", siteId: byCode[0] };
  }

  const byName = lookup.byCounterpartyAndName.get(counterpartyId)?.get(key);
  if (byName) {
    if (byName.length > 1) {
      return { status: "error", message: t("bulkImport.rowErrors.siteAmbiguous", { value: rawValue }) };
    }
    return { status: "resolved", siteId: byName[0] };
  }

  if (lookup.allCodeKeys.has(key) || lookup.allNameKeys.has(key)) {
    return { status: "error", message: t("bulkImport.rowErrors.siteNotBelongingToCounterparty", { value: rawValue }) };
  }

  return { status: "error", message: t("bulkImport.rowErrors.siteNotFound", { value: rawValue }) };
}
