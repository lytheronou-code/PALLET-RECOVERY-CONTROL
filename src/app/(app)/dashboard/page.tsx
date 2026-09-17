import Link from "next/link";
import { redirect } from "next/navigation";
import { getPrimaryMembership } from "@/lib/data/organization";
import {
  getActionableCases,
  getDashboardKpis,
  getTopExposureCounterparties,
} from "@/lib/data/dashboard";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { StatusBadge, PriorityBadge } from "@/components/status-badge";

export default async function DashboardPage() {
  const membership = await getPrimaryMembership();
  if (!membership) {
    redirect("/onboarding");
  }

  const [kpis, topCounterparties, actionableCases] = await Promise.all([
    getDashboardKpis(membership.organizationId),
    getTopExposureCounterparties(membership.organizationId),
    getActionableCases(membership.organizationId),
  ]);

  return (
    <div className="shell">
      <div className="header">
        <div>
          <div className="brand">Dashboard</div>
          <div className="muted">{membership.organizationName}</div>
        </div>
      </div>

      <div className="grid kpis" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="kpi-label">Pallet da recuperare</div>
          <div className="kpi-value">{formatNumber(kpis.openPallets)}</div>
        </div>
        <div className="card">
          <div className="kpi-label">Esposizione economica</div>
          <div className="kpi-value">{formatCurrency(kpis.openExposure)}</div>
        </div>
        <div className="card">
          <div className="kpi-label">Pallet recuperati</div>
          <div className="kpi-value">{formatNumber(kpis.recoveredPallets)}</div>
        </div>
        <div className="card">
          <div className="kpi-label">Valore recuperato</div>
          <div className="kpi-value">{formatCurrency(kpis.recoveredValue)}</div>
        </div>
        <div className="card">
          <div className="kpi-label">Pratiche in scadenza (7gg)</div>
          <div className="kpi-value">{formatNumber(kpis.casesDueSoon)}</div>
        </div>
        <div className="card">
          <div className="kpi-label">Pratiche scadute</div>
          <div className="kpi-value">{formatNumber(kpis.overdueCases)}</div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.2fr 1fr", alignItems: "start" }}>
        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: 16 }}>Pratiche che richiedono azione</h2>
          {actionableCases.length === 0 ? (
            <div className="empty-state">
              Nessuna pratica aperta. Le pratiche di recupero appariranno qui una volta create.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Riferimento</th>
                  <th>Controparte</th>
                  <th>Scadenza</th>
                  <th>Priorità</th>
                  <th>Stato</th>
                  <th>Esposizione</th>
                </tr>
              </thead>
              <tbody>
                {actionableCases.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/recovery-cases/${c.id}`}>{c.reference}</Link>
                    </td>
                    <td>{c.counterpartyName}</td>
                    <td>{formatDate(c.dueDate)}</td>
                    <td>
                      <PriorityBadge priority={c.priority} />
                    </td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    <td>{formatCurrency(c.outstandingExposure)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: 16 }}>Controparti per esposizione</h2>
          {topCounterparties.length === 0 ? (
            <div className="empty-state">Nessuna esposizione registrata.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Controparte</th>
                  <th>Pallet</th>
                  <th>Esposizione</th>
                </tr>
              </thead>
              <tbody>
                {topCounterparties.map((cp) => (
                  <tr key={cp.counterpartyId}>
                    <td>{cp.legalName}</td>
                    <td>{formatNumber(cp.outstandingPallets)}</td>
                    <td>{formatCurrency(cp.outstandingExposure)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
