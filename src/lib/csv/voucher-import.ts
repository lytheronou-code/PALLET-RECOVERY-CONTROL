import { buildLookupKey, normalizeDate } from "@/lib/csv/movement-import";
import { resolveSite, type SiteLookup } from "@/lib/csv/site-lookup";

export const VOUCHER_FIELDS = [
  "voucherNumber",
  "counterparty",
  "palletType",
  "site",
  "issueDate",
  "recoveryDueDate",
  "quantity",
  "notes",
] as const;

export type VoucherField = (typeof VOUCHER_FIELDS)[number];

export const REQUIRED_VOUCHER_FIELDS: VoucherField[] = [
  "voucherNumber",
  "counterparty",
  "palletType",
  "issueDate",
  "quantity",
];

export const VOUCHER_FIELD_LABELS: Record<VoucherField, string> = {
  voucherNumber: "Numero buono",
  counterparty: "Controparte",
  palletType: "Tipo pallet",
  site: "Sito (opzionale)",
  issueDate: "Data emissione",
  recoveryDueDate: "Scadenza recupero",
  quantity: "Quantità",
  notes: "Note",
};

export type VoucherColumnMapping = Partial<Record<VoucherField, string>>;

export type VoucherLookups = {
  counterpartyIdByKey: Map<string, string>;
  palletTypeIdByKey: Map<string, string>;
  existingVoucherNumbers: Set<string>;
  siteLookup: SiteLookup;
};

export type ValidatedVoucher = {
  voucher_number: string;
  counterparty_id: string;
  pallet_type_id: string;
  site_id: string | null;
  issue_date: string;
  recovery_due_date: string | null;
  quantity: number;
  notes: string | null;
};

export type VoucherRowValidationResult =
  | { rowNumber: number; valid: true; voucher: ValidatedVoucher }
  | { rowNumber: number; valid: false; errors: string[] };

function getField(
  headers: string[],
  row: string[],
  mapping: VoucherColumnMapping,
  field: VoucherField,
): string {
  const header = mapping[field];
  if (!header) return "";
  const index = headers.indexOf(header);
  if (index === -1) return "";
  return (row[index] ?? "").trim();
}

export function validateVoucherRows(
  headers: string[],
  rows: string[][],
  mapping: VoucherColumnMapping,
  lookups: VoucherLookups,
): VoucherRowValidationResult[] {
  const seenInFile = new Set<string>();

  return rows.map((row, index) => {
    const rowNumber = index + 1;
    const errors: string[] = [];

    const rawVoucherNumber = getField(headers, row, mapping, "voucherNumber");
    const rawCounterparty = getField(headers, row, mapping, "counterparty");
    const rawPalletType = getField(headers, row, mapping, "palletType");
    const rawIssueDate = getField(headers, row, mapping, "issueDate");
    const rawRecoveryDueDate = getField(headers, row, mapping, "recoveryDueDate");
    const rawQuantity = getField(headers, row, mapping, "quantity");
    const notes = getField(headers, row, mapping, "notes") || null;

    if (!rawVoucherNumber) {
      errors.push("Numero buono mancante");
    } else {
      const key = buildLookupKey(rawVoucherNumber);
      if (lookups.existingVoucherNumbers.has(key)) {
        errors.push(`Numero buono già esistente: "${rawVoucherNumber}"`);
      } else if (seenInFile.has(key)) {
        errors.push(`Numero buono duplicato nel file: "${rawVoucherNumber}"`);
      } else {
        seenInFile.add(key);
      }
    }

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

    const rawSite = getField(headers, row, mapping, "site");
    let siteId: string | null = null;
    const siteResolution = resolveSite(counterpartyId, rawSite, lookups.siteLookup);
    if (siteResolution.status === "resolved") siteId = siteResolution.siteId;
    else if (siteResolution.status === "error" && counterpartyId) errors.push(siteResolution.message);

    const issueDate = rawIssueDate ? normalizeDate(rawIssueDate) : null;
    if (!rawIssueDate) errors.push("Data emissione mancante");
    else if (!issueDate) errors.push(`Data emissione non valida: "${rawIssueDate}"`);

    let recoveryDueDate: string | null = null;
    if (rawRecoveryDueDate) {
      recoveryDueDate = normalizeDate(rawRecoveryDueDate);
      if (!recoveryDueDate) errors.push(`Scadenza recupero non valida: "${rawRecoveryDueDate}"`);
      else if (issueDate && recoveryDueDate < issueDate) {
        errors.push("La scadenza non può precedere la data di emissione");
      }
    }

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
      voucher: {
        voucher_number: rawVoucherNumber,
        counterparty_id: counterpartyId!,
        pallet_type_id: palletTypeId!,
        site_id: siteId,
        issue_date: issueDate!,
        recovery_due_date: recoveryDueDate,
        quantity: quantity!,
        notes,
      },
    };
  });
}

export function missingRequiredVoucherMappings(mapping: VoucherColumnMapping): VoucherField[] {
  return REQUIRED_VOUCHER_FIELDS.filter((field) => !mapping[field]);
}
