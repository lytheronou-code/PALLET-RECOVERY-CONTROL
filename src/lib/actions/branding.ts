"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireMembership } from "@/lib/data/organization";
import { getT } from "@/i18n/server";
import { isValidHexColor } from "@/lib/branding/color";
import {
  buildBrandingLogoPath,
  matchesLogoFileSignature,
  readLogoFileHeader,
  validateLogoFile,
} from "@/lib/branding/logo";
import type { FormState } from "@/lib/actions/form-state";

// undefined (not null): see the identical note in organization-settings.ts
// -- the generated RPC Args type marks each optional column as `p_x?:
// string` (SQL DEFAULT NULL), so omitting the key is how a caller asks
// for "leave/clear this field", not passing an explicit null.
function stringOrUndefined(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export async function updateBrandingAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const membership = await requireMembership();
  const { t } = await getT(membership.organizationId);

  if (membership.role !== "admin") {
    return { error: t("common.errors.forbidden") };
  }

  const primaryColor = stringOrUndefined(formData.get("primaryColor"));
  if (primaryColor && !isValidHexColor(primaryColor)) {
    return { error: t("common.validation.invalidHexColor") };
  }
  const secondaryColor = stringOrUndefined(formData.get("secondaryColor"));
  if (secondaryColor && !isValidHexColor(secondaryColor)) {
    return { error: t("common.validation.invalidHexColor") };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("organization_branding")
    .select("logo_path, compact_logo_path")
    .eq("organization_id", membership.organizationId)
    .maybeSingle();

  // admin_update_organization_branding assigns every column directly
  // (it's a single-row-per-org upsert, not a per-tab split like the
  // organization settings RPCs), so this form must always pass through
  // the logo paths it doesn't itself own -- omitting them would fall back
  // to the RPC's own DEFAULT NULL and silently clear whatever was
  // uploaded via uploadBrandingLogoAction.
  const { error } = await supabase.rpc("admin_update_organization_branding", {
    p_organization_id: membership.organizationId,
    p_portal_name: stringOrUndefined(formData.get("portalName")),
    p_logo_path: existing?.logo_path ?? undefined,
    p_compact_logo_path: existing?.compact_logo_path ?? undefined,
    p_primary_color: primaryColor,
    p_secondary_color: secondaryColor,
    p_support_email: stringOrUndefined(formData.get("supportEmail")),
    p_support_phone: stringOrUndefined(formData.get("supportPhone")),
    p_website: stringOrUndefined(formData.get("website")),
    p_welcome_message_it: stringOrUndefined(formData.get("welcomeMessageIt")),
    p_welcome_message_en: stringOrUndefined(formData.get("welcomeMessageEn")),
  });

  if (error) {
    return { error: t("common.errors.generic") };
  }

  revalidatePath("/settings");
  return { message: t("common.actions.save") };
}

export async function uploadBrandingLogoAction(
  kind: "logo" | "compact_logo",
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const membership = await requireMembership();
  const { t } = await getT(membership.organizationId);

  if (membership.role !== "admin") {
    return { error: t("common.errors.forbidden") };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: t("common.validation.required") };
  }

  const validation = validateLogoFile({ type: file.type, size: file.size, name: file.name });
  if (!validation.valid) {
    return { error: t("common.errors.generic") };
  }

  const header = await readLogoFileHeader(file);
  if (!matchesLogoFileSignature(header, file.type)) {
    return { error: t("common.errors.generic") };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("organization_branding")
    .select("*")
    .eq("organization_id", membership.organizationId)
    .maybeSingle();

  const storagePath = buildBrandingLogoPath({ organizationId: membership.organizationId, filename: file.name });

  const { error: uploadError } = await supabase.storage.from("branding-assets").upload(storagePath, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) {
    return { error: t("common.errors.generic") };
  }

  const previousPath = kind === "logo" ? existing?.logo_path : existing?.compact_logo_path;

  // Same reasoning as updateBrandingAction: every field this action
  // doesn't own must be passed through unchanged, since the RPC assigns
  // every column directly rather than merging per-caller.
  const { error: rpcError } = await supabase.rpc("admin_update_organization_branding", {
    p_organization_id: membership.organizationId,
    p_portal_name: existing?.portal_name ?? undefined,
    p_logo_path: kind === "logo" ? storagePath : (existing?.logo_path ?? undefined),
    p_compact_logo_path: kind === "compact_logo" ? storagePath : (existing?.compact_logo_path ?? undefined),
    p_primary_color: existing?.primary_color ?? undefined,
    p_secondary_color: existing?.secondary_color ?? undefined,
    p_support_email: existing?.support_email ?? undefined,
    p_support_phone: existing?.support_phone ?? undefined,
    p_website: existing?.website ?? undefined,
    p_welcome_message_it: existing?.welcome_message_it ?? undefined,
    p_welcome_message_en: existing?.welcome_message_en ?? undefined,
  });

  if (rpcError) {
    await supabase.storage.from("branding-assets").remove([storagePath]);
    return { error: t("common.errors.generic") };
  }

  // Best-effort cleanup of the replaced logo; a leftover orphan here is
  // harmless (unreachable -- the SELECT storage policy only authorizes a
  // path organization_branding currently points to) so a failure is not
  // surfaced as an error to the admin who just successfully replaced it.
  if (previousPath && previousPath !== storagePath) {
    await supabase.storage.from("branding-assets").remove([previousPath]);
  }

  revalidatePath("/settings");
  revalidatePath("/portal");
  return { message: t("common.actions.save") };
}
