"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isLocale } from "@/i18n/locale";
import { LOCALE_COOKIE } from "@/i18n/resolve";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function sanitizeRevalidatePath(path: FormDataEntryValue | null): string {
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")) {
    return "/";
  }
  return path;
}

// Signed-in users persist their choice to profiles.preferred_locale (their
// own row, already writable under self_update_profile) so it follows them
// across devices and survives the cookie being cleared. Signed-out visitors
// have no profile row to write, so the cookie is authoritative for them --
// resolveLocale() only reads it as a fallback once a user is signed in and
// has set an explicit preference, so this never fights that write.
export async function setLocaleAction(formData: FormData): Promise<void> {
  const locale = formData.get("locale");
  if (typeof locale !== "string" || !isLocale(locale)) {
    return;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase.from("profiles").update({ preferred_locale: locale }).eq("id", user.id);
  }

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
  });

  revalidatePath(sanitizeRevalidatePath(formData.get("path")));
}
