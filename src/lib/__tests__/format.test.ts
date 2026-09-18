import { describe, expect, it } from "vitest";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";

describe("formatCurrency", () => {
  it("formats EUR without decimals", () => {
    expect(formatCurrency(1234)).toBe("1.234 €");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("0 €");
  });
});

describe("formatNumber", () => {
  it("formats thousands with Italian separators", () => {
    expect(formatNumber(12345)).toBe("12.345");
  });
});

describe("formatDate", () => {
  it("returns em dash for null/undefined", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
  });

  it("formats ISO dates as it-IT", () => {
    expect(formatDate("2026-03-05")).toBe("05/03/2026");
  });
});
