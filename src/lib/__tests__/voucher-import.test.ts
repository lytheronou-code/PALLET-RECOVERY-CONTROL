import { describe, expect, it } from "vitest";
import { buildLookupKey } from "@/lib/csv/movement-import";
import { buildSiteLookup } from "@/lib/csv/site-lookup";
import {
  validateVoucherRows,
  missingRequiredVoucherMappings,
  type VoucherColumnMapping,
  type VoucherLookups,
} from "@/lib/csv/voucher-import";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translator";

// Italian test translator: preserves this file's existing assertions
// (written against the product's original hardcoded-Italian error text)
// unchanged, now resolved through the dictionary instead of being
// hardcoded in the validator itself.
const t = createTranslator(getDictionary("it"));
const tEn = createTranslator(getDictionary("en"));

const headers = ["Buono", "Cliente", "Pallet", "Sito", "Emissione", "Scadenza", "Qta", "Note"];

const mapping: VoucherColumnMapping = {
  voucherNumber: "Buono",
  counterparty: "Cliente",
  palletType: "Pallet",
  site: "Sito",
  issueDate: "Emissione",
  recoveryDueDate: "Scadenza",
  quantity: "Qta",
  notes: "Note",
};

const siteLookup = buildSiteLookup([
  { id: "site-1", code: "MIL", name: "Milano Hub", counterpartyId: "cp-1" },
  { id: "site-2", code: "ROM", name: "Roma Deposito", counterpartyId: "cp-2" },
]);

const lookups: VoucherLookups = {
  counterpartyIdByKey: new Map([[buildLookupKey("Acme Srl"), "cp-1"]]),
  palletTypeIdByKey: new Map([[buildLookupKey("EPAL EUR1"), "pt-1"]]),
  existingVoucherNumbers: new Set([buildLookupKey("BV-EXISTING")]),
  siteLookup,
};

