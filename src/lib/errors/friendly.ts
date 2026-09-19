import type { Translator, TranslationKey } from "@/i18n/translator";

// Maps a raw Postgres/PostgREST error to a translated, non-technical
// message -- callers must never surface error.message or error.code
// directly to a user (self-service principle: "23505 unique violation"
// means nothing to a customer signing themselves up, and an RLS error
// message can leak schema/policy details).
export function mapDatabaseError(error: { code?: string; message?: string } | null | undefined, t: Translator): string {
  if (!error) return t("common.errors.generic");

  if (error.code === "23505") {
    return t("common.errors.duplicate");
  }

  const message = (error.message ?? "").toLowerCase();
  if (message.includes("row-level security") || message.includes("permission denied")) {
    return t("common.errors.forbidden");
  }

  return t("common.errors.generic");
}

/**
 * Same "never expose a raw Postgres/RPC message" principle as
 * mapDatabaseError above, for Server Actions that call a
 * SECURITY DEFINER RPC raising a specific, known set of plpgsql
 * exceptions (`raise exception '...'`) that need distinct friendly
 * messages rather than one generic fallback. `rules` is checked in
 * order, matching on a case-sensitive substring of the raw exception
 * text (which is itself a fixed, lowercase, developer-authored string in
 * the migration SQL, not user input) -- the caller never sees that raw
 * text, only the translated message for the first rule that matches.
 */
export function mapKeyedError(
  message: string | null | undefined,
  rules: ReadonlyArray<readonly [needle: string, key: TranslationKey]>,
  fallback: TranslationKey,
  t: Translator,
): string {
  const text = message ?? "";
  for (const [needle, key] of rules) {
    if (text.includes(needle)) return t(key);
  }
  return t(fallback);
}
