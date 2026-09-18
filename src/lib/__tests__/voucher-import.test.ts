import { describe, expect, it } from "vitest";
import { buildLookupKey } from "@/lib/csv/movement-import";
import {
  validateVoucherRows,
  missingRequiredVoucherMappings,
  type VoucherColumnMapping,
  type VoucherLookups,
} from "@/lib/csv/voucher-import";

const headers = ["Buono", "Cliente", "Pallet", "Emissione", "Scadenza", "Qta", "Note"];

const mapping: VoucherColumnMapping = {
  voucherNumber: "Buono",
  counterparty: "Cliente",
  palletType: "Pallet",
  issueDate: "Emissione",
  recoveryDueDate: "Scadenza",
  quantity: "Qta",
  notes: "Note",
};

const lookups: VoucherLookups = {
  counterpartyIdByKey: new Map([[buildLookupKey("Acme Srl"), "cp-1"]]),
  palletTypeIdByKey: new Map([[buildLookupKey("EPAL EUR1"), "pt-1"]]),
  existingVoucherNumbers: new Set([buildLookupKey("BV-EXISTING")]),
};

describe("validateVoucherRows", () => {
  it("accepts a fully valid row and resolves ids", () => {
    const rows = [["BV-1", "Acme Srl", "EPAL EUR1", "05/03/2026", "05/04/2026", "10", "ok"]];
    const results = validateVoucherRows(headers, rows, mapping, lookups);
    expect(results[0].valid).toBe(true);
    if (results[0].valid) {
      expect(results[0].voucher).toEqual({
        voucher_number: "BV-1",
        counterparty_id: "cp-1",
        pallet_type_id: "pt-1",
        issue_date: "2026-03-05",
        recovery_due_date: "2026-04-05",
        quantity: 10,
        notes: "ok",
      });
    }
  });

  it("rejects a voucher number that already exists in the organization", () => {
    const rows = [["BV-EXISTING", "Acme Srl", "EPAL EUR1", "05/03/2026", "", "10", ""]];
    const results = validateVoucherRows(headers, rows, mapping, lookups);
    expect(results[0].valid).toBe(false);
    if (!results[0].valid) {
      expect(results[0].errors.join(" ")).toMatch(/già esistente/);
    }
  });

  it("rejects duplicate voucher numbers within the same file", () => {
    const rows = [
      ["BV-DUP", "Acme Srl", "EPAL EUR1", "05/03/2026", "", "10", ""],
      ["BV-DUP", "Acme Srl", "EPAL EUR1", "06/03/2026", "", "5", ""],
    ];
    const results = validateVoucherRows(headers, rows, mapping, lookups);
    expect(results[0].valid).toBe(true);
    expect(results[1].valid).toBe(false);
    if (!results[1].valid) {
      expect(results[1].errors.join(" ")).toMatch(/duplicato nel file/);
    }
  });

  it("rejects a recovery due date before the issue date", () => {
    const rows = [["BV-2", "Acme Srl", "EPAL EUR1", "05/03/2026", "01/03/2026", "10", ""]];
    const results = validateVoucherRows(headers, rows, mapping, lookups);
    expect(results[0].valid).toBe(false);
    if (!results[0].valid) {
      expect(results[0].errors.join(" ")).toMatch(/non può precedere/);
    }
  });

  it("rejects an unknown counterparty or pallet type", () => {
    const rows = [["BV-3", "Unknown Co", "Unknown Pallet", "05/03/2026", "", "10", ""]];
    const results = validateVoucherRows(headers, rows, mapping, lookups);
    expect(results[0].valid).toBe(false);
    if (!results[0].valid) {
      expect(results[0].errors.join(" ")).toMatch(/Controparte non trovata/);
      expect(results[0].errors.join(" ")).toMatch(/Tipo pallet non trovato/);
    }
  });

  it("rejects a zero or non-integer quantity", () => {
    const rows = [["BV-4", "Acme Srl", "EPAL EUR1", "05/03/2026", "", "0", ""]];
    const results = validateVoucherRows(headers, rows, mapping, lookups);
    expect(results[0].valid).toBe(false);
  });

  it("preserves row numbers across independent rows", () => {
    const rows = [
      ["BV-5", "Acme Srl", "EPAL EUR1", "05/03/2026", "", "10", ""],
      ["", "Acme Srl", "EPAL EUR1", "05/03/2026", "", "10", ""],
    ];
    const results = validateVoucherRows(headers, rows, mapping, lookups);
    expect(results[0].rowNumber).toBe(1);
    expect(results[0].valid).toBe(true);
    expect(results[1].rowNumber).toBe(2);
    expect(results[1].valid).toBe(false);
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
