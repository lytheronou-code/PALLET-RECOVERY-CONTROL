"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { buildLoginSchema, buildSignupSchema } from "@/lib/validation/auth";
import { mapSignupError } from "@/lib/auth/signup-error";
import type { FormState } from "@/lib/actions/form-state";
import { getT } from "@/i18n/server";

function sanitizeNextPath(next: FormDataEntryValue | null): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) {
    return "/dashboard";
  }
  return next;
}

export async function signInAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { t } = await getT();
  const parsed = buildLoginSchema(t).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("common.errors.generic") };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: t("auth.errors.invalidCredentials") };
  }

  redirect(sanitizeNextPath(formData.get("next")));
}

export async function signUpAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { t } = await getT();
  const parsed = buildSignupSchema(t).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("common.errors.generic") };
  }

  const originHeader = (await headers()).get("origin");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: originHeader ? `${originHeader}/auth/confirm` : undefined,
    },
  });

  if (error) {
    return { error: mapSignupError(error.message, t) };
  }

  if (data.session) {
    redirect("/onboarding");
  }

  return { message: t("auth.signup.confirmationSent") };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
