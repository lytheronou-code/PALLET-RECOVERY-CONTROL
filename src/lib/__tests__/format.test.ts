import { describe, expect, it } from "vitest";
import { createFormatters, formatFileSize } from "@/lib/format";

describe("createFormatters (it, EUR, Europe/Rome)", () => {
  const f = createFormatters("it", "EUR", "Europe/Rome");

  it("formats EUR without decimals, symbol trailing", () => {
    expect(f.formatCurrency(1234)).toBe("1.234 €");
  });

  it("formats zero", () => {
    expect(f.formatCurrency(0)).toBe("0 €");
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

  it("formats GBP with symbol leading", () => {
    expect(f.formatCurrency(1234)).toBe("£1,234");
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
    expect(it.formatCurrency(1234)).toBe("1.234 €");
    expect(en.formatCurrency(1234)).toBe("€1,234");
  });
});

describe("createFormatters falls back safely on an invalid currency", () => {
  it("does not throw and still formats", () => {
    const f = createFormatters("en", "NOT_A_CODE", "UTC");
    expect(() => f.formatCurrency(10)).not.toThrow();
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