describe("validateVoucherRows", () => {
  it("accepts a fully valid row and resolves ids", () => {
    const rows = [["BV-1", "Acme Srl", "EPAL EUR1", "", "05/03/2026", "05/04/2026", "10", "ok"]];
    const results = validateVoucherRows(headers, rows, mapping, lookups, t);
    expect(results[0].valid).toBe(true);
    if (results[0].valid) {
      expect(results[0].voucher).toEqual({
        voucher_number: "BV-1",
        counterparty_id: "cp-1",
        pallet_type_id: "pt-1",
        site_id: null,
        issue_date: "2026-03-05",
        recovery_due_date: "2026-04-05",
        quantity: 10,
        notes: "ok",
      });
    }
  });

  it("resolves a site by code, scoped to the row's counterparty", () => {
    const rows = [["BV-SITE", "Acme Srl", "EPAL EUR1", "MIL", "05/03/2026", "", "10", ""]];
    const results = validateVoucherRows(headers, rows, mapping, lookups, t);
    expect(results[0].valid).toBe(true);
    if (results[0].valid) expect(results[0].voucher.site_id).toBe("site-1");
  });

  it("rejects a site that belongs to a different counterparty", () => {
    const rows = [["BV-WRONG-SITE", "Acme Srl", "EPAL EUR1", "Roma Deposito", "05/03/2026", "", "10", ""]];
    const results = validateVoucherRows(headers, rows, mapping, lookups, t);
    expect(results[0].valid).toBe(false);
    if (!results[0].valid) expect(results[0].errors.join(" ")).toMatch(/non appartiene alla controparte/);
  });

  it("rejects a voucher number that already exists in the organization", () => {
    const rows = [["BV-EXISTING", "Acme Srl", "EPAL EUR1", "", "05/03/2026", "", "10", ""]];
    const results = validateVoucherRows(headers, rows, mapping, lookups, t);
    expect(results[0].valid).toBe(false);
    if (!results[0].valid) {
      expect(results[0].errors.join(" ")).toMatch(/già esistente/);
    }
  });

  it("rejects duplicate voucher numbers within the same file", () => {
    const rows = [
      ["BV-DUP", "Acme Srl", "EPAL EUR1", "", "05/03/2026", "", "10", ""],
      ["BV-DUP", "Acme Srl", "EPAL EUR1", "", "06/03/2026", "", "5", ""],
    ];
    const results = validateVoucherRows(headers, rows, mapping, lookups, t);
    expect(results[0].valid).toBe(true);
    expect(results[1].valid).toBe(false);
    if (!results[1].valid) {
      expect(results[1].errors.join(" ")).toMatch(/duplicato nel file/);
    }
  });

  it("rejects a recovery due date before the issue date", () => {
    const rows = [["BV-2", "Acme Srl", "EPAL EUR1", "", "05/03/2026", "01/03/2026", "10", ""]];
    const results = validateVoucherRows(headers, rows, mapping, lookups, t);
    expect(results[0].valid).toBe(false);
    if (!results[0].valid) {
      expect(results[0].errors.join(" ")).toMatch(/non può precedere/);
    }
  });

  it("rejects an unknown counterparty or pallet type", () => {
    const rows = [["BV-3", "Unknown Co", "Unknown Pallet", "", "05/03/2026", "", "10", ""]];
    const results = validateVoucherRows(headers, rows, mapping, lookups, t);
    expect(results[0].valid).toBe(false);
    if (!results[0].valid) {
      expect(results[0].errors.join(" ")).toMatch(/Controparte non trovata/);
      expect(results[0].errors.join(" ")).toMatch(/Tipo pallet non trovato/);
    }
  });

  it("rejects a zero or non-integer quantity", () => {
    const rows = [["BV-4", "Acme Srl", "EPAL EUR1", "", "05/03/2026", "", "0", ""]];
    const results = validateVoucherRows(headers, rows, mapping, lookups, t);
    expect(results[0].valid).toBe(false);
  });

  it("preserves row numbers across independent rows", () => {
    const rows = [
      ["BV-5", "Acme Srl", "EPAL EUR1", "", "05/03/2026", "", "10", ""],
      ["", "Acme Srl", "EPAL EUR1", "", "05/03/2026", "", "10", ""],
    ];
    const results = validateVoucherRows(headers, rows, mapping, lookups, t);
    expect(results[0].rowNumber).toBe(1);
    expect(results[0].valid).toBe(true);
    expect(results[1].rowNumber).toBe(2);
    expect(results[1].valid).toBe(false);
  });

  // Independent-review finding: per-row CSV validation errors were
  // hardcoded Italian regardless of the viewer's locale. Pins that the
  // same row now resolves to genuinely different, locale-correct text.
  it("resolves the same validation error in the viewer's own locale", () => {
    const rows = [["BV-EXISTING", "Acme Srl", "EPAL EUR1", "", "05/03/2026", "", "10", ""]];
    const resultsIt = validateVoucherRows(headers, rows, mapping, lookups, t);
    const resultsEn = validateVoucherRows(headers, rows, mapping, lookups, tEn);
    expect(resultsIt[0].valid).toBe(false);
    expect(resultsEn[0].valid).toBe(false);
    if (!resultsIt[0].valid && !resultsEn[0].valid) {
      expect(resultsIt[0].errors.join(" ")).toMatch(/già esistente/);
      expect(resultsEn[0].errors.join(" ")).toMatch(/already exists/);
    }
  });
});

describe("missingRequiredVoucherMappings", () => {
  it("returns nothing when all required fields are mapped", () => {
    expect(missingRequiredVoucherMappings(mapping)).toEqual([]);
  });

  it("reports unmapped required fields", () => {
    const partial: VoucherColumnMapping = { voucherNumber: "Buono" };
    const missing = missingRequiredVoucherMappings(partial);
    expect(missing).toContain("counterparty");
    expect(missing).toContain("palletType");
    expect(missing).toContain("issueDate");
    expect(missing).toContain("quantity");
  });
});
