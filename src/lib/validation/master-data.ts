import { z } from "zod";
import { isSupportedCountry } from "@/lib/countries";
import type { Translator } from "@/i18n/translator";

export const COUNTERPARTY_TYPES = [
  "customer",
  "debtor",
  "retailer",
  "carrier",
  "supplier",
  "other",
] as const;

// Schemas are built per-request from the resolved translator (same
// pattern as src/lib/validation/auth.ts) so validation messages, which
// land directly in front of the user via formState.error, follow the
// same locale hierarchy as everything else instead of being hardcoded.
export function buildCounterpartySchema(t: Translator) {
  return z.object({
    legalName: z.string().trim().min(1, t("counterparties.validation.legalNameRequired")).max(200),
    tradingName: z.string().trim().max(200).optional().or(z.literal("")),
    code: z.string().trim().max(50).optional().or(z.literal("")),
    vatNumber: z.string().trim().max(30).optional().or(z.literal("")),
    taxId: z.string().trim().max(50).optional().or(z.literal("")),
    registrationNumber: z.string().trim().max(50).optional().or(z.literal("")),
    counterpartyType: z.enum(COUNTERPARTY_TYPES),
    addressLine: z.string().trim().max(200).optional().or(z.literal("")),
    addressLine2: z.string().trim().max(200).optional().or(z.literal("")),
    postalCode: z.string().trim().max(20).optional().or(z.literal("")),
    city: z.string().trim().max(100).optional().or(z.literal("")),
    province: z.string().trim().max(50).optional().or(z.literal("")),
    countryCode: z
      .string()
      .trim()
      .length(2, t("common.validation.invalidCountry"))
      .toUpperCase()
      .default("IT")
      .refine(isSupportedCountry, t("common.validation.invalidCountry")),
    email: z.string().trim().email(t("common.validation.invalidEmail")).optional().or(z.literal("")),
    phone: z.string().trim().max(30).optional().or(z.literal("")),
  });
}

export function buildPalletTypeSchema(t: Translator) {
  return z.object({
    code: z.string().trim().min(1, t("palletTypes.validation.codeRequired")).max(50),
    description: z.string().trim().min(1, t("palletTypes.validation.descriptionRequired")).max(200),
    unitValue: z.coerce.number().min(0, t("common.validation.cannotBeNegative")),
  });
}

export function buildSiteSchema(t: Translator) {
  return z.object({
    name: z.string().trim().min(1, t("sites.validation.nameRequired")).max(200),
    code: z.string().trim().max(50).optional().or(z.literal("")),
    counterpartyId: z.string().trim().uuid().optional().or(z.literal("")),
    addressLine: z.string().trim().max(200).optional().or(z.literal("")),
    addressLine2: z.string().trim().max(200).optional().or(z.literal("")),
    postalCode: z.string().trim().max(20).optional().or(z.literal("")),
    city: z.string().trim().max(100).optional().or(z.literal("")),
    province: z.string().trim().max(50).optional().or(z.literal("")),
    countryCode: z
      .string()
      .trim()
      .length(2, t("common.validation.invalidCountry"))
      .toUpperCase()
      .default("IT")
      .refine(isSupportedCountry, t("common.validation.invalidCountry")),
  });
}
