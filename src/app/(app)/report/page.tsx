import { Download } from "lucide-react";
import { requireMembership } from "@/lib/data/organization";
import { getExposureReport } from "@/lib/data/report";
import { formatCurrency, formatNumber } from "@/lib/format";
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

const AGEING_LABELS: Record<AgeingBucket, string> = {
  "0-30": "0–30 gg",
  "31-60": "31–60 gg",
  "61-90": "61–90 gg",
  "90+": "90+ gg",
};

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const membership = await requireMembership();
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
          <div className="eyebrow">Value reporting</div>
          <h1 className="page-title">Report esposizione</h1>
          <div className="page-subtitle">
            Misura outstanding e valore recuperato senza confondere stock odierno e recuperi del periodo.
          </div>
        </div>
        <a href={"/report/export?from=" + from + "&to=" + to} className="btn btn-secondary">
          <Download size={14} />
          Esporta CSV
        </a>
      </div>

      <form method="get" className="card" style={{ marginBottom: 16 }}>
        <div className="form-grid-2">
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="from">Dal</label>
            <input id="from" name="from" type="date" defaultValue={from} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="to">Al</label>
            <input id="to" name="to" type="date" defaultValue={to} />
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <button type="submit" className="btn btn-primary">Applica periodo</button>
        </div>
      </form>

      <div className="grid premium-kpis">
        <div className="metric-card">
          <div className="metric-caption">Outstanding pallet</div>
          <div className="metric-value">{formatNumber(report.totals.outstandingQuantity)}</div>
          <div className="metric-foot">situazione corrente</div>
        </div>
        <div className="metric-card">
          <div className="metric-caption">Outstanding valore</div>
          <div className="metric-value">{formatCurrency(report.totals.outstandingValue)}</div>
          <div className="metric-foot">situazione corrente</div>
        </div>
        <div className="metric-card">
          <div className="metric-caption">Recuperato nel periodo</div>
          <div className="metric-value">{formatNumber(report.totals.recoveredQuantityInPeriod)}</div>
          <div className="metric-foot">{from} → {to}</div>
        </div>
        <div className="metric-card">
          <div className="metric-caption">Valore recuperato</div>
          <div className="metric-value">{formatCurrency(report.totals.recoveredValueInPeriod)}</div>
          <div className="metric-foot">{formatNumber(report.totals.casesOpenedInPeriod)} pratiche aperte nel periodo</div>
        </div>
      </div>

      <div className="section-grid">
        <section className="panel">
          <div className="panel-header">
            <div><h2 className="panel-title">Esposizione per controparte</h2><div className="panel-subtitle">Dove è concentrato il valore outstanding.</div></div>
          </div>
          {report.rows.length === 0 ? (
            <div className="empty-state">Nessun dato per il periodo selezionato.</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Controparte</th><th>Pratiche</th><th>Outstanding</th><th>Valore</th><th>Recuperato</th><th>Valore recuperato</th><th>Età max</th></tr>
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
            <div><h2 className="panel-title">Ageing</h2><div className="panel-subtitle">Valore outstanding per anzianità.</div></div>
          </div>
          <div className="panel-body">
            <div className="chart-list">
              {(Object.keys(report.ageing) as AgeingBucket[]).map((bucket) => (
                <div className="chart-row" key={bucket}>
                  <span className="chart-label">{AGEING_LABELS[bucket]}</span>
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

      <p className="muted" style={{ fontSize: 11 }}>
        L&apos;outstanding è calcolato alla data odierna; i valori recuperati riflettono gli eventi registrati nel periodo selezionato.
      </p>
    </div>
  );
}
