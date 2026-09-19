import { z } from "zod";
import type { Translator } from "@/i18n/translator";

export const PRIORITIES = ["low", "normal", "high", "critical"] as const;

export function buildCreateRecoveryCaseSchema(t: Translator) {
  return z.object({
    counterpartyId: z.string().uuid(t("recoveryCases.validation.selectCounterparty")),
    palletTypeId: z.string().uuid(t("recoveryCases.validation.selectPalletType")),
    voucherId: z.string().uuid().optional().or(z.literal("")),
    siteId: z.string().uuid().optional().or(z.literal("")),
    quantityClaimed: z.coerce.number().int().positive(t("common.validation.mustBePositive")),
    dueDate: z.string().optional().or(z.literal("")),
    priority: z.enum(PRIORITIES),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
  });
}

export const RECOVERY_EVENT_TYPES = [
  "contact_attempt",
  "response",
  "scheduled",
  "pickup",
  "partial_recovery",
  "full_recovery",
  "dispute",
  "note",
  "closed",
] as const;

export function buildAddRecoveryEventSchema(t: Translator) {
  return z.object({
    eventType: z.enum(RECOVERY_EVENT_TYPES),
    quantity: z.coerce.number().int().positive(t("common.validation.mustBePositive")).optional(),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
  });
}
