import { z } from "zod";

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

export const uploadDocumentSchema = z.object({
  documentType: z.enum(DOCUMENT_TYPES),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});
