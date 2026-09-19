import type { Translator } from "@/i18n/translator";

export function mapSignupError(message: string, t: Translator): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("user already registered")) {
    return t("auth.errors.userAlreadyRegistered");
  }

  if (normalized.includes("rate limit")) {
    return t("auth.errors.rateLimited");
  }

  if (normalized.includes("email address not authorized")) {
    return t("auth.errors.emailNotAuthorized");
  }

  if (normalized.includes("email address") && normalized.includes("invalid")) {
    return t("auth.errors.invalidEmail");
  }

  return t("auth.errors.signupFailed");
}
