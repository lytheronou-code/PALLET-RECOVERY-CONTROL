"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireMembership } from "@/lib/data/organization";
import { buildAddMemberSchema, type OrganizationRole } from "@/lib/validation/team";
import { mapKeyedError } from "@/lib/errors/friendly";
import { getT } from "@/i18n/server";
import type { TranslationKey } from "@/i18n/translator";
import type { FormState } from "@/lib/actions/form-state";

// Every admin_* RPC below does its own admin-only authorization check
// server-side (SECURITY DEFINER) -- requireMembership() here only
// establishes session/org context to scope the call and revalidate
// against, it is not the security boundary.

export async function addOrganizationMemberAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const membership = await requireMembership();
  const { t } = await getT(membership.organizationId);

  const parsed = buildAddMemberSchema(t).safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("common.errors.generic") };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_add_organization_member", {
    p_organization_id: membership.organizationId,
    p_email: parsed.data.email,
    p_role: parsed.data.role,
  });

  if (error) {
    const rules: ReadonlyArray<readonly [string, TranslationKey]> = [
      ["no account found", "settings.team.errors.noAccountFound"],
      ["already a member", "settings.team.errors.alreadyMember"],
      ["insufficient privileges", "settings.team.errors.adminOnly"],
      ["unsupported role", "settings.team.errors.unsupportedRole"],
    ];
    return { error: mapKeyedError(error.message, rules, "settings.team.errors.addFailed", t) };
  }

  revalidatePath("/settings");
  return { message: t("settings.team.memberAdded") };
}

// Imperative (not FormState-bound) actions, called directly from a row's
// <select>/button the same way setClientPortalMembershipActiveAction is --
// an explicit {error?} result rather than void, since a rejected RPC call
// must never look like a silent success in the UI.

export async function updateOrganizationMemberRoleAction(
  memberId: string,
  role: OrganizationRole,
): Promise<{ error?: string }> {
  const membership = await requireMembership();
  const { t } = await getT(membership.organizationId);
  const supabase = await createClient();

  const { error } = await supabase.rpc("admin_update_organization_member_role", {
    p_organization_id: membership.organizationId,
    p_member_id: memberId,
    p_role: role,
  });

  revalidatePath("/settings");

  if (error) {
    const rules: ReadonlyArray<readonly [string, TranslationKey]> = [
      ["cannot change your own role", "settings.team.errors.cannotChangeOwnRole"],
      ["member not found", "settings.team.errors.memberNotFound"],
      ["insufficient privileges", "settings.team.errors.adminOnly"],
      ["unsupported role", "settings.team.errors.unsupportedRole"],
    ];
    return { error: mapKeyedError(error.message, rules, "settings.team.errors.roleChangeFailed", t) };
  }

  return {};
}

export async function removeOrganizationMemberAction(memberId: string): Promise<{ error?: string }> {
  const membership = await requireMembership();
  const { t } = await getT(membership.organizationId);
  const supabase = await createClient();

  const { error } = await supabase.rpc("admin_remove_organization_member", {
    p_organization_id: membership.organizationId,
    p_member_id: memberId,
  });

  revalidatePath("/settings");

  if (error) {
    const rules: ReadonlyArray<readonly [string, TranslationKey]> = [
      ["cannot remove yourself", "settings.team.errors.cannotRemoveSelf"],
      ["member not found", "settings.team.errors.memberNotFound"],
      ["insufficient privileges", "settings.team.errors.adminOnly"],
    ];
    return { error: mapKeyedError(error.message, rules, "settings.team.errors.removeFailed", t) };
  }

  return {};
}
