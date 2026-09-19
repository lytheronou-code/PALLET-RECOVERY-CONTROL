import { describe, expect, it } from "vitest";
import { isValidHexColor, getReadableTextColor } from "@/lib/branding/color";
import { validateLogoFile, matchesLogoFileSignature, isAllowedLogoMimeType, MAX_LOGO_SIZE_BYTES } from "@/lib/branding/logo";
import { resolveWelcomeMessage } from "@/lib/branding/welcome-message";
import { isSupportedCurrency, CURRENCY_CODES } from "@/lib/currencies";
import { isSupportedCountry } from "@/lib/countries";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translator";

describe("isValidHexColor", () => {
  it("accepts a well-formed 6-digit hex color", () => {
    expect(isValidHexColor("#0F766E")).toBe(true);
    expect(isValidHexColor("#000000")).toBe(true);
    expect(isValidHexColor("#ffffff")).toBe(true);
  });

  it("rejects malformed or arbitrary CSS values", () => {
    expect(isValidHexColor("0F766E")).toBe(false); // missing #
    expect(isValidHexColor("#0F766")).toBe(false); // too short
    expect(isValidHexColor("#0F766EFF")).toBe(false); // 8-digit
    expect(isValidHexColor("teal")).toBe(false);
    expect(isValidHexColor("rgb(15,118,110)")).toBe(false);
    expect(isValidHexColor("red; } body { display: none")).toBe(false);
    expect(isValidHexColor(null)).toBe(false);
    expect(isValidHexColor(undefined)).toBe(false);
    expect(isValidHexColor("")).toBe(false);
  });
});

describe("getReadableTextColor", () => {
  it("picks white text on a dark background", () => {
    expect(getReadableTextColor("#0B0B0B")).toBe("#FFFFFF");
    expect(getReadableTextColor("#0F766E")).toBe("#FFFFFF");
  });

  it("picks black text on a light background", () => {
    expect(getReadableTextColor("#FFFFFF")).toBe("#000000");
    expect(getReadableTextColor("#FDE68A")).toBe("#000000");
  });

  it("falls back to black for an invalid color rather than throwing", () => {
    expect(() => getReadableTextColor("not-a-color")).not.toThrow();
    expect(getReadableTextColor("not-a-color")).toBe("#000000");
  });
});

describe("validateLogoFile", () => {
  it("accepts a well-formed PNG under the size limit", () => {
    const result = validateLogoFile({ type: "image/png", size: 1024, name: "logo.png" });
    expect(result.valid).toBe(true);
  });

  it("rejects a file over the size limit", () => {
    const result = validateLogoFile({ type: "image/png", size: MAX_LOGO_SIZE_BYTES + 1, name: "logo.png" });
    expect(result.valid).toBe(false);
  });

  it("rejects an unsupported MIME type (e.g. SVG)", () => {
    const result = validateLogoFile({ type: "image/svg+xml", size: 1024, name: "logo.svg" });
    expect(result.valid).toBe(false);
  });

  it("rejects a PDF (documents-only format, not a logo)", () => {
    const result = validateLogoFile({ type: "application/pdf", size: 1024, name: "logo.pdf" });
    expect(result.valid).toBe(false);
  });

  it("rejects a mismatched extension for a declared MIME type", () => {
    const result = validateLogoFile({ type: "image/png", size: 1024, name: "logo.jpg" });
    expect(result.valid).toBe(false);
  });

  it("rejects an empty file", () => {
    const result = validateLogoFile({ type: "image/png", size: 0, name: "logo.png" });
    expect(result.valid).toBe(false);
  });
});

describe("matchesLogoFileSignature", () => {
  it("accepts real PNG magic bytes", () => {
    const header = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    expect(matchesLogoFileSignature(header, "image/png")).toBe(true);
  });

  it("rejects a renamed non-image file claiming to be a PNG", () => {
    const header = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0, 0, 0, 0, 0, 0, 0]); // %PDF-
    expect(matchesLogoFileSignature(header, "image/png")).toBe(false);
  });

  it("accepts real WEBP magic bytes (RIFF....WEBP)", () => {
    const header = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    expect(matchesLogoFileSignature(header, "image/webp")).toBe(true);
  });

  it("rejects an unsupported mime type outright", () => {
    const header = new Uint8Array(12);
    expect(matchesLogoFileSignature(header, "image/svg+xml")).toBe(false);
  });
});

describe("isAllowedLogoMimeType", () => {
  it("does not include SVG or PDF", () => {
    expect(isAllowedLogoMimeType("image/svg+xml")).toBe(false);
    expect(isAllowedLogoMimeType("application/pdf")).toBe(false);
    expect(isAllowedLogoMimeType("image/png")).toBe(true);
  });
});

describe("isSupportedCurrency", () => {
  it("accepts every listed currency code", () => {
    for (const code of CURRENCY_CODES) {
      expect(isSupportedCurrency(code)).toBe(true);
    }
  });

  it("rejects a well-formed but unsupported code", () => {
    expect(isSupportedCurrency("ZZZ")).toBe(false);
  });

  it("rejects malformed input", () => {
    expect(isSupportedCurrency("eur")).toBe(false); // wrong case, not normalized here
    expect(isSupportedCurrency("")).toBe(false);
    expect(isSupportedCurrency(null)).toBe(false);
  });
});

describe("isSupportedCountry", () => {
  it("accepts real ISO 3166-1 alpha-2 codes", () => {
    expect(isSupportedCountry("IT")).toBe(true);
    expect(isSupportedCountry("GB")).toBe(true);
    expect(isSupportedCountry("us")).toBe(true); // case-insensitive
  });

  it("rejects an unrecognized code", () => {
    expect(isSupportedCountry("ZZ")).toBe(false);
    expect(isSupportedCountry("USA")).toBe(false);
  });
});

// Independent-review DoD #3 / #9: the welcome-message fallback chain must
// render clean copy for every white-label combination, not just the happy
// path of "admin configured a message in the viewer's own locale".
describe("resolveWelcomeMessage", () => {
  const tEn = createTranslator(getDictionary("en"));
  const tIt = createTranslator(getDictionary("it"));

  it("prefers the viewer's own resolved locale", () => {
    const result = resolveWelcomeMessage({ en: "Hello there", it: "Ciao" }, "it", "en", tEn);
    expect(result).toBe("Ciao");
  });

  it("falls back to the organization's default locale when the viewer's locale has no message", () => {
    const result = resolveWelcomeMessage({ en: "Hello there" }, "it", "en", tEn);
    expect(result).toBe("Hello there");
  });

  it("falls back to a generic translated message when no localization exists at all", () => {
    expect(resolveWelcomeMessage({}, "en", "en", tEn)).toBe(tEn("clientPortal.defaultWelcomeMessage"));
    expect(resolveWelcomeMessage({}, "it", "it", tIt)).toBe(tIt("clientPortal.defaultWelcomeMessage"));
  });

  it("never returns a blank string for a configured-but-empty branding row", () => {
    const result = resolveWelcomeMessage({}, "en", "it", tEn);
    expect(result).toBe(tEn("clientPortal.defaultWelcomeMessage"));
    expect(result.length).toBeGreaterThan(0);
  });

  it("does not leak the org-default-locale message when the viewer's own locale has an explicit (even if different) message", () => {
    const result = resolveWelcomeMessage({ en: "English welcome", it: "Benvenuto" }, "en", "it", tEn);
    expect(result).toBe("English welcome");
  });
});
