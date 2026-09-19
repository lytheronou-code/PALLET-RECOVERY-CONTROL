import { buildLookupKey, normalizeDate } from "@/lib/csv/movement-import";
import { resolveSite, type SiteLookup } from "@/lib/csv/site-lookup";
import type { Translator } from "@/i18n/translator";

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
  t: Translator,
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
      errors.push(t("bulkImport.rowErrors.voucherNumberMissing"));
    } else {
      const key = buildLookupKey(rawVoucherNumber);
      if (lookups.existingVoucherNumbers.has(key)) {
        errors.push(t("bulkImport.rowErrors.voucherNumberAlreadyExists", { value: rawVoucherNumber }));
      } else if (seenInFile.has(key)) {
        errors.push(t("bulkImport.rowErrors.voucherNumberDuplicateInFile", { value: rawVoucherNumber }));
      } else {
        seenInFile.add(key);
      }
    }

    if (!rawCounterparty) errors.push(t("bulkImport.rowErrors.counterpartyMissing"));
    const counterpartyId = rawCounterparty
      ? lookups.counterpartyIdByKey.get(buildLookupKey(rawCounterparty))
      : undefined;
    if (rawCounterparty && !counterpartyId) errors.push(t("bulkImport.rowErrors.counterpartyNotFound", { value: rawCounterparty }));

    if (!rawPalletType) errors.push(t("bulkImport.rowErrors.palletTypeMissing"));
    const palletTypeId = rawPalletType
      ? lookups.palletTypeIdByKey.get(buildLookupKey(rawPalletType))
      : undefined;
    if (rawPalletType && !palletTypeId) errors.push(t("bulkImport.rowErrors.palletTypeNotFound", { value: rawPalletType }));

    const rawSite = getField(headers, row, mapping, "site");
    let siteId: string | null = null;
    const siteResolution = resolveSite(counterpartyId, rawSite, lookups.siteLookup, t);
    if (siteResolution.status === "resolved") siteId = siteResolution.siteId;
    else if (siteResolution.status === "error" && counterpartyId) errors.push(siteResolution.message);

    const issueDate = rawIssueDate ? normalizeDate(rawIssueDate) : null;
    if (!rawIssueDate) errors.push(t("bulkImport.rowErrors.issueDateMissing"));
    else if (!issueDate) errors.push(t("bulkImport.rowErrors.issueDateInvalid", { value: rawIssueDate }));

    let recoveryDueDate: string | null = null;
    if (rawRecoveryDueDate) {
      recoveryDueDate = normalizeDate(rawRecoveryDueDate);
      if (!recoveryDueDate) errors.push(t("bulkImport.rowErrors.dueDateInvalid", { value: rawRecoveryDueDate }));
      else if (issueDate && recoveryDueDate < issueDate) {
        errors.push(t("bulkImport.rowErrors.dueDateBeforeIssueDate"));
      }
    }

    let quantity: number | null = null;
    if (!rawQuantity) {
      errors.push(t("bulkImport.rowErrors.quantityMissing"));
    } else {
      const parsedQuantity = Number(rawQuantity.replace(",", "."));
      if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
        errors.push(t("bulkImport.rowErrors.quantityInvalid", { value: rawQuantity }));
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
