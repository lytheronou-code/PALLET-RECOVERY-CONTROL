"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildOnboardingSchema } from "@/lib/validation/auth";
import type { FormState } from "@/lib/actions/form-state";
import { getT } from "@/i18n/server";

export async function createOrganizationAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { t } = await getT();
  const parsed = buildOnboardingSchema(t).safeParse({
    organizationName: formData.get("organizationName"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("common.errors.generic") };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.rpc("bootstrap_organization", {
    p_name: parsed.data.organizationName,
  });

  if (error) {
    return { error: t("onboarding.errors.createFailed") };
  }

  redirect("/dashboard");
}
