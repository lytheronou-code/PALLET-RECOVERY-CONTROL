import { z } from "zod";
import { MOVEMENT_FIELDS } from "@/lib/csv/movement-import";
import { VOUCHER_FIELDS } from "@/lib/csv/voucher-import";

export const MAX_IMPORT_ROWS = 5000;

export const movementImportPayloadSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  headers: z.array(z.string()).min(1),
  rows: z.array(z.array(z.string())).max(MAX_IMPORT_ROWS, `Massimo ${MAX_IMPORT_ROWS} righe per import`),
  mapping: z.record(z.enum(MOVEMENT_FIELDS), z.string()),
});

export const voucherImportPayloadSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  headers: z.array(z.string()).min(1),
  rows: z.array(z.array(z.string())).max(MAX_IMPORT_ROWS, `Massimo ${MAX_IMPORT_ROWS} righe per import`),
  mapping: z.record(z.enum(VOUCHER_FIELDS), z.string()),
});
