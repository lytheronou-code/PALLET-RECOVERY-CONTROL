import type { Locale } from "@/i18n/locale";

// en-GB rather than en-US: this is an international B2B product, not a
// US-only one, and DD/MM dates plus a leading currency symbol are the
// less ambiguous convention for a European-heavy customer base. it-IT
// already gives DD/MM/YYYY with a trailing symbol.
const INTL_LOCALE: Record<Locale, string> = { en: "en-GB", it: "it-IT" };

// Some ICU builds render the currency/number gap as a non-breaking or
// narrow-no-break space; normalize to a regular space for predictable
// rendering and copy/paste behavior.
function normalizeSpaces(value: string): string {
  return value.replace(/[  ]/g, " ");
}

export type Formatters = {
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
  formatDate: (value: string | null | undefined) => string;
  formatFileSize: (bytes: number) => string;
};

/**
 * Builds the locale/currency/timezone-bound formatter set for one resolved
 * viewer context (src/i18n/server.ts's getFormatters()). Deliberately not a
 * set of module-level singletons: the same organization's data must render
 * differently for an "it" viewer and an "en" viewer of the same org, and
 * currency/timezone come from the organization row, not a constant.
 *
 * currency is expected to already be validated (src/lib/currencies.ts) by
 * the time it reaches here; Intl.NumberFormat throws RangeError on a
 * malformed code, so an invalid value still falls back to EUR rather than
 * crashing a render.
 */
export function createFormatters(locale: Locale, currency: string, timeZone: string): Formatters {
  const intlLocale = INTL_LOCALE[locale];

  let currencyFormatter: Intl.NumberFormat;
  try {
    currencyFormatter = new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
      useGrouping: true,
    });
  } catch {
    currencyFormatter = new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
      useGrouping: true,
    });
  }

  const numberFormatter = new Intl.NumberFormat(intlLocale, { useGrouping: true });

  let dateFormatter: Intl.DateTimeFormat;
  try {
    dateFormatter = new Intl.DateTimeFormat(intlLocale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone,
    });
  } catch {
    dateFormatter = new Intl.DateTimeFormat(intlLocale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  return {
    formatCurrency: (value) => normalizeSpaces(currencyFormatter.format(value)),
    formatNumber: (value) => normalizeSpaces(numberFormatter.format(value)),
    formatDate: (value) => (value ? dateFormatter.format(new Date(value)) : "—"),
    formatFileSize,
  };
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
