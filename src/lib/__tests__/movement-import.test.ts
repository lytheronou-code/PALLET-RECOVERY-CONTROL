import { describe, expect, it } from "vitest";
import {
  buildLookupKey,
  normalizeDate,
  normalizeDirection,
  validateMovementRow,
  validateMovementRows,
  missingRequiredMappings,
  type ColumnMapping,
  type MovementLookups,
} from "@/lib/csv/movement-import";

const headers = ["Data", "Cliente", "Pallet", "Dir", "Qta", "DocTipo", "DocNum", "Buono", "Note"];

const mapping: ColumnMapping = {
  movementDate: "Data",
  counterparty: "Cliente",
  palletType: "Pallet",
  direction: "Dir",
  quantity: "Qta",
  documentType: "DocTipo",
  documentNumber: "DocNum",
  voucherNumber: "Buono",
  notes: "Note",
};

const lookups: MovementLookups = {
  counterpartyIdByKey: new Map([[buildLookupKey("Acme Srl"), "cp-1"]]),
  palletTypeIdByKey: new Map([[buildLookupKey("EPAL EUR1"), "pt-1"]]),
};

describe("normalizeDate", () => {
  it("accepts ISO dates", () => {
    expect(normalizeDate("2026-03-05")).toBe("2026-03-05");
  });

  it("accepts DD/MM/YYYY and converts to ISO", () => {
    expect(normalizeDate("05/03/2026")).toBe("2026-03-05");
  });

  it("rejects an impossible calendar date", () => {
    expect(normalizeDate("31/02/2026")).toBeNull();
  });

  it("rejects garbage input", () => {
    expect(normalizeDate("not a date")).toBeNull();
  });
});

describe("normalizeDirection", () => {
  it("maps common IN aliases", () => {
    expect(normalizeDirection("IN")).toBe("inbound");
    expect(normalizeDirection("entrata")).toBe("inbound");
  });

  it("maps common OUT aliases", () => {
    expect(normalizeDirection("out")).toBe("outbound");
    expect(normalizeDirection("Uscita")).toBe("outbound");
  });

  it("returns null for unknown values", () => {
    expect(normalizeDirection("sideways")).toBeNull();
  });
});

describe("validateMovementRow", () => {
  it("accepts a fully valid row and resolves ids", () => {
    const row = ["05/03/2026", "Acme Srl", "EPAL EUR1", "IN", "10", "DDT", "123", "V-1", "ok"];
    const result = validateMovementRow(headers, row, mapping, lookups, 1);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.movement).toEqual({
        movement_date: "2026-03-05",
        counterparty_id: "cp-1",
        pallet_type_id: "pt-1",
        direction: "inbound",
        quantity: 10,
        document_type: "DDT",
        document_number: "123",
        voucher_number: "V-1",
        notes: "ok",
      });
    }
  });

  it("rejects an unknown counterparty", () => {
    const row = ["05/03/2026", "Unknown Co", "EPAL EUR1", "IN", "10", "", "", "", ""];
    const result = validateMovementRow(headers, row, mapping, lookups, 2);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.join(" ")).toMatch(/Controparte non trovata/);
    }
  });

  it("rejects a zero or negative quantity", () => {
    const row = ["05/03/2026", "Acme Srl", "EPAL EUR1", "IN", "0", "", "", "", ""];
    const result = validateMovementRow(headers, row, mapping, lookups, 3);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.join(" ")).toMatch(/Quantità non valida/);
    }
  });

  it("rejects a non-integer quantity", () => {
    const row = ["05/03/2026", "Acme Srl", "EPAL EUR1", "IN", "3.5", "", "", "", ""];
    const result = validateMovementRow(headers, row, mapping, lookups, 4);
    expect(result.valid).toBe(false);
  });

  it("collects multiple errors on the same row instead of stopping at the first", () => {
    const row = ["not-a-date", "Unknown Co", "Unknown Pallet", "sideways", "-1", "", "", "", ""];
    const result = validateMovementRow(headers, row, mapping, lookups, 5);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.length).toBe(5);
    }
  });
});

describe("validateMovementRows", () => {
  it("validates every row independently and preserves row numbers", () => {
    const rows = [
      ["05/03/2026", "Acme Srl", "EPAL EUR1", "IN", "10", "", "", "", ""],
      ["not-a-date", "Acme Srl", "EPAL EUR1", "IN", "10", "", "", "", ""],
    ];
    const results = validateMovementRows(headers, rows, mapping, lookups);
    expect(results).toHaveLength(2);
    expect(results[0].rowNumber).toBe(1);
    expect(results[0].valid).toBe(true);
    expect(results[1].rowNumber).toBe(2);
    expect(results[1].valid).toBe(false);
  });
});

describe("missingRequiredMappings", () => {
  it("returns nothing when all required fields are mapped", () => {
    expect(missingRequiredMappings(mapping)).toEqual([]);
  });

  it("reports unmapped required fields", () => {
    const partial: ColumnMapping = { movementDate: "Data" };
    const missing = missingRequiredMappings(partial);
    expect(missing).toContain("counterparty");
    expect(missing).toContain("palletType");
    expect(missing).toContain("direction");
    expect(missing).toContain("quantity");
  });
});
