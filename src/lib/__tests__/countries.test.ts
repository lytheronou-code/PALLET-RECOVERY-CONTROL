import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { COUNTRIES, isSupportedCountry, countryName } from "@/lib/countries";

// Independent-review finding: src/lib/countries.ts previously claimed to
// be "ISO 3166-1 alpha-2 country codes" without qualification, which was
// inaccurate -- it is a deliberately curated subset. These tests pin the
// exact, documented coverage (all 193 UN member states + HK/TW/VA/XK) so
// a future edit that silently drops a real country, or silently expands
// scope into the full ~249-code ISO set without updating the SQL side,
// fails immediately.
const UN_MEMBER_STATES = `
AF AL DZ AD AO AG AR AM AU AT AZ
BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI
CV KH CM CA CF TD CL CN CO KM CG CD CR CI HR CU CY CZ
DK DJ DM DO
EC EG SV GQ ER EE SZ ET
FJ FI FR
GA GM GE DE GH GR GD GT GN GW GY
HT HN HU
IS IN ID IR IQ IE IL IT
JM JP JO
KZ KE KI KP KR KW KG
LA LV LB LS LR LY LI LT LU
MG MW MY MV ML MT MH MR MU MX FM MD MC MN ME MA MZ MM
NA NR NP NL NZ NI NE NG MK NO
OM
PK PW PA PG PY PE PH PL PT
QA
RO RU RW
KN LC VC WS SM ST
SA SN RS SC SL SG SK SI SB SO ZA SS ES LK SD SR SE CH SY
TJ TZ TH TL TG TO TT TN TR TM TV
UG UA AE GB US UY UZ
VU VE VN
YE
ZM ZW
`
  .split(/\s+/)
  .filter(Boolean);

const NON_UN_EXTRAS = ["HK", "TW", "VA", "XK"];

describe("COUNTRIES coverage", () => {
  it("has exactly 193 UN member states", () => {
    expect(UN_MEMBER_STATES.length).toBe(193);
  });

  it("includes every UN member state", () => {
    const codes = new Set(COUNTRIES.map((c) => c.code));
    const missing = UN_MEMBER_STATES.filter((c) => !codes.has(c));
    expect(missing).toEqual([]);
  });

  it("includes exactly the four documented non-UN-member extras, no more", () => {
    const codes = new Set(COUNTRIES.map((c) => c.code));
    const extras = COUNTRIES.map((c) => c.code).filter((c) => !UN_MEMBER_STATES.includes(c));
    expect(extras.sort()).toEqual([...NON_UN_EXTRAS].sort());
    for (const extra of NON_UN_EXTRAS) {
      expect(codes.has(extra)).toBe(true);
    }
  });

  it("has no duplicate codes", () => {
    const codes = COUNTRIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("every code is a well-formed 2-letter uppercase code", () => {
    for (const { code } of COUNTRIES) {
      expect(code).toMatch(/^[A-Z]{2}$/);
    }
  });

  it("every entry has a non-empty name", () => {
    for (const { name } of COUNTRIES) {
      expect(name.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("isSupportedCountry / countryName (extended)", () => {
  it("accepts a sovereign state code", () => {
    expect(isSupportedCountry("DE")).toBe(true);
    expect(countryName("DE")).toBe("Germany");
  });

  it("accepts the deliberate non-UN territory/entity extras", () => {
    expect(isSupportedCountry("HK")).toBe(true);
    expect(isSupportedCountry("TW")).toBe(true);
    expect(isSupportedCountry("VA")).toBe(true);
    expect(isSupportedCountry("XK")).toBe(true);
    expect(countryName("XK")).toBe("Kosovo");
  });

  it("rejects a real ISO 3166-1 code this product deliberately does not support (a dependent territory, not a country)", () => {
    // Greenland (GL) is an officially assigned ISO 3166-1 code but is
    // deliberately outside this product's curated set -- confirms the
    // list is a real subset, not silently the full standard.
    expect(isSupportedCountry("GL")).toBe(false);
  });

  it("rejects invalid/malformed input without throwing", () => {
    expect(isSupportedCountry("ZZ")).toBe(false);
    expect(isSupportedCountry("USA")).toBe(false);
    expect(isSupportedCountry("")).toBe(false);
    expect(isSupportedCountry(null)).toBe(false);
    expect(isSupportedCountry(undefined)).toBe(false);
  });

  it("falls back to the raw code for an unknown code, and an em dash for null", () => {
    expect(countryName("ZZ")).toBe("ZZ");
    expect(countryName(null)).toBe("—");
    expect(countryName(undefined)).toBe("—");
  });
});

describe("TS/SQL country list synchronization", () => {
  it("matches exactly the CHECK constraint list in the country-validation migration", () => {
    const migrationPath = path.resolve(
      import.meta.dirname,
      "../../../supabase/migrations/20260919110000_fix_country_currency_validation_logic.sql",
    );
    const sql = readFileSync(migrationPath, "utf8");
    const start = sql.indexOf("v_country_code <> all (array[");
    const end = sql.indexOf("]) then", start);
    expect(start).toBeGreaterThan(-1);
    const chunk = sql.slice(start, end);
    const sqlCodes = new Set([...chunk.matchAll(/'([A-Z]{2})'/g)].map((m) => m[1]));

    const tsCodes = new Set(COUNTRIES.map((c) => c.code));

    const onlyInTs = [...tsCodes].filter((c) => !sqlCodes.has(c));
    const onlyInSql = [...sqlCodes].filter((c) => !tsCodes.has(c));
    expect(onlyInTs).toEqual([]);
    expect(onlyInSql).toEqual([]);
    expect(sqlCodes.size).toBe(tsCodes.size);
  });
});
