import type { Translator, TranslationKey } from "@/i18n/translator";

// No "use client" directive -- every current caller is a Server
// Component, so t is passed straight through as a regular prop (ordinary
// RSC composition, not a client/server serialization boundary).
//
// DB enum values (recovery_cases.status, vouchers.status, priority) stay
// English in storage and API responses; these maps are the single place
// that turns a stored value into a translation-key lookup -- a dictionary
// keyed by the enum value, not an if/else per locale, so adding a locale
// only means adding a dictionary entry under common.status.*.

const STATUS_CLASSES: Record<string, string> = {
  open: "badge-open",
  contacted: "badge-open",
  scheduled: "badge-open",
  partial: "badge-partial",
  recovered: "badge-closed",
  disputed: "badge-disputed",
  closed_unrecovered: "badge-neutral",
  cancelled: "badge-neutral",
};

const STATUS_LABEL_KEYS = {
  open: "common.status.recoveryCase.open",
  contacted: "common.status.recoveryCase.contacted",
  scheduled: "common.status.recoveryCase.scheduled",
  partial: "common.status.recoveryCase.partial",
  recovered: "common.status.recoveryCase.recovered",
  disputed: "common.status.recoveryCase.disputed",
  closed_unrecovered: "common.status.recoveryCase.closed_unrecovered",
  cancelled: "common.status.recoveryCase.cancelled",
} as const satisfies Record<string, TranslationKey>;

export function StatusBadge({ status, t }: { status: string; t: Translator }) {
  const className = STATUS_CLASSES[status] ?? "badge-neutral";
  const key = STATUS_LABEL_KEYS[status as keyof typeof STATUS_LABEL_KEYS];
  const label = key ? t(key) : status;
  return <span className={"badge " + className}>{label}</span>;
}

const VOUCHER_STATUS_CLASSES: Record<string, string> = {
  open: "badge-open",
  partial: "badge-partial",
  closed: "badge-closed",
  disputed: "badge-disputed",
  cancelled: "badge-neutral",
};

const VOUCHER_STATUS_LABEL_KEYS = {
  open: "common.status.voucher.open",
  partial: "common.status.voucher.partial",
  closed: "common.status.voucher.closed",
  disputed: "common.status.voucher.disputed",
  cancelled: "common.status.voucher.cancelled",
} as const satisfies Record<string, TranslationKey>;

export function VoucherStatusBadge({ status, t }: { status: string; t: Translator }) {
  const className = VOUCHER_STATUS_CLASSES[status] ?? "badge-neutral";
  const key = VOUCHER_STATUS_LABEL_KEYS[status as keyof typeof VOUCHER_STATUS_LABEL_KEYS];
  const label = key ? t(key) : status;
  return <span className={"badge " + className}>{label}</span>;
}

const PRIORITY_CLASSES: Record<string, string> = {
  low: "badge-neutral",
  normal: "badge-neutral",
  high: "badge-partial",
  critical: "badge-disputed",
};

const PRIORITY_LABEL_KEYS = {
  low: "common.status.priority.low",
  normal: "common.status.priority.normal",
  high: "common.status.priority.high",
  critical: "common.status.priority.critical",
} as const satisfies Record<string, TranslationKey>;

export function PriorityBadge({ priority, t }: { priority: string; t: Translator }) {
  const className = PRIORITY_CLASSES[priority] ?? "badge-neutral";
  const key = PRIORITY_LABEL_KEYS[priority as keyof typeof PRIORITY_LABEL_KEYS];
  const label = key ? t(key) : priority;
  return <span className={"badge " + className}>{label}</span>;
}
