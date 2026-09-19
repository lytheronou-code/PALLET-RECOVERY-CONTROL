import { z } from "zod";
import { MOVEMENT_FIELDS } from "@/lib/csv/movement-import";
import { VOUCHER_FIELDS } from "@/lib/csv/voucher-import";
import type { Translator } from "@/i18n/translator";

export const MAX_IMPORT_ROWS = 5000;

export function buildMovementImportPayloadSchema(t: Translator) {
  return z.object({
    filename: z.string().trim().min(1).max(255),
    headers: z.array(z.string()).min(1),
    rows: z.array(z.array(z.string())).max(MAX_IMPORT_ROWS, t("bulkImport.validation.tooManyRows", { max: MAX_IMPORT_ROWS })),
    mapping: z.record(z.enum(MOVEMENT_FIELDS), z.string()),
  });
}

export function buildVoucherImportPayloadSchema(t: Translator) {
  return z.object({
    filename: z.string().trim().min(1).max(255),
    headers: z.array(z.string()).min(1),
    rows: z.array(z.array(z.string())).max(MAX_IMPORT_ROWS, t("bulkImport.validation.tooManyRows", { max: MAX_IMPORT_ROWS })),
    mapping: z.record(z.enum(VOUCHER_FIELDS), z.string()),
  });
}
