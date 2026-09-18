import { z } from "zod";

const voucherDatesShape = {
  voucherNumber: z.string().trim().min(1, "Numero buono obbligatorio").max(100),
  issueDate: z.string().min(1, "Data emissione obbligatoria"),
  recoveryDueDate: z.string().optional().or(z.literal("")),
  quantity: z.coerce.number().int().positive("La quantità deve essere un intero positivo"),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
};

function withDateRule<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  return schema.refine(
    (data) => {
      const typed = data as { issueDate?: string; recoveryDueDate?: string };
      return !typed.recoveryDueDate || !typed.issueDate || typed.recoveryDueDate >= typed.issueDate;
    },
    { message: "La scadenza non può precedere la data di emissione", path: ["recoveryDueDate"] },
  );
}

export const voucherSchema = withDateRule(
  z.object({
    counterpartyId: z.string().uuid("Seleziona una controparte"),
    palletTypeId: z.string().uuid("Seleziona un tipo pallet"),
    ...voucherDatesShape,
  }),
);

export const voucherEditSchema = withDateRule(z.object(voucherDatesShape));
