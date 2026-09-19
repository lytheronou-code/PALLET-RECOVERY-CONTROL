import { z } from "zod";
import type { Translator } from "@/i18n/translator";
import type { TranslationKey } from "@/i18n/translator";

export const DOCUMENT_TYPES = [
  "ddt",
  "voucher",
  "voucher_scan",
  "pickup_proof",
  "delivery_proof",
  "pallet_photo",
  "dispute_evidence",
  "settlement_document",
  "other",
] as const;

// Legacy hardcoded-Italian labels -- kept only so existing call sites
// don't break mid-refactor. Prefer documentTypeLabel(t, type) below for
// any new/updated call site; this export will be removed once every
// caller has migrated.
export const DOCUMENT_TYPE_LABELS: Record<(typeof DOCUMENT_TYPES)[number], string> = {
  ddt: "DDT",
  voucher: "Buono",
  voucher_scan: "Scansione buono",
  pickup_proof: "Prova di ritiro",
  delivery_proof: "Prova di consegna",
  pallet_photo: "Foto pallet",
  dispute_evidence: "Prova di contestazione",
  settlement_document: "Documento di liquidazione",
  other: "Altro",
};

// DB enum value -> translation-key dictionary (never an if/else per
// locale, never a translated value written back to storage). Call
// documentTypeLabel(t, type) at render time rather than reading this map
// directly.
export const DOCUMENT_TYPE_LABEL_KEYS = {
  ddt: "documents.types.ddt",
  voucher: "documents.types.voucher",
  voucher_scan: "documents.types.voucherScan",
  pickup_proof: "documents.types.pickupProof",
  delivery_proof: "documents.types.deliveryProof",
  pallet_photo: "documents.types.palletPhoto",
  dispute_evidence: "documents.types.disputeEvidence",
  settlement_document: "documents.types.settlementDocument",
  other: "documents.types.other",
} as const satisfies Record<(typeof DOCUMENT_TYPES)[number], TranslationKey>;

export function documentTypeLabel(t: Translator, type: string): string {
  const key = DOCUMENT_TYPE_LABEL_KEYS[type as keyof typeof DOCUMENT_TYPE_LABEL_KEYS];
  return key ? t(key) : type;
}

export function buildUploadDocumentSchema(t: Translator) {
  return z.object({
    documentType: z.enum(DOCUMENT_TYPES, t("documents.validation.typeRequired")),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
  });
}
