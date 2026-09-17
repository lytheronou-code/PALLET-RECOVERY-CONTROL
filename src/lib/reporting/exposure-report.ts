// Pure aggregation for the pilot "exposure report" (M8). Deliberately does
// not attempt a historical point-in-time "opening balance": the schema has
// no ledger/snapshot table to reconstruct exposure as of a past date, so
// this reports outstanding exposure as of `today` (the report's run date)
// alongside what was actually recovered inside the selected period, rather
// than fabricating a number the data can't support.

export type CaseForReport = {
  id: string;
  counterpartyId: string;
  counterpartyName: string;
  openedAt: string;
  quantityClaimed: number;
  quantityRecovered: number;
  unitValueSnapshot: number;
  status: string;
};

export type RecoveryEventForReport = {
  caseId: string;
  eventType: string;
  quantity: number | null;
  occurredAt: string;
};

export type AgeingBucket = "0-30" | "31-60" | "61-90" | "90+";

export type CounterpartyReportRow = {
  counterpartyId: string;
  counterpartyName: string;
  openCasesCount: number;
  outstandingQuantity: number;
  outstandingValue: number;
  recoveredQuantityInPeriod: number;
  recoveredValueInPeriod: number;
  oldestOpenCaseDays: number | null;
};

export type ExposureReport = {
  rows: CounterpartyReportRow[];
  ageing: Record<AgeingBucket, { count: number; value: number }>;
  totals: {
    outstandingQuantity: number;
    outstandingValue: number;
    recoveredQuantityInPeriod: number;
    recoveredValueInPeriod: number;
    casesOpenedInPeriod: number;
  };
};

const RECOVERY_EVENT_TYPES = new Set(["partial_recovery", "full_recovery"]);
const CLOSED_STATUSES = new Set(["closed_unrecovered", "cancelled"]);

export function ageingBucket(days: number): AgeingBucket {
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
}

export function buildExposureReport(
  cases: CaseForReport[],
  events: RecoveryEventForReport[],
  periodStart: Date,
  periodEnd: Date,
  today: Date = new Date(),
): ExposureReport {
  const caseById = new Map(cases.map((c) => [c.id, c]));

  const recoveredInPeriodByCounterparty = new Map<string, { quantity: number; value: number }>();
  let recoveredQuantityInPeriod = 0;
  let recoveredValueInPeriod = 0;

  for (const event of events) {
    if (!RECOVERY_EVENT_TYPES.has(event.eventType) || !event.quantity) continue;
    const occurredAt = new Date(event.occurredAt);
    if (occurredAt < periodStart || occurredAt > periodEnd) continue;
    const parentCase = caseById.get(event.caseId);
    if (!parentCase) continue;

    const value = event.quantity * parentCase.unitValueSnapshot;
    recoveredQuantityInPeriod += event.quantity;
    recoveredValueInPeriod += value;

    const existing = recoveredInPeriodByCounterparty.get(parentCase.counterpartyId) ?? { quantity: 0, value: 0 };
    existing.quantity += event.quantity;
    existing.value += value;
    recoveredInPeriodByCounterparty.set(parentCase.counterpartyId, existing);
  }

  const byCounterparty = new Map<string, CounterpartyReportRow>();
  const ageing: Record<AgeingBucket, { count: number; value: number }> = {
    "0-30": { count: 0, value: 0 },
    "31-60": { count: 0, value: 0 },
    "61-90": { count: 0, value: 0 },
    "90+": { count: 0, value: 0 },
  };

  let outstandingQuantity = 0;
  let outstandingValue = 0;
  let casesOpenedInPeriod = 0;

  for (const c of cases) {
    const openedAt = new Date(c.openedAt);
    if (openedAt >= periodStart && openedAt <= periodEnd) {
      casesOpenedInPeriod += 1;
    }

    const isOpen = !CLOSED_STATUSES.has(c.status);
    const rowOutstandingQuantity = isOpen ? Math.max(0, c.quantityClaimed - c.quantityRecovered) : 0;
    const rowOutstandingValue = rowOutstandingQuantity * c.unitValueSnapshot;

    if (isOpen && rowOutstandingQuantity > 0) {
      outstandingQuantity += rowOutstandingQuantity;
      outstandingValue += rowOutstandingValue;
      const age = daysBetween(openedAt, today);
      const bucket = ageingBucket(age);
      ageing[bucket].count += 1;
      ageing[bucket].value += rowOutstandingValue;
    }

    const recovered = recoveredInPeriodByCounterparty.get(c.counterpartyId);
    const existing = byCounterparty.get(c.counterpartyId);
    const age = isOpen && rowOutstandingQuantity > 0 ? daysBetween(openedAt, today) : null;

    if (existing) {
      existing.openCasesCount += isOpen ? 1 : 0;
      existing.outstandingQuantity += rowOutstandingQuantity;
      existing.outstandingValue += rowOutstandingValue;
      if (age !== null && (existing.oldestOpenCaseDays === null || age > existing.oldestOpenCaseDays)) {
        existing.oldestOpenCaseDays = age;
      }
    } else {
      byCounterparty.set(c.counterpartyId, {
        counterpartyId: c.counterpartyId,
        counterpartyName: c.counterpartyName,
        openCasesCount: isOpen ? 1 : 0,
        outstandingQuantity: rowOutstandingQuantity,
        outstandingValue: rowOutstandingValue,
        recoveredQuantityInPeriod: recovered?.quantity ?? 0,
        recoveredValueInPeriod: recovered?.value ?? 0,
        oldestOpenCaseDays: age,
      });
    }
  }

  // recoveredInPeriod may reference a counterparty with no currently-open
  // cases (fully recovered inside the window) — make sure it still appears.
  for (const [counterpartyId, recovered] of recoveredInPeriodByCounterparty) {
    if (!byCounterparty.has(counterpartyId)) {
      const sampleCase = cases.find((c) => c.counterpartyId === counterpartyId);
      byCounterparty.set(counterpartyId, {
        counterpartyId,
        counterpartyName: sampleCase?.counterpartyName ?? "—",
        openCasesCount: 0,
        outstandingQuantity: 0,
        outstandingValue: 0,
        recoveredQuantityInPeriod: recovered.quantity,
        recoveredValueInPeriod: recovered.value,
        oldestOpenCaseDays: null,
      });
    } else {
      const row = byCounterparty.get(counterpartyId)!;
      row.recoveredQuantityInPeriod = recovered.quantity;
      row.recoveredValueInPeriod = recovered.value;
    }
  }

  const rows = Array.from(byCounterparty.values()).sort((a, b) => b.outstandingValue - a.outstandingValue);

  return {
    rows,
    ageing,
    totals: {
      outstandingQuantity,
      outstandingValue,
      recoveredQuantityInPeriod,
      recoveredValueInPeriod,
      casesOpenedInPeriod,
    },
  };
}

export function exposureReportToCsv(report: ExposureReport): string {
  const header = [
    "Controparte",
    "Pratiche aperte",
    "Outstanding pallet",
    "Outstanding valore",
    "Recuperato periodo (pallet)",
    "Recuperato periodo (valore)",
    "Anzianità max (giorni)",
  ];
  const lines = [header.join(",")];

  for (const row of report.rows) {
    lines.push(
      [
        csvEscape(row.counterpartyName),
        row.openCasesCount,
        row.outstandingQuantity,
        row.outstandingValue.toFixed(2),
        row.recoveredQuantityInPeriod,
        row.recoveredValueInPeriod.toFixed(2),
        row.oldestOpenCaseDays ?? "",
      ].join(","),
    );
  }

  return lines.join("\n");
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
