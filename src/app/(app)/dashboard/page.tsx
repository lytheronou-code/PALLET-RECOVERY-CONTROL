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
import { getPageContext } from "@/i18n/server";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";

export default async function DashboardPage() {
  const membership = await getPrimaryMembership();
  if (!membership) {
    redirect("/onboarding");
  }

  const { t, formatCurrency, formatDate, formatNumber } = await getPageContext(membership.organizationId);

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
          <div className="eyebrow">{t("dashboard.eyebrow")}</div>
          <h1 className="page-title">{t("dashboard.title")}</h1>
          <div className="page-subtitle">{t("dashboard.subtitle")}</div>
        </div>
        <div className="header-actions">
          <Link href="/vouchers/new" className="btn btn-secondary">
            <Ticket size={14} />
            {t("dashboard.newVoucher")}
          </Link>
          <Link href="/recovery-cases/new" className="btn btn-primary">
            {t("dashboard.newCase")}
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>

      <div className="grid premium-kpis">
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-caption">{t("dashboard.openExposureLabel")}</span>
            <span className="metric-icon"><CircleDollarSign size={17} /></span>
          </div>
          <div className="metric-value">{formatCurrency(kpis.openExposure)}</div>
          <div className="metric-foot">
            <strong>{formatNumber(kpis.openPallets)}</strong> {t("dashboard.palletsOutstanding")}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-caption">{t("dashboard.recoveryRate")}</span>
            <span className="metric-icon info"><Gauge size={17} /></span>
          </div>
          <div className="metric-value">{insights.recoveryRate}%</div>
          <div className="metric-foot">
            <strong>{formatNumber(kpis.recoveredPallets)}</strong> {t("dashboard.palletsRecovered")}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-caption">{t("dashboard.recoveredValueLabel")}</span>
            <span className="metric-icon"><Boxes size={17} /></span>
          </div>
          <div className="metric-value">{formatCurrency(kpis.recoveredValue)}</div>
          <div className="metric-foot">{t("dashboard.historicalValueRecorded")}</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-caption">{t("dashboard.overdueExposureLabel")}</span>
            <span className="metric-icon danger"><TriangleAlert size={17} /></span>
          </div>
          <div className="metric-value">{formatCurrency(insights.overdueExposure)}</div>
          <div className="metric-foot">
            <strong>{formatNumber(kpis.overdueCases)}</strong> {t("dashboard.casesPastDue")}
          </div>
        </div>
      </div>

      {!hasData ? (
        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="panel-header">
            <div>
              <h2 className="panel-title">{t("dashboard.getStarted.title")}</h2>
              <div className="panel-subtitle">{t("dashboard.getStarted.subtitle")}</div>
            </div>
          </div>
          <div className="panel-body">
            <div className="quick-start">
              <Link href="/counterparties/new">
                <strong>{t("dashboard.getStarted.step1Title")}</strong>
                <span>{t("dashboard.getStarted.step1Description")}</span>
              </Link>
              <Link href="/import">
                <strong>{t("dashboard.getStarted.step2Title")}</strong>
                <span>{t("dashboard.getStarted.step2Description")}</span>
              </Link>
              <Link href="/vouchers/new">
                <strong>{t("dashboard.getStarted.step3Title")}</strong>
                <span>{t("dashboard.getStarted.step3Description")}</span>
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <div className="section-grid">
        <section className="panel" id="action-center">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">{t("dashboard.actionCenter.title")}</h2>
              <div className="panel-subtitle">{t("dashboard.actionCenter.subtitle")}</div>
            </div>
            <Link href="/recovery-cases" className="panel-link">{t("dashboard.actionCenter.viewAll")}</Link>
          </div>
          {actionableCases.length === 0 ? (
            <div className="empty-state">{t("dashboard.actionCenter.empty")}</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("dashboard.actionCenter.table.case")}</th>
                    <th>{t("dashboard.actionCenter.table.counterparty")}</th>
                    <th>{t("dashboard.actionCenter.table.dueDate")}</th>
                    <th>{t("dashboard.actionCenter.table.priority")}</th>
                    <th>{t("dashboard.actionCenter.table.status")}</th>
                    <th>{t("dashboard.actionCenter.table.exposure")}</th>
                  </tr>
                </thead>
                <tbody>
                  {actionableCases.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <Link href={"/recovery-cases/" + item.id}>
                          <div className="row-title">{item.reference}</div>
                          <div className="row-subtitle">
                            {item.palletTypeCode} · {formatNumber(item.outstandingPallets)} {t("dashboard.actionCenter.palletsSuffix")}
                          </div>
                        </Link>
                      </td>
                      <td>{item.counterpartyName}</td>
                      <td>{formatDate(item.dueDate)}</td>
                      <td><PriorityBadge priority={item.priority} t={t} /></td>
                      <td><StatusBadge status={item.status} t={t} /></td>
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
              <h2 className="panel-title">{t("dashboard.operationalHealth.title")}</h2>
              <div className="panel-subtitle">{t("dashboard.operationalHealth.subtitle")}</div>
            </div>
          </div>
          <div className="panel-body">
            <div className="recovery-gauge-wrap" style={{ marginBottom: 18 }}>
              <div className="recovery-gauge">
                <strong>{insights.recoveryRate}%</strong>
              </div>
              <div>
                <div className="row-title">{t("dashboard.recoveryRate")}</div>
                <div className="row-subtitle">
                  {formatNumber(insights.openCases)} {t("dashboard.operationalHealth.openCasesSuffix")}
                </div>
              </div>
            </div>

            <div className="health-grid">
              <div className="health-tile">
                <div className="health-value">{formatNumber(kpis.casesDueSoon)}</div>
                <div className="health-label">{t("dashboard.operationalHealth.casesDueWithin7Days")}</div>
              </div>
              <div className="health-tile">
                <div className="health-value">{formatNumber(kpis.overdueCases)}</div>
                <div className="health-label">{t("dashboard.operationalHealth.overdueCasesLabel")}</div>
              </div>
              <div className="health-tile">
                <div className="health-value">{formatNumber(insights.voucherDueSoon)}</div>
                <div className="health-label">{t("dashboard.operationalHealth.vouchersDueWithin7Days")}</div>
              </div>
              <div className="health-tile">
                <div className="health-value">{formatNumber(insights.voucherOverdue)}</div>
                <div className="health-label">{t("dashboard.operationalHealth.overdueVouchers")}</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="section-grid equal">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">{t("dashboard.ageing.title")}</h2>
              <div className="panel-subtitle">{t("dashboard.ageing.subtitle")}</div>
            </div>
            <Link href="/report" className="panel-link">{t("dashboard.ageing.openReport")}</Link>
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
              <h2 className="panel-title">{t("dashboard.topExposure.title")}</h2>
              <div className="panel-subtitle">{t("dashboard.topExposure.subtitle")}</div>
            </div>
            <Link href="/counterparties" className="panel-link">{t("dashboard.topExposure.viewLink")}</Link>
          </div>
          <div className="panel-body">
            {topCounterparties.length === 0 ? (
              <div className="empty-state" style={{ padding: "20px 0" }}>{t("dashboard.topExposure.empty")}</div>
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
