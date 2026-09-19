import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  OFFICIAL_ISO_COUNTRY_CODES,
  PRODUCT_EXTENSION_COUNTRY_CODES,
  ALL_COUNTRY_CODES,
  isOfficialIsoCountryCode,
  isProductExtensionCountryCode,
  isSupportedCountry,
} from "@/lib/countries";

// Independent-review correction: the previous version of this file
// pinned a deliberately curated ~197-entry subset (all 193 UN member
// states + 4 extras) that excluded real, officially assigned ISO 3166-1
// codes for dependent territories/special areas (Puerto Rico, Macao,
// Greenland, Gibraltar, the Faroe Islands, ...). These tests now pin the
// opposite property: the FULL official ISO 3166-1 alpha-2 set (249
// entries) is supported, with no exclusions, plus exactly one documented
// non-ISO product extension (XK/Kosovo) kept clearly distinct from it.
describe("OFFICIAL_ISO_COUNTRY_CODES", () => {
  it("has exactly 249 entries, all unique, well-formed 2-letter uppercase codes", () => {
    expect(OFFICIAL_ISO_COUNTRY_CODES.length).toBe(249);
    expect(new Set(OFFICIAL_ISO_COUNTRY_CODES).size).toBe(249);
    for (const code of OFFICIAL_ISO_COUNTRY_CODES) {
      expect(code).toMatch(/^[A-Z]{2}$/);
    }
  });

  it("does not include XK -- it is a product extension, never described as ISO", () => {
    expect(OFFICIAL_ISO_COUNTRY_CODES.includes("XK")).toBe(false);
  });

  it("resolves to a real, non-echoed localized name in both en and it via ICU -- a cheap sanity check that catches typos", () => {
    const en = new Intl.DisplayNames(["en"], { type: "region" });
    const it = new Intl.DisplayNames(["it"], { type: "region" });
    const unresolved = OFFICIAL_ISO_COUNTRY_CODES.filter(
      (code) => en.of(code) === code && it.of(code) === code,
    );
    expect(unresolved).toEqual([]);
  });
});

describe("PRODUCT_EXTENSION_COUNTRY_CODES", () => {
  it("is exactly [XK]", () => {
    expect(PRODUCT_EXTENSION_COUNTRY_CODES).toEqual(["XK"]);
  });
});

describe("isOfficialIsoCountryCode / isProductExtensionCountryCode", () => {
  it("classifies a real ISO code as official, not a product extension", () => {
    expect(isOfficialIsoCountryCode("DE")).toBe(true);
    expect(isProductExtensionCountryCode("DE")).toBe(false);
  });

  it("classifies XK as a product extension, never as official ISO", () => {
    expect(isOfficialIsoCountryCode("XK")).toBe(false);
    expect(isProductExtensionCountryCode("XK")).toBe(true);
  });

  it("classifies an unrecognized code as neither", () => {
    expect(isOfficialIsoCountryCode("ZZ")).toBe(false);
    expect(isProductExtensionCountryCode("ZZ")).toBe(false);
  });
});

describe("isSupportedCountry", () => {
  it("accepts every one of the specifically required codes, including dependent territories/special areas the previous curated list excluded", () => {
    const required = ["IT", "GB", "US", "BR", "JP", "HK", "TW", "PR", "MO", "GL", "GI", "FO"];
    for (const code of required) {
      expect(isSupportedCountry(code)).toBe(true);
    }
  });

  it("accepts XK as the documented product extension", () => {
    expect(isSupportedCountry("XK")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isSupportedCountry("de")).toBe(true);
    expect(isSupportedCountry("Gb")).toBe(true);
  });

  it("rejects invalid/malformed input without throwing", () => {
    expect(isSupportedCountry("ZZ")).toBe(false);
    expect(isSupportedCountry("XX")).toBe(false);
    expect(isSupportedCountry("ABC")).toBe(false);
    expect(isSupportedCountry("")).toBe(false);
    expect(isSupportedCountry(null)).toBe(false);
    expect(isSupportedCountry(undefined)).toBe(false);
  });
});

describe("ALL_COUNTRY_CODES", () => {
  it("is exactly the official set plus XK -- 250 entries, no duplicates", () => {
    expect(ALL_COUNTRY_CODES.length).toBe(250);
    expect(new Set(ALL_COUNTRY_CODES).size).toBe(250);
    expect(new Set(ALL_COUNTRY_CODES)).toEqual(
      new Set([...OFFICIAL_ISO_COUNTRY_CODES, ...PRODUCT_EXTENSION_COUNTRY_CODES]),
    );
  });
});

describe("TS/SQL country list synchronization", () => {
  it("OFFICIAL_ISO_COUNTRY_CODES matches exactly the country_codes reference-table migration's ISO rows", () => {
    const migrationPath = path.resolve(
      import.meta.dirname,
      "../../../supabase/migrations/20260919130000_country_codes_reference_table.sql",
    );
    const sql = readFileSync(migrationPath, "utf8");

    const start = sql.indexOf("select code, true from unnest(array[");
    expect(start).toBeGreaterThan(-1);
    const end = sql.indexOf("]) as code;", start);
    const chunk = sql.slice(start, end);
    const sqlIsoCodes = new Set([...chunk.matchAll(/'([A-Z]{2})'/g)].map((m) => m[1]));

    const tsIsoCodes = new Set(OFFICIAL_ISO_COUNTRY_CODES);

    const onlyInTs = [...tsIsoCodes].filter((c) => !sqlIsoCodes.has(c));
    const onlyInSql = [...sqlIsoCodes].filter((c) => !tsIsoCodes.has(c));
    expect(onlyInTs).toEqual([]);
    expect(onlyInSql).toEqual([]);
    expect(sqlIsoCodes.size).toBe(tsIsoCodes.size);

    // XK is inserted separately with is_iso = false -- confirm the
    // migration keeps it out of the ISO array and documents it as an
    // extension the same way the TS side does.
    expect(chunk.includes("'XK'")).toBe(false);
    expect(sql.includes("insert into public.country_codes (code, is_iso) values ('XK', false);")).toBe(true);
  });
});
