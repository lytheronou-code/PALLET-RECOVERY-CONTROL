import type { RECOVERY_EVENT_TYPES } from "@/lib/validation/recovery-case";
import type { TranslationKey } from "@/i18n/translator";

// Maps the stored event_type enum value to a translation key -- never a
// translated string directly, so the DB value stays English and only the
// display label changes with locale (same pattern as status-badge.tsx).
export const EVENT_LABEL_KEYS: Record<(typeof RECOVERY_EVENT_TYPES)[number] | "created", TranslationKey> = {
  created: "recoveryEvents.types.created",
  contact_attempt: "recoveryEvents.types.contact_attempt",
  response: "recoveryEvents.types.response",
  scheduled: "recoveryEvents.types.scheduled",
  pickup: "recoveryEvents.types.pickup",
  partial_recovery: "recoveryEvents.types.partial_recovery",
  full_recovery: "recoveryEvents.types.full_recovery",
  dispute: "recoveryEvents.types.dispute",
  note: "recoveryEvents.types.note",
  closed: "recoveryEvents.types.closed",
};
