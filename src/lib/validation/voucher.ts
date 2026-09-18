import { z } from "zod";

export const voucherSchema = z
  .object({
    counterpartyId: z.string().uuid("Seleziona una controparte"),
    palletTypeId: z.string().uuid("Seleziona un tipo pallet"),
    voucherNumber: z.string().trim().min(1, "Numero buono obbligatorio").max(100),
    issueDate: z.string().min(1, "Data emissione obbligatoria"),
    recoveryDueDate: z.string().optional().or(z.literal("")),
    quantity: z.coerce.number().int().positive("La quantità deve essere un intero positivo"),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
  })
  .refine(
    (data) => !data.recoveryDueDate || data.recoveryDueDate >= data.issueDate,
    { message: "La scadenza non può precedere la data di emissione", path: ["recoveryDueDate"] },
  );
