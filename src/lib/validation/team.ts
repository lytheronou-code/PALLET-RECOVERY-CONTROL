import { z } from "zod";
import type { Translator } from "@/i18n/translator";

// Mirrors the DB CHECK constraint (organization_members_role_check) --
// keep in sync, verified live before this file was written.
export const ORGANIZATION_ROLES = ["admin", "operator", "viewer"] as const;
export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export function buildAddMemberSchema(t: Translator) {
  return z.object({
    email: z.string().trim().email(t("common.validation.invalidEmail")),
    role: z.enum(ORGANIZATION_ROLES, t("settings.team.errors.unsupportedRole")),
  });
}
