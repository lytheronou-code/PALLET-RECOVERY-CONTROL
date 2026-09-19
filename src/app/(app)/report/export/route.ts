import { NextResponse, type NextRequest } from "next/server";
import { requireMembership } from "@/lib/data/organization";
import { getExposureReport } from "@/lib/data/report";
import { exposureReportToCsv } from "@/lib/reporting/exposure-report";
import { getT } from "@/i18n/server";

export async function GET(request: NextRequest) {
  const membership = await requireMembership();
  const { t } = await getT(membership.organizationId);
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const periodStart = from ? new Date(`${from}T00:00:00Z`) : new Date(0);
  const periodEnd = to ? new Date(`${to}T23:59:59Z`) : new Date();

  const report = await getExposureReport(membership.organizationId, periodStart, periodEnd);
  const csv = exposureReportToCsv(report, [
    t("reports.csv.counterparty"),
    t("reports.csv.openCases"),
    t("reports.csv.outstandingPallets"),
    t("reports.csv.outstandingValue"),
    t("reports.csv.recoveredPalletsInPeriod"),
    t("reports.csv.recoveredValueInPeriod"),
    t("reports.csv.maxAgeingDays"),
  ]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="exposure-report-${from ?? "all"}-${to ?? "all"}.csv"`,
    },
  });
}
