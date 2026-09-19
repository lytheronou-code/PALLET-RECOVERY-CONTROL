// A curated ISO 4217 subset for the currency selector, not the full ~180
// code standard: broad enough for an international B2B pallet-logistics
// SaaS (EU, UK, US/CA, CH/Nordics, major APAC/LatAm/MEA trade partners)
// without maintaining a list nobody will ever pick from. Extending it is a
// one-line addition, never a migration -- organizations.default_currency is
// just format-checked (3 uppercase letters) at the DB layer; this list is
// the actual "supported" set enforced by the settings RPC and the UI.
export const CURRENCY_CODES = [
  "EUR",
  "USD",
  "GBP",
  "CHF",
  "SEK",
  "NOK",
  "DKK",
  "PLN",
  "CZK",
  "HUF",
  "RON",
  "CAD",
  "AUD",
  "NZD",
  "JPY",
  "CNY",
  "INR",
  "BRL",
  "MXN",
  "ZAR",
  "AED",
  "SAR",
  "SGD",
  "HKD",
  "TRY",
] as const;

export type CurrencyCode = (typeof CURRENCY_CODES)[number];

export function isSupportedCurrency(value: string | null | undefined): value is CurrencyCode {
  return !!value && (CURRENCY_CODES as readonly string[]).includes(value);
}
