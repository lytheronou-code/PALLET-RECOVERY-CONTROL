import Link from "next/link";
import { CalendarDays, CircleDollarSign, PackageCheck, Ticket } from "lucide-react";
import { getPortalContext, getPortalSummary } from "@/lib/data/portal";
import { getPageContext } from "@/i18n/server";

export default async function PortalOverviewPage() {
  const [context, summary] = await Promise.all([getPortalContext(), getPortalSummary()]);
  const { t, formatCurrency, formatDate, formatNumber } = await getPageContext(context?.organizationId);

  return (
    <div>
      <div className="grid premium-kpis">
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-caption">{t("clientPortal.overview.kpis.outstandingPallets.label")}</span>
            <span className="metric-icon"><PackageCheck size={17} /></span>
          </div>
          <div className="metric-value">{formatNumber(summary.outstandingPallets)}</div>
          <div className="metric-foot">{t("clientPortal.overview.kpis.outstandingPallets.foot")}</div>
        </div>
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-caption">{t("clientPortal.overview.kpis.estimatedExposure.label")}</span>
            <span className="metric-icon danger"><CircleDollarSign size={17} /></span>
          </div>
          <div className="metric-value">{formatCurrency(summary.estimatedExposure)}</div>
          <div className="metric-foot">{t("clientPortal.overview.kpis.estimatedExposure.foot")}</div>
        </div>
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-caption">{t("clientPortal.overview.kpis.openVouchers.label")}</span>
            <span className="metric-icon"><Ticket size={17} /></span>
          </div>
          <div className="metric-value">{formatNumber(summary.openVouchersCount)}</div>
          <div className="metric-foot">{t("clientPortal.overview.kpis.openVouchers.foot")}</div>
        </div>
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-caption">{t("clientPortal.overview.kpis.activeRecoveryCases.label")}</span>
          </div>
          <div className="metric-value">{formatNumber(summary.activeRecoveryCasesCount)}</div>
          <div className="metric-foot">{t("clientPortal.overview.kpis.activeRecoveryCases.foot")}</div>
        </div>
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-caption">{t("clientPortal.overview.kpis.recoveredPallets.label")}</span>
          </div>
          <div className="metric-value">{formatNumber(summary.recoveredPallets)}</div>
          <div className="metric-foot">{t("clientPortal.overview.kpis.recoveredPallets.foot")}</div>
        </div>
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-caption">{t("clientPortal.overview.kpis.recoveredValue.label")}</span>
          </div>
          <div className="metric-value">{formatCurrency(summary.recoveredValue)}</div>
          <div className="metric-foot">{t("clientPortal.overview.kpis.recoveredValue.foot")}</div>
        </div>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">{t("clientPortal.overview.nextDue.title")}</h2>
            <div className="panel-subtitle">{t("clientPortal.overview.nextDue.subtitle")}</div>
          </div>
          <CalendarDays size={16} color="var(--muted)" />
        </div>
        <div className="panel-body">
          {summary.nextDueDate ? (
            <p style={{ margin: 0 }}>{formatDate(summary.nextDueDate)}</p>
          ) : (
            <div className="empty-state">{t("clientPortal.overview.nextDue.empty")}</div>
          )}
          <p className="muted" style={{ fontSize: 12, marginTop: 12, marginBottom: 0 }}>
            {t("clientPortal.overview.nextDue.detailsPrefix")}{" "}
            <Link href="/portal/recovery-cases">{t("clientPortal.overview.nextDue.detailsLinkText")}</Link>{" "}
            {t("clientPortal.overview.nextDue.detailsSuffix")}
          </p>
        </div>
      </section>
    </div>
  );
}
