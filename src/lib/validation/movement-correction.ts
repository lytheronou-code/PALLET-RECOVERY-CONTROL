import { z } from "zod";
import type { Translator } from "@/i18n/translator";

export function buildCorrectMovementSchema(t: Translator) {
  return z.object({
    reason: z.string().trim().min(3, t("movements.validation.reasonTooShort")).max(500),
    reversalOnly: z.coerce.boolean().default(false),
    movementDate: z.string().optional(),
    quantity: z.coerce.number().int().positive(t("common.validation.mustBePositive")).optional(),
    direction: z.enum(["inbound", "outbound"]).optional(),
    documentType: z.string().trim().max(50).optional().or(z.literal("")),
    documentNumber: z.string().trim().max(100).optional().or(z.literal("")),
  });
}
