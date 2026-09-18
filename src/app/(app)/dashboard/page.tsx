import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  Boxes,
  CircleDollarSign,
  Gauge,
  Ticket,
  TriangleAlert,
} from "lucide-react";
import { getPrimaryMembership } from "@/lib/data/organization";
import {
  getActionableCases,
  getDashboardInsights,
  getDashboardKpis,
  getTopExposureCounterparties,
} from "@/lib/data/dashboard";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";

export default async function DashboardPage() {
  const membership = await getPrimaryMembership();
  if (!membership) {
    redirect("/onboarding");
  }

  const [kpis, insights, topCounterparties, actionableCases] = await Promise.all([
    getDashboardKpis(membership.organizationId),
    getDashboardInsights(membership.organizationId),
    getTopExposureCounterparties(membership.organizationId),
    getActionableCases(membership.organizationId),
  ]);

  const ageingMax = Math.max(1, ...insights.ageing.map((item) => item.value));
  const topExposureMax = Math.max(1, ...topCounterparties.map((item) => item.outstandingExposure));
  const hasData = insights.openCases > 0 || insights.openVouchers > 0 || kpis.recoveredPallets > 0;

  return (
    <div className="shell">
      <div className="header">
        <div className="page-heading">
          <div className="eyebrow">Operations overview</div>
          <h1 className="page-title">Recovery Command Center</h1>
          <div className="page-subtitle">
            Esposizione, priorità e recuperi in un&apos;unica vista operativa.
          </div>
        </div>
        <div className="header-actions">
          <Link href="/vouchers/new" className="btn btn-secondary">
            <Ticket size={14} />
            Nuovo buono
          </Link>
          <Link href="/recovery-cases/new" className="btn btn-primary">
            Nuova pratica
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>

      <div className="grid premium-kpis">
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-caption">Esposizione aperta</span>
            <span className="metric-icon"><CircleDollarSign size={17} /></span>
          </div>
          <div className="metric-value">{formatCurrency(kpis.openExposure)}</div>
          <div className="metric-foot"><strong>{formatNumber(kpis.openPallets)}</strong> pallet outstanding</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-caption">Recovery rate</span>
            <span className="metric-icon info"><Gauge size={17} /></span>
          </div>
          <div className="metric-value">{insights.recoveryRate}%</div>
          <div className="metric-foot"><strong>{formatNumber(kpis.recoveredPallets)}</strong> pallet recuperati</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-caption">Valore recuperato</span>
            <span className="metric-icon"><Boxes size={17} /></span>
          </div>
          <div className="metric-value">{formatCurrency(kpis.recoveredValue)}</div>
          <div className="metric-foot">valore storico registrato</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-caption">Esposizione scaduta</span>
            <span className="metric-icon danger"><TriangleAlert size={17} /></span>
          </div>
          <div className="metric-value">{formatCurrency(insights.overdueExposure)}</div>
          <div className="metric-foot"><strong>{formatNumber(kpis.overdueCases)}</strong> pratiche oltre scadenza</div>
        </div>
      </div>

      {!hasData ? (
        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Imposta il controllo operativo</h2>
              <div className="panel-subtitle">Tre passaggi per ottenere una dashboard realmente utile.</div>
            </div>
          </div>
          <div className="panel-body">
            <div className="quick-start">
              <Link href="/counterparties/new">
                <strong>1. Crea le controparti</strong>
                <span>Clienti, debitori, retailer e trasportatori.</span>
              </Link>
              <Link href="/import">
                <strong>2. Importa i movimenti</strong>
                <span>Carica DDT e movimenti pallet da CSV.</span>
              </Link>
              <Link href="/vouchers/new">
                <strong>3. Registra i buoni</strong>
                <span>Scadenze e quantità alimentano la riconciliazione.</span>
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <div className="section-grid">
        <section className="panel" id="action-center">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Action center</h2>
              <div className="panel-subtitle">Pratiche che richiedono attenzione operativa.</div>
            </div>
            <Link href="/recovery-cases" className="panel-link">Vedi tutte</Link>
          </div>
          {actionableCases.length === 0 ? (
            <div className="empty-state">Nessuna pratica operativa aperta.</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Pratica</th>
                    <th>Controparte</th>
                    <th>Scadenza</th>
                    <th>Priorità</th>
                    <th>Stato</th>
                    <th>Esposizione</th>
                  </tr>
                </thead>
                <tbody>
                  {actionableCases.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <Link href={"/recovery-cases/" + item.id}>
                          <div className="row-title">{item.reference}</div>
                          <div className="row-subtitle">{item.palletTypeCode} · {formatNumber(item.outstandingPallets)} pallet</div>
                        </Link>
                      </td>
                      <td>{item.counterpartyName}</td>
                      <td>{formatDate(item.dueDate)}</td>
                      <td><PriorityBadge priority={item.priority} /></td>
                      <td><StatusBadge status={item.status} /></td>
                      <td className="numeric">{formatCurrency(item.outstandingExposure)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Operational health</h2>
              <div className="panel-subtitle">Scadenze e velocità di recupero.</div>
            </div>
          </div>
          <div className="panel-body">
            <div className="recovery-gauge-wrap" style={{ marginBottom: 18 }}>
              <div className="recovery-gauge">
                <strong>{insights.recoveryRate}%</strong>
              </div>
              <div>
                <div className="row-title">Recovery rate</div>
                <div className="row-subtitle">{formatNumber(insights.openCases)} pratiche operative aperte</div>
              </div>
            </div>

            <div className="health-grid">
              <div className="health-tile">
                <div className="health-value">{formatNumber(kpis.casesDueSoon)}</div>
                <div className="health-label">Pratiche entro 7 gg</div>
              </div>
              <div className="health-tile">
                <div className="health-value">{formatNumber(kpis.overdueCases)}</div>
                <div className="health-label">Pratiche scadute</div>
              </div>
              <div className="health-tile">
                <div className="health-value">{formatNumber(insights.voucherDueSoon)}</div>
                <div className="health-label">Buoni entro 7 gg</div>
              </div>
              <div className="health-tile">
                <div className="health-value">{formatNumber(insights.voucherOverdue)}</div>
                <div className="health-label">Buoni scaduti</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="section-grid equal">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Ageing dell&apos;esposizione</h2>
              <div className="panel-subtitle">Valore outstanding per anzianità della pratica.</div>
            </div>
            <Link href="/report" className="panel-link">Apri report</Link>
          </div>
          <div className="panel-body">
            <div className="chart-list">
              {insights.ageing.map((item) => (
                <div className="chart-row" key={item.label}>
                  <span className="chart-label">{item.label}</span>
                  <span className="chart-track">
                    <span
                      className="chart-fill"
                      style={{ width: Math.max(2, Math.round((item.value / ageingMax) * 100)) + "%" }}
                    />
                  </span>
                  <span className="chart-value">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Top esposizioni</h2>
              <div className="panel-subtitle">Controparti ordinate per valore da recuperare.</div>
            </div>
            <Link href="/counterparties" className="panel-link">Controparti</Link>
          </div>
          <div className="panel-body">
            {topCounterparties.length === 0 ? (
              <div className="empty-state" style={{ padding: "20px 0" }}>Nessuna esposizione registrata.</div>
            ) : (
              <div className="chart-list">
                {topCounterparties.map((item) => (
                  <div className="chart-row" key={item.counterpartyId}>
                    <Link className="chart-label" href={"/counterparties/" + item.counterpartyId}>
                      {item.legalName}
                    </Link>
                    <span className="chart-track">
                      <span
                        className="chart-fill"
                        style={{ width: Math.max(2, Math.round((item.outstandingExposure / topExposureMax) * 100)) + "%" }}
                      />
                    </span>
                    <span className="chart-value">{formatCurrency(item.outstandingExposure)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
