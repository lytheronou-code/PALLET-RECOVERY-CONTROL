import { describe, expect, it } from "vitest";
import {
  ageingBucket,
  buildExposureReport,
  exposureReportToCsv,
  type CaseForReport,
  type RecoveryEventForReport,
} from "@/lib/reporting/exposure-report";

function makeCase(overrides: Partial<CaseForReport>): CaseForReport {
  return {
    id: "c-1",
    counterpartyId: "cp-1",
    counterpartyName: "Acme Srl",
    openedAt: "2026-01-01",
    quantityClaimed: 20,
    quantityRecovered: 0,
    unitValueSnapshot: 10,
    status: "open",
    ...overrides,
  };
}

describe("ageingBucket", () => {
  it("buckets days into the right range", () => {
    expect(ageingBucket(0)).toBe("0-30");
    expect(ageingBucket(30)).toBe("0-30");
    expect(ageingBucket(31)).toBe("31-60");
    expect(ageingBucket(60)).toBe("31-60");
    expect(ageingBucket(61)).toBe("61-90");
    expect(ageingBucket(90)).toBe("61-90");
    expect(ageingBucket(91)).toBe("90+");
  });
});

describe("buildExposureReport", () => {
  const periodStart = new Date("2026-01-01T00:00:00Z");
  const periodEnd = new Date("2026-03-31T00:00:00Z");
  const today = new Date("2026-03-31T00:00:00Z");

  it("computes outstanding quantity/value for open cases as of today", () => {
    const report = buildExposureReport(
      [makeCase({ quantityClaimed: 20, quantityRecovered: 5, unitValueSnapshot: 10 })],
      [],
      periodStart,
      periodEnd,
      today,
    );
    expect(report.totals.outstandingQuantity).toBe(15);
    expect(report.totals.outstandingValue).toBe(150);
  });

  it("excludes closed_unrecovered and cancelled cases from outstanding", () => {
    const report = buildExposureReport(
      [
        makeCase({ id: "c-1", status: "closed_unrecovered", quantityClaimed: 10, quantityRecovered: 0 }),
        makeCase({ id: "c-2", status: "cancelled", quantityClaimed: 10, quantityRecovered: 0 }),
      ],
      [],
      periodStart,
      periodEnd,
      today,
    );
    expect(report.totals.outstandingQuantity).toBe(0);
    expect(report.rows.every((r) => r.outstandingQuantity === 0)).toBe(true);
  });

  it("sums recovered quantity/value only for events inside the period", () => {
    const events: RecoveryEventForReport[] = [
      { caseId: "c-1", eventType: "partial_recovery", quantity: 4, occurredAt: "2026-02-01" },
      { caseId: "c-1", eventType: "full_recovery", quantity: 100, occurredAt: "2025-12-01" }, // outside period
      { caseId: "c-1", eventType: "note", quantity: null, occurredAt: "2026-02-05" }, // not a recovery event
    ];
    const report = buildExposureReport(
      [makeCase({ id: "c-1", unitValueSnapshot: 10 })],
      events,
      periodStart,
      periodEnd,
      today,
    );
    expect(report.totals.recoveredQuantityInPeriod).toBe(4);
    expect(report.totals.recoveredValueInPeriod).toBe(40);
  });

  it("counts cases opened within the period", () => {
    const report = buildExposureReport(
      [
        makeCase({ id: "c-1", openedAt: "2026-02-01" }),
        makeCase({ id: "c-2", openedAt: "2025-06-01" }),
      ],
      [],
      periodStart,
      periodEnd,
      today,
    );
    expect(report.totals.casesOpenedInPeriod).toBe(1);
  });

  it("buckets outstanding exposure by age from opened_at to today", () => {
    const report = buildExposureReport(
      [
        makeCase({ id: "c-1", openedAt: "2026-03-20", quantityClaimed: 5, quantityRecovered: 0 }), // 11 days
        makeCase({ id: "c-2", openedAt: "2025-11-01", quantityClaimed: 5, quantityRecovered: 0 }), // >90 days
      ],
      [],
      periodStart,
      periodEnd,
      today,
    );
    expect(report.ageing["0-30"].count).toBe(1);
    expect(report.ageing["90+"].count).toBe(1);
  });

  it("aggregates by counterparty and keeps a counterparty with only recovered-in-period activity", () => {
    const report = buildExposureReport(
      [makeCase({ id: "c-1", counterpartyId: "cp-1", status: "recovered", quantityClaimed: 10, quantityRecovered: 10 })],
      [{ caseId: "c-1", eventType: "full_recovery", quantity: 10, occurredAt: "2026-02-01" }],
      periodStart,
      periodEnd,
      today,
    );
    expect(report.rows).toHaveLength(1);
    expect(report.rows[0].recoveredQuantityInPeriod).toBe(10);
    expect(report.rows[0].outstandingQuantity).toBe(0);
  });

  it("sorts rows by outstanding value descending", () => {
    const report = buildExposureReport(
      [
        makeCase({ id: "c-1", counterpartyId: "cp-1", counterpartyName: "Small", quantityClaimed: 2, unitValueSnapshot: 10 }),
        makeCase({ id: "c-2", counterpartyId: "cp-2", counterpartyName: "Big", quantityClaimed: 50, unitValueSnapshot: 10 }),
      ],
      [],
      periodStart,
      periodEnd,
      today,
    );
    expect(report.rows[0].counterpartyName).toBe("Big");
  });
});

describe("exposureReportToCsv", () => {
  it("renders a header row and one row per counterparty", () => {
    const report = buildExposureReport(
      [makeCase({ quantityClaimed: 10, quantityRecovered: 2, unitValueSnapshot: 10 })],
      [],
      new Date("2026-01-01"),
      new Date("2026-03-31"),
      new Date("2026-03-31"),
    );
    const csv = exposureReportToCsv(report);
    const lines = csv.split("\n");
    expect(lines[0]).toBe(
      "Controparte,Pratiche aperte,Outstanding pallet,Outstanding valore,Recuperato periodo (pallet),Recuperato periodo (valore),Anzianità max (giorni)",
    );
    expect(lines[1]).toContain("Acme Srl");
    expect(lines[1]).toContain("80.00");
  });

  it("escapes counterparty names containing commas", () => {
    const report = buildExposureReport(
      [makeCase({ counterpartyName: "Acme, Inc." })],
      [],
      new Date("2026-01-01"),
      new Date("2026-03-31"),
    );
    const csv = exposureReportToCsv(report);
    expect(csv).toContain('"Acme, Inc."');
  });
});
