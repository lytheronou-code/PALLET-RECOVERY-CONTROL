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
  "0-30": "0-30 giorni",
  "31-60": "31-60 giorni",
  "61-90": "61-90 giorni",
  "90+": "oltre 90 giorni",
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

  const periodStart = new Date(`${from}T00:00:00Z`);
  const periodEnd = new Date(`${to}T23:59:59Z`);
  const report = await getExposureReport(membership.organizationId, periodStart, periodEnd);

  return (
    <div className="shell">
      <div className="header">
        <div className="brand">Report esposizione</div>
        <a
          href={`/report/export?from=${from}&to=${to}`}
          className="btn btn-secondary"
          style={{ width: "auto" }}
        >
          Esporta CSV
        </a>
      </div>

      <form method="get" className="card" style={{ marginBottom: 20, display: "flex", gap: 12, alignItems: "flex-end" }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="from">Dal</label>
          <input id="from" name="from" type="date" defaultValue={from} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="to">Al</label>
          <input id="to" name="to" type="date" defaultValue={to} />
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: "auto" }}>
          Applica
        </button>
      </form>

      <p className="muted" style={{ marginTop: -8, marginBottom: 20, maxWidth: 720 }}>
        L&apos;esposizione outstanding è calcolata alla data odierna; i valori &quot;recuperato nel periodo&quot;
        riflettono solo gli eventi di recupero registrati tra {from} e {to}.
      </p>

      <div className="grid kpis" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="kpi-label">Outstanding pallet</div>
          <div className="kpi-value">{formatNumber(report.totals.outstandingQuantity)}</div>
        </div>
        <div className="card">
          <div className="kpi-label">Outstanding valore</div>
          <div className="kpi-value">{formatCurrency(report.totals.outstandingValue)}</div>
        </div>
        <div className="card">
          <div className="kpi-label">Recuperato nel periodo</div>
          <div className="kpi-value">{formatNumber(report.totals.recoveredQuantityInPeriod)}</div>
        </div>
        <div className="card">
          <div className="kpi-label">Valore recuperato nel periodo</div>
          <div className="kpi-value">{formatCurrency(report.totals.recoveredValueInPeriod)}</div>
        </div>
        <div className="card">
          <div className="kpi-label">Pratiche aperte nel periodo</div>
          <div className="kpi-value">{formatNumber(report.totals.casesOpenedInPeriod)}</div>
        </div>
      </div>

      <h2 style={{ fontSize: 16 }}>Anzianità esposizione outstanding</h2>
      <div className="card" style={{ marginBottom: 24 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Fascia</th>
              <th>Pratiche</th>
              <th>Valore</th>
            </tr>
          </thead>
          <tbody>
            {(Object.keys(report.ageing) as AgeingBucket[]).map((bucket) => (
              <tr key={bucket}>
                <td>{AGEING_LABELS[bucket]}</td>
                <td>{formatNumber(report.ageing[bucket].count)}</td>
                <td>{formatCurrency(report.ageing[bucket].value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ fontSize: 16 }}>Per controparte</h2>
      <div className="card">
        {report.rows.length === 0 ? (
          <div className="empty-state">Nessun dato per il periodo selezionato.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Controparte</th>
                <th>Pratiche aperte</th>
                <th>Outstanding</th>
                <th>Valore outstanding</th>
                <th>Recuperato periodo</th>
                <th>Valore recuperato</th>
                <th>Anzianità max</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row) => (
                <tr key={row.counterpartyId}>
                  <td>{row.counterpartyName}</td>
                  <td>{formatNumber(row.openCasesCount)}</td>
                  <td>{formatNumber(row.outstandingQuantity)}</td>
                  <td>{formatCurrency(row.outstandingValue)}</td>
                  <td>{formatNumber(row.recoveredQuantityInPeriod)}</td>
                  <td>{formatCurrency(row.recoveredValueInPeriod)}</td>
                  <td>{row.oldestOpenCaseDays ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
