import { describe, expect, it } from "vitest";
import { createFormatters, formatFileSize } from "@/lib/format";

describe("createFormatters (it, EUR, Europe/Rome)", () => {
  const f = createFormatters("it", "EUR", "Europe/Rome");

  it("formats EUR with its ISO minor-unit decimals, symbol trailing", () => {
    expect(f.formatCurrency(1234)).toBe("1.234,00 €");
  });

  it("formats zero", () => {
    expect(f.formatCurrency(0)).toBe("0,00 €");
  });

  it("formats thousands with Italian separators", () => {
    expect(f.formatNumber(12345)).toBe("12.345");
  });

  it("formats dates as DD/MM/YYYY", () => {
    expect(f.formatDate("2026-03-05")).toBe("05/03/2026");
  });

  it("returns em dash for null/undefined dates", () => {
    expect(f.formatDate(null)).toBe("—");
    expect(f.formatDate(undefined)).toBe("—");
  });
});

describe("createFormatters (en, GBP, Europe/London)", () => {
  const f = createFormatters("en", "GBP", "Europe/London");

  it("formats GBP with its ISO minor-unit decimals, symbol leading", () => {
    expect(f.formatCurrency(1234)).toBe("£1,234.00");
  });

  it("formats thousands with English separators", () => {
    expect(f.formatNumber(12345)).toBe("12,345");
  });

  it("formats dates as DD/MM/YYYY (en-GB convention)", () => {
    expect(f.formatDate("2026-03-05")).toBe("05/03/2026");
  });
});

describe("createFormatters renders the same value differently per locale", () => {
  it("same currency amount, two locales", () => {
    const it = createFormatters("it", "EUR", "UTC");
    const en = createFormatters("en", "EUR", "UTC");
    expect(it.formatCurrency(1234)).toBe("1.234,00 €");
    expect(en.formatCurrency(1234)).toBe("€1,234.00");
  });
});

describe("createFormatters falls back safely on an invalid currency", () => {
  it("does not throw and still formats", () => {
    const f = createFormatters("en", "NOT_A_CODE", "UTC");
    expect(() => f.formatCurrency(10)).not.toThrow();
  });
});

// Independent-review finding: pallet_types.unit_value and
// recovery_cases.unit_value_snapshot are both numeric(12,2) -- a
// formatter that rounds away the decimal changes the *displayed*
// economic value (12.50 must never render as "13"), not just its
// presentation. These pin the exact ISO 4217 minor-unit behavior per
// currency so a future regression (e.g. a maximumFractionDigits: 0
// creeping back in) fails immediately.
describe("createFormatters preserves currency decimal precision (independent review)", () => {
  it("EUR: keeps cents, does not round 12.50 to 13", () => {
    const f = createFormatters("en", "EUR", "UTC");
    expect(f.formatCurrency(12.5)).toBe("€12.50");
    expect(f.formatCurrency(12.5)).not.toBe("€13");
  });

  it("GBP: keeps pence", () => {
    const f = createFormatters("en", "GBP", "UTC");
    expect(f.formatCurrency(12.5)).toBe("£12.50");
  });

  it("USD: keeps cents (en-GB disambiguates the $ sign as US$, correct ICU behavior)", () => {
    const f = createFormatters("en", "USD", "UTC");
    expect(f.formatCurrency(12.5)).toBe("US$12.50");
  });

  it("JPY: has zero decimal minor units by ISO 4217 definition, not a formatting bug", () => {
    const f = createFormatters("en", "JPY", "UTC");
    expect(f.formatCurrency(12)).toBe("JP¥12");
    // JPY genuinely has no minor unit -- 12.5 rounds per Intl's own
    // currency rounding, this is correct ISO behavior, not truncation
    // introduced by this app's formatter.
    expect(f.formatCurrency(12.5)).toBe("JP¥13");
  });

  it("preserves precision across an aggregated exposure total (sum of decimal unit values)", () => {
    // Mirrors real aggregation: (quantity_claimed - quantity_recovered) *
    // unit_value_snapshot, summed across several recovery_cases rows.
    const unitValues = [12.5, 7.25, 3.1];
    const quantities = [4, 3, 10];
    const total = unitValues.reduce((sum, unit, i) => sum + unit * quantities[i], 0);
    expect(total).toBeCloseTo(102.75, 2);
    const f = createFormatters("en", "EUR", "UTC");
    expect(f.formatCurrency(total)).toBe("€102.75");
  });
});

describe("formatFileSize", () => {
  it("formats bytes, kilobytes and megabytes", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(2048)).toBe("2 KB");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("returns em dash for invalid input", () => {
    expect(formatFileSize(-1)).toBe("—");
    expect(formatFileSize(NaN)).toBe("—");
  });
});
