import type { Translator } from "@/i18n/translator";

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
