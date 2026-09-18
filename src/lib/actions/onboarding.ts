"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { onboardingSchema } from "@/lib/validation/auth";
import type { FormState } from "@/lib/actions/form-state";

export async function createOrganizationAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = onboardingSchema.safeParse({
    organizationName: formData.get("organizationName"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
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
    return { error: "Impossibile creare l'organizzazione. Riprova." };
  }

  redirect("/dashboard");
}
