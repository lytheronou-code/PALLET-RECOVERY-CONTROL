const STATUS_LABELS: Record<string, string> = {
  open: "Aperta",
  contacted: "Contattata",
  scheduled: "Programmata",
  partial: "Parziale",
  recovered: "Recuperata",
  disputed: "Contestata",
  closed_unrecovered: "Chiusa (non recuperata)",
  cancelled: "Annullata",
};

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

export function StatusBadge({ status }: { status: string }) {
  const className = STATUS_CLASSES[status] ?? "badge-neutral";
  const label = STATUS_LABELS[status] ?? status;
  return <span className={"badge " + className}>{label}</span>;
}

const VOUCHER_STATUS_LABELS: Record<string, string> = {
  open: "Aperto",
  partial: "Parziale",
  closed: "Chiuso",
  disputed: "Contestato",
  cancelled: "Annullato",
};

const VOUCHER_STATUS_CLASSES: Record<string, string> = {
  open: "badge-open",
  partial: "badge-partial",
  closed: "badge-closed",
  disputed: "badge-disputed",
  cancelled: "badge-neutral",
};

export function VoucherStatusBadge({ status }: { status: string }) {
  const className = VOUCHER_STATUS_CLASSES[status] ?? "badge-neutral";
  const label = VOUCHER_STATUS_LABELS[status] ?? status;
  return <span className={"badge " + className}>{label}</span>;
}

const PRIORITY_LABELS: Record<string, string> = {
  low: "Bassa",
  normal: "Normale",
  high: "Alta",
  critical: "Critica",
};

const PRIORITY_CLASSES: Record<string, string> = {
  low: "badge-neutral",
  normal: "badge-neutral",
  high: "badge-partial",
  critical: "badge-disputed",
};

export function PriorityBadge({ priority }: { priority: string }) {
  const className = PRIORITY_CLASSES[priority] ?? "badge-neutral";
  const label = PRIORITY_LABELS[priority] ?? priority;
  return <span className={"badge " + className}>{label}</span>;
}
