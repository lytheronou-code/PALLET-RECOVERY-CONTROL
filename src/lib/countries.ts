// Independent-review correction (see PR #9 discussion): the previous
// version of this file was a deliberately curated ~197-entry subset
// (UN member states + 4 extras) that excluded real, officially assigned
// ISO 3166-1 alpha-2 codes for dependent territories/special areas --
// Puerto Rico, Macao, Greenland, Gibraltar, the Faroe Islands, and
// others. That made it impossible to represent a real counterparty,
// site, or organization legitimately located in one of those
// territories, which is a genuine business restriction this B2B
// logistics product has no reason to impose: a customer registered in
// one jurisdiction can have sites, customers or carriers in another.
//
// This file now lists the COMPLETE set of currently, officially assigned
// ISO 3166-1 alpha-2 codes -- 249 entries -- with no exclusions. Every
// entry was cross-checked against ICU/CLDR's own region data (see
// countries.test.ts: every code here resolves to a real, non-echoed
// localized name via Intl.DisplayNames in both "en" and "it").
//
// Country codes are canonical reference data, not UI copy: this file
// intentionally stores no country NAMES at all (see the previous
// version's mistake of hardcoding English names as if they were
// locale-agnostic). Display names are resolved at render time from the
// viewer's own locale via Intl.DisplayNames -- see
// src/lib/i18n/country-names.ts. Storing ~249 names per locale here
// would both duplicate ICU's own data and require hand-translating them
// for every future locale; Intl.DisplayNames solves both problems for
// free and for every locale the platform ever adds.
export const OFFICIAL_ISO_COUNTRY_CODES: readonly string[] = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT", "AU", "AW", "AX", "AZ",
  "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BV", "BW", "BY", "BZ",
  "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN", "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ",
  "DE", "DJ", "DK", "DM", "DO", "DZ",
  "EC", "EE", "EG", "EH", "ER", "ES", "ET",
  "FI", "FJ", "FK", "FM", "FO", "FR",
  "GA", "GB", "GD", "GE", "GF", "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY",
  "HK", "HM", "HN", "HR", "HT", "HU",
  "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT",
  "JE", "JM", "JO", "JP",
  "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ",
  "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY",
  "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK", "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ",
  "NA", "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ",
  "OM",
  "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PW", "PY",
  "QA",
  "RE", "RO", "RS", "RU", "RW",
  "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS", "ST", "SV", "SX", "SY", "SZ",
  "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ",
  "UA", "UG", "UM", "US", "UY", "UZ",
  "VA", "VC", "VE", "VG", "VI", "VN", "VU",
  "WF", "WS",
  "YE", "YT",
  "ZA", "ZM", "ZW",
];

// XK (Kosovo) is NOT an officially assigned ISO 3166-1 alpha-2 code --
// ISO has never assigned Kosovo a code. This is a deliberate, documented
// PRODUCT EXTENSION, not an ISO code: Kosovo is a real trading partner,
// and XK is the same "exceptionally reserved" code already used for it
// by the EU, Eurostat and SWIFT, kept here rather than omitting a real
// country or inventing a different, non-standard code. Every consumer of
// this module can distinguish the two sets (isOfficialIsoCountryCode vs
// isProductExtensionCountryCode) instead of treating XK as if it were ISO.
export const PRODUCT_EXTENSION_COUNTRY_CODES: readonly string[] = ["XK"];

export const ALL_COUNTRY_CODES: readonly string[] = [
  ...OFFICIAL_ISO_COUNTRY_CODES,
  ...PRODUCT_EXTENSION_COUNTRY_CODES,
].sort();

const OFFICIAL_SET = new Set(OFFICIAL_ISO_COUNTRY_CODES);
const EXTENSION_SET = new Set(PRODUCT_EXTENSION_COUNTRY_CODES);
const ALL_SET = new Set(ALL_COUNTRY_CODES);

export function isOfficialIsoCountryCode(value: string | null | undefined): boolean {
  return !!value && OFFICIAL_SET.has(value.toUpperCase());
}

export function isProductExtensionCountryCode(value: string | null | undefined): boolean {
  return !!value && EXTENSION_SET.has(value.toUpperCase());
}

export function isSupportedCountry(value: string | null | undefined): boolean {
  return !!value && ALL_SET.has(value.toUpperCase());
}
