const currencyFormatter = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
  useGrouping: true,
});

const numberFormatter = new Intl.NumberFormat("it-IT", { useGrouping: true });

const dateFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

// Some ICU builds render the currency/number gap as a non-breaking or
// narrow-no-break space; normalize to a regular space for predictable
// rendering and copy/paste behavior.
function normalizeSpaces(value: string): string {
  return value.replace(/[  ]/g, " ");
}

export function formatCurrency(value: number): string {
  return normalizeSpaces(currencyFormatter.format(value));
}

export function formatNumber(value: number): string {
  return normalizeSpaces(numberFormatter.format(value));
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return dateFormatter.format(new Date(value));
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
