import { z } from "zod";
import type { Translator } from "@/i18n/translator";

function voucherDatesShape(t: Translator) {
  return {
    voucherNumber: z.string().trim().min(1, t("vouchers.validation.numberRequired")).max(100),
    issueDate: z.string().min(1, t("vouchers.validation.issueDateRequired")),
    recoveryDueDate: z.string().optional().or(z.literal("")),
    quantity: z.coerce.number().int().positive(t("common.validation.mustBePositive")),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
  };
}

function withDateRule<T extends z.ZodRawShape>(schema: z.ZodObject<T>, t: Translator) {
  return schema.refine(
    (data) => {
      const typed = data as { issueDate?: string; recoveryDueDate?: string };
      return !typed.recoveryDueDate || !typed.issueDate || typed.recoveryDueDate >= typed.issueDate;
    },
    { message: t("vouchers.validation.dueDateBeforeIssueDate"), path: ["recoveryDueDate"] },
  );
}

export function buildVoucherSchema(t: Translator) {
  return withDateRule(
    z.object({
      counterpartyId: z.string().uuid(t("recoveryCases.validation.selectCounterparty")),
      palletTypeId: z.string().uuid(t("recoveryCases.validation.selectPalletType")),
      siteId: z.string().uuid().optional().or(z.literal("")),
      ...voucherDatesShape(t),
    }),
    t,
  );
}

export function buildVoucherEditSchema(t: Translator) {
  return withDateRule(z.object(voucherDatesShape(t)), t);
}
