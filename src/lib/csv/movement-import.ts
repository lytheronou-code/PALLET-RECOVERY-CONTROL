import { resolveSite, type SiteLookup } from "@/lib/csv/site-lookup";

export const MOVEMENT_FIELDS = [
  "movementDate",
  "counterparty",
  "palletType",
  "site",
  "direction",
  "quantity",
  "documentType",
  "documentNumber",
  "voucherNumber",
  "notes",
] as const;

export type MovementField = (typeof MOVEMENT_FIELDS)[number];

export const REQUIRED_MOVEMENT_FIELDS: MovementField[] = [
  "movementDate",
  "counterparty",
  "palletType",
  "direction",
  "quantity",
];

export const MOVEMENT_FIELD_LABELS: Record<MovementField, string> = {
  movementDate: "Data movimento",
  counterparty: "Controparte",
  palletType: "Tipo pallet",
  site: "Sito (opzionale)",
  direction: "Direzione (IN/OUT)",
  quantity: "Quantità",
  documentType: "Tipo documento",
  documentNumber: "Numero documento",
  voucherNumber: "Numero buono",
  notes: "Note",
};

export type ColumnMapping = Partial<Record<MovementField, string>>;

export type MovementLookups = {
  counterpartyIdByKey: Map<string, string>;
  palletTypeIdByKey: Map<string, string>;
  siteLookup: SiteLookup;
};

export type ValidatedMovement = {
  movement_date: string;
  counterparty_id: string;
  pallet_type_id: string;
  site_id: string | null;
  direction: "inbound" | "outbound";
  quantity: number;
  document_type: string | null;
  document_number: string | null;
  voucher_number: string | null;
  notes: string | null;
};

export type RowValidationResult =
  | { rowNumber: number; valid: true; movement: ValidatedMovement }
  | { rowNumber: number; valid: false; errors: string[] };

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

export function buildLookupKey(value: string): string {
  return normalizeKey(value);
}

const DIRECTION_ALIASES: Record<string, "inbound" | "outbound"> = {
  in: "inbound",
  inbound: "inbound",
  entrata: "inbound",
  ricevuto: "inbound",
  out: "outbound",
  outbound: "outbound",
  uscita: "outbound",
  consegnato: "outbound",
};

export function normalizeDirection(raw: string): "inbound" | "outbound" | null {
  return DIRECTION_ALIASES[normalizeKey(raw)] ?? null;
}

const DATE_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_EU = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/;

export function normalizeDate(raw: string): string | null {
  const trimmed = raw.trim();

  const isoMatch = DATE_ISO.exec(trimmed);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return isValidCalendarDate(Number(year), Number(month), Number(day))
      ? `${year}-${month}-${day}`
      : null;
  }

  const euMatch = DATE_EU.exec(trimmed);
  if (euMatch) {
    const [, day, month, year] = euMatch;
    const dd = day.padStart(2, "0");
    const mm = month.padStart(2, "0");
    return isValidCalendarDate(Number(year), Number(mm), Number(dd))
      ? `${year}-${mm}-${dd}`
      : null;
  }

  return null;
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function getField(headers: string[], row: string[], mapping: ColumnMapping, field: MovementField): string {
  const header = mapping[field];
  if (!header) return "";
  const index = headers.indexOf(header);
  if (index === -1) return "";
  return (row[index] ?? "").trim();
}

export function validateMovementRow(
  headers: string[],
  row: string[],
  mapping: ColumnMapping,
  lookups: MovementLookups,
  rowNumber: number,
): RowValidationResult {
  const errors: string[] = [];

  const rawDate = getField(headers, row, mapping, "movementDate");
  const rawCounterparty = getField(headers, row, mapping, "counterparty");
  const rawPalletType = getField(headers, row, mapping, "palletType");
  const rawSite = getField(headers, row, mapping, "site");
  const rawDirection = getField(headers, row, mapping, "direction");
  const rawQuantity = getField(headers, row, mapping, "quantity");
  const documentType = getField(headers, row, mapping, "documentType") || null;
  const documentNumber = getField(headers, row, mapping, "documentNumber") || null;
  const voucherNumber = getField(headers, row, mapping, "voucherNumber") || null;
  const notes = getField(headers, row, mapping, "notes") || null;

  const movementDate = rawDate ? normalizeDate(rawDate) : null;
  if (!rawDate) errors.push("Data movimento mancante");
  else if (!movementDate) errors.push(`Data movimento non valida: "${rawDate}"`);

  if (!rawCounterparty) errors.push("Controparte mancante");
  const counterpartyId = rawCounterparty
    ? lookups.counterpartyIdByKey.get(buildLookupKey(rawCounterparty))
    : undefined;
  if (rawCounterparty && !counterpartyId) errors.push(`Controparte non trovata: "${rawCounterparty}"`);

  if (!rawPalletType) errors.push("Tipo pallet mancante");
  const palletTypeId = rawPalletType
    ? lookups.palletTypeIdByKey.get(buildLookupKey(rawPalletType))
    : undefined;
  if (rawPalletType && !palletTypeId) errors.push(`Tipo pallet non trovato: "${rawPalletType}"`);

  let siteId: string | null = null;
  const siteResolution = resolveSite(counterpartyId, rawSite, lookups.siteLookup);
  if (siteResolution.status === "resolved") siteId = siteResolution.siteId;
  else if (siteResolution.status === "error" && counterpartyId) errors.push(siteResolution.message);

  const direction = rawDirection ? normalizeDirection(rawDirection) : null;
  if (!rawDirection) errors.push("Direzione mancante");
  else if (!direction) errors.push(`Direzione non riconosciuta: "${rawDirection}" (usa IN/OUT)`);

  let quantity: number | null = null;
  if (!rawQuantity) {
    errors.push("Quantità mancante");
  } else {
    const parsedQuantity = Number(rawQuantity.replace(",", "."));
    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      errors.push(`Quantità non valida: "${rawQuantity}" (deve essere un intero positivo)`);
    } else {
      quantity = parsedQuantity;
    }
  }

  if (errors.length > 0) {
    return { rowNumber, valid: false, errors };
  }

  return {
    rowNumber,
    valid: true,
    movement: {
      movement_date: movementDate!,
      counterparty_id: counterpartyId!,
      pallet_type_id: palletTypeId!,
      site_id: siteId,
      direction: direction!,
      quantity: quantity!,
      document_type: documentType,
      document_number: documentNumber,
      voucher_number: voucherNumber,
      notes,
    },
  };
}

export function validateMovementRows(
  headers: string[],
  rows: string[][],
  mapping: ColumnMapping,
  lookups: MovementLookups,
): RowValidationResult[] {
  return rows.map((row, index) => validateMovementRow(headers, row, mapping, lookups, index + 1));
}

export function missingRequiredMappings(mapping: ColumnMapping): MovementField[] {
  return REQUIRED_MOVEMENT_FIELDS.filter((field) => !mapping[field]);
}
