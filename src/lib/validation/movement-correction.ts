import { z } from "zod";

export const correctMovementSchema = z.object({
  reason: z.string().trim().min(3, "Spiega il motivo della correzione (minimo 3 caratteri)").max(500),
  reversalOnly: z.coerce.boolean().default(false),
  movementDate: z.string().optional(),
  quantity: z.coerce.number().int().positive("La quantità deve essere un intero positivo").optional(),
  direction: z.enum(["inbound", "outbound"]).optional(),
  documentType: z.string().trim().max(50).optional().or(z.literal("")),
  documentNumber: z.string().trim().max(100).optional().or(z.literal("")),
});
