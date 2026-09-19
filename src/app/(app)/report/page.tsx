import { Download } from "lucide-react";
import { requireMembership } from "@/lib/data/organization";
import { getExposureReport } from "@/lib/data/report";
import { getPageContext } from "@/i18n/server";
import type { Translator } from "@/i18n/translator";
import type { AgeingBucket } from "@/lib/reporting/exposure-report";

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 90);
  return { from: toIsoDate(from), to: toIsoDate(to) };
}

const AGEING_LABEL_KEYS = {
  "0-30": "reports.ageing.d0to30",
  "31-60": "reports.ageing.d31to60",
  "61-90": "reports.ageing.d61to90",
  "90+": "reports.ageing.d90plus",
} as const satisfies Record<AgeingBucket, Parameters<Translator>[0]>;

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const membership = await requireMembership();
  const { t, formatCurrency, formatNumber } = await getPageContext(membership.organizationId);
  const params = await searchParams;
  const defaults = defaultRange();
  const from = params.from || defaults.from;
  const to = params.to || defaults.to;

  const periodStart = new Date(from + "T00:00:00Z");
  const periodEnd = new Date(to + "T23:59:59Z");
  const report = await getExposureReport(membership.organizationId, periodStart, periodEnd);
  const maxAgeingValue = Math.max(1, ...(Object.values(report.ageing).map((item) => item.value)));

  return (
    <div className="shell">
      <div className="header">
        <div className="page-heading">
          <div className="eyebrow">{t("reports.eyebrow")}</div>
          <h1 className="page-title">{t("reports.title")}</h1>
          <div className="page-subtitle">{t("reports.subtitle")}</div>
        </div>
        <a href={"/report/export?from=" + from + "&to=" + to} className="btn btn-secondary">
          <Download size={14} />
          {t("reports.exportCsv")}
        </a>
      </div>

      <form method="get" className="card" style={{ marginBottom: 16 }}>
        <div className="form-grid-2">
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="from">{t("reports.dateFrom")}</label>
            <input id="from" name="from" type="date" defaultValue={from} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="to">{t("reports.dateTo")}</label>
            <input id="to" name="to" type="date" defaultValue={to} />
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <button type="submit" className="btn btn-primary">{t("reports.applyPeriod")}</button>
        </div>
      </form>

      <div className="grid premium-kpis">
        <div className="metric-card">
          <div className="metric-caption">{t("reports.metrics.outstandingPallets")}</div>
          <div className="metric-value">{formatNumber(report.totals.outstandingQuantity)}</div>
          <div className="metric-foot">{t("reports.metrics.currentSituation")}</div>
        </div>
        <div className="metric-card">
          <div className="metric-caption">{t("reports.metrics.outstandingValue")}</div>
          <div className="metric-value">{formatCurrency(report.totals.outstandingValue)}</div>
          <div className="metric-foot">{t("reports.metrics.currentSituation")}</div>
        </div>
        <div className="metric-card">
          <div className="metric-caption">{t("reports.metrics.recoveredInPeriod")}</div>
          <div className="metric-value">{formatNumber(report.totals.recoveredQuantityInPeriod)}</div>
          <div className="metric-foot">{t("reports.metrics.periodRange", { from, to })}</div>
        </div>
        <div className="metric-card">
          <div className="metric-caption">{t("reports.metrics.recoveredValue")}</div>
          <div className="metric-value">{formatCurrency(report.totals.recoveredValueInPeriod)}</div>
          <div className="metric-foot">
            {t("reports.metrics.casesOpenedInPeriod", { count: formatNumber(report.totals.casesOpenedInPeriod) })}
          </div>
        </div>
      </div>

      <div className="section-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">{t("reports.byCounterparty.title")}</h2>
              <div className="panel-subtitle">{t("reports.byCounterparty.subtitle")}</div>
            </div>
          </div>
          {report.rows.length === 0 ? (
            <div className="empty-state">{t("reports.emptyPeriod")}</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("reports.csv.counterparty")}</th>
                    <th>{t("reports.csv.openCases")}</th>
                    <th>{t("reports.csv.outstandingPallets")}</th>
                    <th>{t("reports.csv.outstandingValue")}</th>
                    <th>{t("reports.csv.recoveredPalletsInPeriod")}</th>
                    <th>{t("reports.csv.recoveredValueInPeriod")}</th>
                    <th>{t("reports.csv.maxAgeingDays")}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row) => (
                    <tr key={row.counterpartyId}>
                      <td className="row-title">{row.counterpartyName}</td>
                      <td className="numeric">{formatNumber(row.openCasesCount)}</td>
                      <td className="numeric">{formatNumber(row.outstandingQuantity)}</td>
                      <td className="numeric">{formatCurrency(row.outstandingValue)}</td>
                      <td className="numeric">{formatNumber(row.recoveredQuantityInPeriod)}</td>
                      <td className="numeric">{formatCurrency(row.recoveredValueInPeriod)}</td>
                      <td className="numeric">{row.oldestOpenCaseDays ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">{t("reports.ageingTitle")}</h2>
              <div className="panel-subtitle">{t("reports.ageingSubtitle")}</div>
            </div>
          </div>
          <div className="panel-body">
            <div className="chart-list">
              {(Object.keys(report.ageing) as AgeingBucket[]).map((bucket) => (
                <div className="chart-row" key={bucket}>
                  <span className="chart-label">{t(AGEING_LABEL_KEYS[bucket])}</span>
                  <span className="chart-track">
                    <span className="chart-fill" style={{ width: Math.max(2, Math.round((report.ageing[bucket].value / maxAgeingValue) * 100)) + "%" }} />
                  </span>
                  <span className="chart-value">{formatCurrency(report.ageing[bucket].value)}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <p className="muted" style={{ fontSize: 11 }}>{t("reports.footnote")}</p>
    </div>
  );
}
