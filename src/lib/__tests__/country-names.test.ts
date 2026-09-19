import { describe, expect, it } from "vitest";
import { getCountryDisplayName, getLocalizedCountryOptions } from "@/lib/i18n/country-names";
import { ALL_COUNTRY_CODES, OFFICIAL_ISO_COUNTRY_CODES } from "@/lib/countries";

// These well-known, high-traffic countries have long-stable CLDR display
// names, so exact assertions are safe here. Per review guidance, this
// deliberately does NOT assert exact strings for obscure/rare territories
// where ICU wording can differ across environments/versions -- those are
// covered instead by the "resolves to a non-echoed name" check below.
describe("getCountryDisplayName", () => {
  it("renders IT locale names", () => {
    expect(getCountryDisplayName("IT", "it")).toBe("Italia");
    expect(getCountryDisplayName("DE", "it")).toBe("Germania");
    expect(getCountryDisplayName("GB", "it")).toBe("Regno Unito");
  });

  it("renders EN locale names for the same stored codes", () => {
    expect(getCountryDisplayName("IT", "en")).toBe("Italy");
    expect(getCountryDisplayName("DE", "en")).toBe("Germany");
    expect(getCountryDisplayName("GB", "en")).toBe("United Kingdom");
  });

  it("is case-insensitive on the stored code", () => {
    expect(getCountryDisplayName("de", "en")).toBe("Germany");
  });

  it("renders the explicit XK/Kosovo fallback in both locales, never leaking the raw code", () => {
    expect(getCountryDisplayName("XK", "en")).toBe("Kosovo");
    expect(getCountryDisplayName("XK", "it")).toBe("Kosovo");
  });

  it("falls back deterministically to the raw code for an unrecognized code, never throws", () => {
    expect(getCountryDisplayName("ZZ", "en")).toBe("ZZ");
    expect(getCountryDisplayName("ZZ", "it")).toBe("ZZ");
  });

  it("renders an em dash for null/undefined", () => {
    expect(getCountryDisplayName(null, "en")).toBe("—");
    expect(getCountryDisplayName(undefined, "en")).toBe("—");
  });

  it("resolves every official ISO code to a real, non-empty, non-echoed name in both locales (dependent territories included)", () => {
    for (const code of OFFICIAL_ISO_COUNTRY_CODES) {
      const en = getCountryDisplayName(code, "en");
      const it = getCountryDisplayName(code, "it");
      expect(en.length).toBeGreaterThan(0);
      expect(it.length).toBeGreaterThan(0);
      expect(en).not.toBe(code);
      expect(it).not.toBe(code);
    }
  });

  it("the same stored code renders differently across locales for at least the well-known cases (proves it is genuinely locale-aware, not a static table)", () => {
    expect(getCountryDisplayName("DE", "en")).not.toBe(getCountryDisplayName("DE", "it"));
    expect(getCountryDisplayName("GB", "en")).not.toBe(getCountryDisplayName("GB", "it"));
  });
});

describe("getLocalizedCountryOptions", () => {
  it("returns one option per input code, preserving the code as the stable value", () => {
    const options = getLocalizedCountryOptions(ALL_COUNTRY_CODES, "en");
    expect(options.length).toBe(ALL_COUNTRY_CODES.length);
    expect(new Set(options.map((o) => o.code))).toEqual(new Set(ALL_COUNTRY_CODES));
  });

  it("sorts by the displayed localized name, not by code", () => {
    const en = getLocalizedCountryOptions(["DE", "IT", "GB"], "en");
    expect(en.map((o) => o.name)).toEqual(["Germany", "Italy", "United Kingdom"]);
    expect(en.map((o) => o.code)).toEqual(["DE", "IT", "GB"]);

    const it = getLocalizedCountryOptions(["DE", "IT", "GB"], "it");
    expect(it.map((o) => o.name)).toEqual(["Germania", "Italia", "Regno Unito"]);
  });

  it("is sorted according to the locale's own collation for the full 250-code list (not code order)", () => {
    for (const locale of ["en", "it"] as const) {
      const options = getLocalizedCountryOptions(ALL_COUNTRY_CODES, locale);
      const collator = new Intl.Collator(locale);
      for (let i = 1; i < options.length; i++) {
        expect(collator.compare(options[i - 1].name, options[i].name)).toBeLessThanOrEqual(0);
      }
      // Confirms this is genuinely name-sorted, not incidentally
      // matching alpha-2 code order.
      expect(options.map((o) => o.code)).not.toEqual([...ALL_COUNTRY_CODES]);
    }
  });
});
