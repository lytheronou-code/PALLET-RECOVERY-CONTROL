import { z } from "zod";

export const COUNTERPARTY_TYPES = [
  "customer",
  "debtor",
  "retailer",
  "carrier",
  "supplier",
  "other",
] as const;

export const counterpartySchema = z.object({
  legalName: z.string().trim().min(1, "Ragione sociale obbligatoria").max(200),
  code: z.string().trim().max(50).optional().or(z.literal("")),
  vatNumber: z.string().trim().max(30).optional().or(z.literal("")),
  counterpartyType: z.enum(COUNTERPARTY_TYPES),
  addressLine: z.string().trim().max(200).optional().or(z.literal("")),
  postalCode: z.string().trim().max(20).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  province: z.string().trim().max(50).optional().or(z.literal("")),
  countryCode: z
    .string()
    .trim()
    .length(2, "Usa il codice ISO a 2 lettere (es. IT)")
    .toUpperCase()
    .default("IT"),
  email: z.string().trim().email("Email non valida").optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});

export const palletTypeSchema = z.object({
  code: z.string().trim().min(1, "Codice obbligatorio").max(50),
  description: z.string().trim().min(1, "Descrizione obbligatoria").max(200),
  unitValue: z.coerce.number().min(0, "Il valore non può essere negativo"),
});

export const siteSchema = z.object({
  name: z.string().trim().min(1, "Nome obbligatorio").max(200),
  code: z.string().trim().max(50).optional().or(z.literal("")),
  counterpartyId: z.string().trim().uuid().optional().or(z.literal("")),
  addressLine: z.string().trim().max(200).optional().or(z.literal("")),
  postalCode: z.string().trim().max(20).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  province: z.string().trim().max(50).optional().or(z.literal("")),
  countryCode: z
    .string()
    .trim()
    .length(2, "Usa il codice ISO a 2 lettere (es. IT)")
    .toUpperCase()
    .default("IT"),
});
