import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, Mail, MapPin, Pencil, Phone, Plus } from "lucide-react";
import { requireMembership } from "@/lib/data/organization";
import { getCounterpartyOverview } from "@/lib/data/counterparties";
import { getPageContext } from "@/i18n/server";
import type { TranslationKey } from "@/i18n/translator";
import { PriorityBadge, StatusBadge, VoucherStatusBadge } from "@/components/status-badge";
import { DocumentsPanel } from "@/components/documents-panel";
import { ClientPortalAccessPanel } from "@/components/client-portal-access-panel";
import { listClientPortalMemberships } from "@/lib/data/client-portal-admin";

// DB enum -> translation-key dictionary (never an if/else per locale); see
// counterparties/page.tsx for the same pattern on the list page.
const TYPE_LABEL_KEYS = {
  customer: "counterparties.types.customer",
  debtor: "counterparties.types.debtor",
  retailer: "counterparties.types.retailer",
  carrier: "counterparties.types.carrier",
  supplier: "counterparties.types.supplier",
  other: "counterparties.types.other",
} as const satisfies Record<string, TranslationKey>;

export default async function CounterpartyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const membership = await requireMembership();
  const { t, locale, currency, timeZone, formatCurrency, formatDate, formatNumber } = await getPageContext(
    membership.organizationId,
  );
  const { id } = await params;
  const overview = await getCounterpartyOverview(membership.organizationId, id);

  if (!overview) notFound();

  const portalMembers = await listClientPortalMemberships(membership.organizationId, id);

  const cp = overview.counterparty;
  const address = [cp.address_line, cp.postal_code, cp.city, cp.province].filter(Boolean).join(", ");
  const typeKey = TYPE_LABEL_KEYS[cp.counterparty_type as keyof typeof TYPE_LABEL_KEYS];

  return (
    <div className="shell">
      <div className="header">
        <div className="page-heading">
          <div className="eyebrow">{typeKey ? t(typeKey) : cp.counterparty_type}</div>
          <h1 className="page-title">{cp.legal_name}</h1>
          <div className="page-subtitle">
            {t("counterparties.detail.subtitle")}
          </div>
        </div>
        <div className="header-actions">
          <Link href={"/counterparties/" + cp.id + "/edit"} className="btn btn-secondary">
            <Pencil size={14} />
            {t("common.actions.edit")}
          </Link>
          <Link
            href={"/recovery-cases/new?counterpartyId=" + cp.id}
            className="btn btn-primary"
          >
            {t("dashboard.newCase")}
          </Link>
        </div>
      </div>

      <div className="grid premium-kpis">
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">{t("dashboard.openExposureLabel")}</span></div>
          <div className="metric-value">{formatCurrency(overview.openExposure)}</div>
          <div className="metric-foot">{t("counterparties.detail.openExposureFoot")}</div>
        </div>
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">{t("counterparties.detail.openCases")}</span></div>
          <div className="metric-value">{formatNumber(overview.openCases)}</div>
          <div className="metric-foot">{t("counterparties.detail.openCasesFoot")}</div>
        </div>
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">{t("counterparties.detail.activeVouchers")}</span></div>
          <div className="metric-value">{formatNumber(overview.openVouchers)}</div>
          <div className="metric-foot">{t("counterparties.detail.activeVouchersFoot")}</div>
        </div>
        <div className="metric-card">
          <div className="metric-top"><span className="metric-caption">{t("dashboard.kpis.recoveredPallets")}</span></div>
          <div className="metric-value">{formatNumber(overview.recoveredPallets)}</div>
          <div className="metric-foot">{t("counterparties.detail.recoveredPalletsFoot")}</div>
        </div>
      </div>

      <div className="detail-grid" style={{ marginBottom: 16 }}>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">{t("counterparties.detail.recentCases.title")}</h2>
              <div className="panel-subtitle">{t("counterparties.detail.recentCases.subtitle")}</div>
            </div>
          </div>
          {overview.cases.length === 0 ? (
            <div className="empty-state">{t("counterparties.detail.recentCases.empty")}</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("dashboard.actionCenter.table.case")}</th>
                    <th>{t("counterparties.detail.recentCases.table.pallet")}</th>
                    <th>{t("counterparties.detail.recentCases.table.outstanding")}</th>
                    <th>{t("counterparties.detail.recentCases.table.value")}</th>
                    <th>{t("dashboard.actionCenter.table.dueDate")}</th>
                    <th>{t("dashboard.actionCenter.table.priority")}</th>
                    <th>{t("dashboard.actionCenter.table.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.cases.map((item) => (
                    <tr key={item.id}>
                      <td><Link className="row-title" href={"/recovery-cases/" + item.id}>{item.reference}</Link></td>
                      <td>{item.palletTypeCode}</td>
                      <td className="numeric">{formatNumber(item.outstandingQuantity)}</td>
                      <td className="numeric">{formatCurrency(item.outstandingValue)}</td>
                      <td>{formatDate(item.dueDate)}</td>
                      <td><PriorityBadge priority={item.priority} t={t} /></td>
                      <td><StatusBadge status={item.status} t={t} /></td>
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
              <h2 className="panel-title">{t("counterparties.detail.profile.title")}</h2>
              <div className="panel-subtitle">{cp.code ?? t("counterparties.detail.profile.noInternalCode")}</div>
            </div>
            <Building2 size={16} color="var(--muted)" />
          </div>
          <div className="panel-body">
            <dl className="definition-list">
              <dt>{t("counterparties.fields.vatId")}</dt><dd>{cp.vat_number ?? "—"}</dd>
              <dt>{t("counterparties.table.status")}</dt><dd>{cp.active ? t("counterparties.active") : t("counterparties.inactive")}</dd>
              <dt><MapPin size={13} /></dt><dd>{address || "—"}</dd>
              <dt><Mail size={13} /></dt><dd>{cp.email ?? "—"}</dd>
              <dt><Phone size={13} /></dt><dd>{cp.phone ?? "—"}</dd>
            </dl>
          </div>
        </aside>
      </div>

      <div className="section-grid equal" style={{ marginBottom: 16 }}>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">{t("counterparties.detail.sites.title")}</h2>
              <div className="panel-subtitle">{t("counterparties.detail.sites.subtitle")}</div>
            </div>
            <Link href={"/sites/new?counterpartyId=" + cp.id} className="btn btn-secondary btn-sm">
              <Plus size={14} />
              {t("sites.new")}
            </Link>
          </div>
          {overview.sites.length === 0 ? (
            <div className="empty-state">{t("counterparties.detail.sites.empty")}</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>{t("sites.table.name")}</th><th>{t("counterparties.fields.city")}</th><th>{t("sites.table.status")}</th></tr>
                </thead>
                <tbody>
                  {overview.sites.map((site) => (
                    <tr key={site.id}>
                      <td><Link className="row-title" href={"/sites/" + site.id + "/edit"}>{site.name}</Link></td>
                      <td>{site.city ?? "—"}</td>
                      <td>
                        <span className={"badge " + (site.active ? "badge-closed" : "badge-neutral")}>
                          {site.active ? t("sites.active") : t("sites.inactive")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <div className="section-grid equal">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">{t("counterparties.detail.vouchers.title")}</h2>
              <div className="panel-subtitle">{t("counterparties.detail.vouchers.subtitle")}</div>
            </div>
            <Link href="/vouchers" className="panel-link">{t("counterparties.detail.vouchers.openLink")}</Link>
          </div>
          {overview.vouchers.length === 0 ? (
            <div className="empty-state">{t("counterparties.detail.vouchers.empty")}</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("movements.table.voucher")}</th>
                    <th>{t("counterparties.detail.recentCases.table.pallet")}</th>
                    <th>{t("counterparties.detail.recentCases.table.outstanding")}</th>
                    <th>{t("dashboard.actionCenter.table.dueDate")}</th>
                    <th>{t("counterparties.table.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.vouchers.map((item) => (
                    <tr key={item.id}>
                      <td className="row-title">{item.voucherNumber}</td>
                      <td>{item.palletTypeCode}</td>
                      <td className="numeric">{formatNumber(Math.max(0, item.quantity - item.recoveredQuantity))}</td>
                      <td>{formatDate(item.recoveryDueDate)}</td>
                      <td><VoucherStatusBadge status={item.status} t={t} /></td>
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
              <h2 className="panel-title">{t("counterparties.detail.movements.title")}</h2>
              <div className="panel-subtitle">{t("counterparties.detail.movements.subtitle")}</div>
            </div>
          </div>
          {overview.movements.length === 0 ? (
            <div className="empty-state">{t("counterparties.detail.movements.empty")}</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("movements.table.date")}</th>
                    <th>{t("movements.table.flow")}</th>
                    <th>{t("counterparties.detail.recentCases.table.pallet")}</th>
                    <th>{t("movements.table.quantity")}</th>
                    <th>{t("movements.table.document")}</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.movements.map((item) => (
                    <tr key={item.id}>
                      <td>{formatDate(item.movementDate)}</td>
                      <td><span className={"badge " + (item.direction === "outbound" ? "badge-open" : "badge-closed")}>{item.direction === "outbound" ? "OUT" : "IN"}</span></td>
                      <td>{item.palletTypeCode}</td>
                      <td className="numeric">{formatNumber(item.quantity)}</td>
                      <td>{item.documentNumber ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <div style={{ marginTop: 16 }}>
        <DocumentsPanel
          link={{
            counterpartyId: cp.id,
            entity: "counterparty",
            entityId: cp.id,
          }}
          title={t("counterparties.detail.documentsTitle")}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <ClientPortalAccessPanel
          counterpartyId={cp.id}
          members={portalMembers}
          isAdmin={membership.role === "admin"}
          locale={locale}
          currency={currency}
          timeZone={timeZone}
        />
      </div>
    </div>
  );
}
