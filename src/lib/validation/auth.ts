import { z } from "zod";
import type { Translator } from "@/i18n/translator";

// Schemas are built per-request from the resolved translator rather than
// module-level constants so validation messages -- which land directly in
// front of the user via formState.error -- follow the same locale
// hierarchy as everything else, instead of being hardcoded in one language.
export function buildLoginSchema(t: Translator) {
  return z.object({
    email: z.string().trim().min(1, t("auth.validation.emailRequired")).email(t("auth.errors.invalidEmail")),
    password: z.string().min(1, t("auth.validation.passwordRequired")),
  });
}

export function buildSignupSchema(t: Translator) {
  return z.object({
    email: z.string().trim().min(1, t("auth.validation.emailRequired")).email(t("auth.errors.invalidEmail")),
    password: z.string().min(8, t("auth.validation.passwordTooShort", { min: 8 })),
  });
}

export function buildOnboardingSchema(t: Translator) {
  return z.object({
    organizationName: z
      .string()
      .trim()
      .min(2, t("onboarding.validation.organizationNameTooShort", { min: 2 }))
      .max(200, t("onboarding.validation.organizationNameTooLong")),
  });
}
